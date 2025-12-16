import express from 'express';
import db from '../db.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { decrypt, hashEmail } from '../utils/crypto.js';
import { getTransporter } from '../utils/email.js';
import { logEvent } from '../utils/logger.js';

const router = express.Router();

// Middleware for all admin routes
router.use(authenticateToken);
router.use(isAdmin);

// Admin Stats
router.get('/stats', (req, res) => {
    // Re-doing the query for simplicity and accuracy
    const query = `
        SELECT role, is_premium, last_login, newsletter FROM users
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const totalUsers = rows.length;
        const premiumUsers = rows.filter(r => r.is_premium === 1).length;
        const newsletterUsers = rows.filter(r => r.newsletter === 1).length;

        // Active Users (Logged in within 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        let activeUsers = 0;
        let activePremiumUsers = 0;

        rows.forEach(row => {
            if (row.last_login) {
                const loginDate = new Date(row.last_login);
                if (loginDate >= threeMonthsAgo) {
                    activeUsers++;
                    if (row.is_premium === 1) activePremiumUsers++;
                }
            }
        });

        const usersByRole = rows.reduce((acc, row) => {
            acc[row.role] = (acc[row.role] || 0) + 1;
            return acc;
        }, {});

        res.json({ totalUsers, premiumUsers, activeUsers, activePremiumUsers, newsletterUsers, usersByRole });
    });
});

// Admin Search
router.post('/search', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const emailHash = hashEmail(email);
    db.get("SELECT id, email_encrypted, role, is_premium, last_login, created_at, is_verified, newsletter FROM users WHERE email_hash = ?", [emailHash], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        res.json({
            id: row.id,
            email: email,
            role: row.role,
            is_premium: !!row.is_premium,
            last_login: row.last_login,
            created_at: row.created_at,
            is_verified: !!row.is_verified,
            newsletter: !!row.newsletter
        });
    });
});

// User Premium Status
router.put('/user/:id/premium', (req, res) => {
    const { id } = req.params;
    const { is_premium } = req.body; // Expect boolean

    db.run("UPDATE users SET is_premium = ? WHERE id = ?", [is_premium ? 1 : 0, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });

        res.json({ message: 'Premium status updated', is_premium: !!is_premium });
    });
});

// Update Settings (Global)
router.put('/settings', async (req, res) => {
    const settings = req.body;
    try {
        const promises = Object.entries(settings).map(([key, value]) => {
            return new Promise((resolve, reject) => {
                db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
        await Promise.all(promises);

        // Log the change
        logEvent('SETTINGS_UPDATE', `Admin updated global settings: ${Object.keys(settings).join(', ')}`, req.user.id, req);

        res.json({ message: "Settings updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Audit Logs
router.get('/logs', (req, res) => {
    db.all("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Newsletter Send
router.post('/newsletter/send', (req, res) => {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: "Subject and message required" });

    db.all("SELECT email_encrypted FROM users WHERE newsletter = 1", [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows.length === 0) return res.json({ message: "No subscribers found", count: 0 });

        let sentCount = 0;
        let errorCount = 0;
        const transporter = getTransporter();

        console.log(`Sending newsletter to ${rows.length} users...`);

        const emailPromises = rows.map(async (row) => {
            try {
                const email = decrypt(row.email_encrypted);
                const mailOptions = {
                    from: process.env.SMTP_FROM || '"Finance App" <noreply@financeapp.local>',
                    to: email,
                    subject: subject,
                    html: `<div style="font-family: sans-serif; padding: 20px;">
                        <h2>${subject}</h2>
                        <p style="white-space: pre-wrap;">${message}</p>
                        <hr/>
                        <p style="font-size: 0.8em; color: gray;">Vous recevez cet email car vous êtes inscrit à notre newsletter via l'application Finance.</p>
                    </div>`
                };

                // Check if transporter exists (might be null if dev mode failed)
                if (transporter) {
                    await transporter.sendMail(mailOptions);
                    sentCount++;
                } else {
                    // Dev mode logging
                    console.log(`[Mock Email] To: ${email} | Subject: ${subject}`);
                    sentCount++;
                }

            } catch (e) {
                console.error("Error sending to user:", e);
                errorCount++;
            }
        });

        await Promise.all(emailPromises);

        // Log the batch event
        const logDescription = `Newsletter "${subject}" process complete. Sent: ${sentCount}, Errors: ${errorCount}`;
        logEvent('EMAIL_BATCH_SENT', logDescription, req.user.id, req);

        res.json({ message: "Newsletter processing complete", sent: sentCount, errors: errorCount });
    });
});

export default router;
