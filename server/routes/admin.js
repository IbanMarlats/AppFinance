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
router.get('/stats', async (req, res) => {
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all("SELECT role, is_premium, last_login, newsletter, subscription_plan, trial_until, subscription_started_at, created_at, is_gift FROM users", (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        const totalUsers = rows.length;
        const now = new Date();

        // Trial Users
        const trialUsers = rows.filter(r => r.trial_until && new Date(r.trial_until) > now).length;

        // Premium Users
        const isPaidPremium = (r) => r.is_premium === 1 && (!r.trial_until || new Date(r.trial_until) <= now);
        const premiumUsers = rows.filter(r => r.is_premium === 1 && (!r.trial_until || new Date(r.trial_until) <= now)).length;

        const newsletterUsers = rows.filter(r => r.newsletter === 1).length;

        // Subscriptions
        const premiumMonthly = rows.filter(r => isPaidPremium(r) && r.subscription_plan === 'monthly' && !r.is_gift).length;
        const premiumAnnual = rows.filter(r => isPaidPremium(r) && r.subscription_plan === 'annual' && !r.is_gift).length;
        const premiumLifetime = rows.filter(r => isPaidPremium(r) && r.subscription_plan === 'lifetime' && !r.is_gift).length;
        const premiumTrial = rows.filter(r => r.subscription_plan === 'trial' && new Date(r.trial_until) > now).length;

        // Gifts
        const giftMonthly = rows.filter(r => r.is_premium === 1 && r.is_gift && r.subscription_plan === 'monthly').length;
        const giftAnnual = rows.filter(r => r.is_premium === 1 && r.is_gift && r.subscription_plan === 'annual').length;
        const giftLifetime = rows.filter(r => r.is_premium === 1 && r.is_gift && r.subscription_plan === 'lifetime').length;
        const premiumGiftTotal = rows.filter(r => r.is_premium === 1 && r.is_gift).length;

        // Analytics (simplified for stability)
        const trialConverted = rows.filter(r => r.trial_until && new Date(r.trial_until) < now && isPaidPremium(r)).length;
        const trialChurn = rows.filter(r => r.trial_until && new Date(r.trial_until) < now && r.is_premium === 0).length;

        // MRR
        const monthlyRevenue = premiumMonthly * 8.90;
        const annualRevenue = premiumAnnual * (70.80 / 12);
        const projectedMRR = monthlyRevenue + annualRevenue;

        // Visitors
        const visitData = await new Promise((resolve) => {
            db.get("SELECT COUNT(DISTINCT visitor_id) as uniqueVisitors FROM site_visits", (err, row) => resolve(row));
        });
        const uniqueVisitors = visitData?.uniqueVisitors || 0;

        // History and Roles (Minimal for now)
        const usersByRole = rows.reduce((acc, row) => {
            acc[row.role] = (acc[row.role] || 0) + 1;
            return acc;
        }, {});

        res.json({
            totalUsers,
            premiumUsers,
            premiumMonthly,
            premiumAnnual,
            premiumLifetime,
            premiumTrial,
            premiumGift: premiumGiftTotal,
            giftBreakdown: { monthly: giftMonthly, annual: giftAnnual, lifetime: giftLifetime },
            trialUsers,
            trialConverted,
            trialChurn,
            projectedMRR,
            newsletterUsers,
            usersByRole,
            uniqueVisitors,
            // Mock empty history for now to avoid logic weight
            trialMonthlyStats: [],
            mrrHistory: [],
            activeUsers: totalUsers,
            activePremiumUsers: premiumUsers
        });

    } catch (err) {
        console.error("Admin Stats Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Admin User List (Replaces simple search)
router.post('/users', (req, res) => {
    let { page = 1, limit = 10, search = '', filter = 'all', sort = 'newest' } = req.body;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params = [];

    if (search) {
        // We can't search by email directly because it's encrypted.
        // Option 1: Search by hash (exact match only).
        // Option 2: Search by ID or Role.
        // For partial email search, we're stuck unless we store a partial hash or searchable plain text (bad for privacy).
        // Given existing design: Search by exact email (handled by hash) OR generic search on other fields?
        // Let's assume search input is an email address, verify if it's hashable.
        // For broad search, maybe client sends specific queries.
        // Let's support searching by EXACT email via hash.
        const searchHash = hashEmail(search);
        whereClause += " AND (email_hash = ? OR role LIKE ? OR id LIKE ?)";
        params.push(searchHash, `%${search}%`, `%${search}%`);
    }

    if (filter === 'premium') {
        whereClause += " AND is_premium = 1";
    } else if (filter === 'trial') {
        const nowStr = new Date().toISOString();
        whereClause += ` AND trial_until > '${nowStr}'`;
    } else if (filter === 'standard') {
        whereClause += " AND is_premium = 0";
    }

    let orderBy = "created_at DESC";
    if (sort === 'oldest') orderBy = "created_at ASC";
    if (sort === 'premium') orderBy = "is_premium DESC, created_at DESC";
    if (sort === 'login') orderBy = "last_login DESC";

    const sql = `
        SELECT id, email_encrypted, role, is_premium, last_login, created_at, is_verified, trial_until, subscription_plan, premium_until, is_gift
        FROM users
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
    `;

    db.all(sql, [...params, limit, offset], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Decrypt emails for admin view
        const users = rows.map(u => ({
            ...u,
            email: decrypt(u.email_encrypted),
            email_encrypted: undefined // hide encrypted
        }));

        // Get total count for pagination
        db.get(`SELECT COUNT(*) as count FROM users ${whereClause}`, params, (err, countRow) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                users,
                total: countRow.count,
                pages: Math.ceil(countRow.count / limit),
                currentPage: page
            });
        });
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

// User Subscription Management
router.put('/user/:id/subscription', (req, res) => {
    const { id } = req.params;
    const { type } = req.body;
    // Types: 'lifetime', 'annual', 'monthly', 'trial'
    // Gift Types: 'gift_lifetime', 'gift_annual', 'gift_monthly'
    // Cancel: 'none'

    // Fetch existing data to preserve data if needed
    db.get("SELECT is_premium, is_gift, subscription_plan, premium_until, trial_until, subscription_started_at FROM users WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });

        let is_premium = row.is_premium; // Preserve current status as fallback
        let subscription_plan = row.subscription_plan;
        let premium_until = row.premium_until;
        let trial_until = row.trial_until; // Preserve trial history by default
        let subscription_started_at = row.subscription_started_at;
        let is_gift = row.is_gift || 0; // Preserve gift status by default

        const now = new Date();

        switch (type) {
            case 'lifetime':
                is_premium = 1;
                subscription_plan = 'lifetime';
                is_gift = 1; // Protect manual grants
                premium_until = '2036-01-01T00:00:00.000Z';
                if (!subscription_started_at) subscription_started_at = now.toISOString();
                break;
            case 'annual':
                is_premium = 1;
                subscription_plan = 'annual';
                is_gift = 1; // All manual grants are now gifts for protection
                now.setFullYear(now.getFullYear() + 1);
                premium_until = now.toISOString();
                if (!subscription_started_at) subscription_started_at = new Date().toISOString();
                break;
            case 'monthly':
                is_premium = 1;
                subscription_plan = 'monthly';
                is_gift = 1; // All manual grants are now gifts for protection
                now.setMonth(now.getMonth() + 1);
                premium_until = now.toISOString();
                if (!subscription_started_at) subscription_started_at = new Date().toISOString();
                break;
            case 'trial':
                is_premium = 1;
                subscription_plan = 'trial';
                now.setDate(now.getDate() + 14);
                premium_until = now.toISOString();
                trial_until = now.toISOString(); 
                is_gift = 0; 
                break;

            // Gift Types (Granular)
            case 'gift_lifetime':
                is_premium = 1;
                subscription_plan = 'lifetime';
                is_gift = 1;
                premium_until = '2036-01-01T00:00:00.000Z'; 
                if (!subscription_started_at) subscription_started_at = now.toISOString();
                break;
            case 'gift_annual':
                is_premium = 1;
                subscription_plan = 'annual';
                is_gift = 1;
                now.setFullYear(now.getFullYear() + 1);
                premium_until = now.toISOString();
                if (!subscription_started_at) subscription_started_at = new Date().toISOString();
                break;
            case 'gift_monthly':
                is_premium = 1;
                subscription_plan = 'monthly';
                is_gift = 1;
                now.setMonth(now.getMonth() + 1);
                premium_until = now.toISOString();
                if (!subscription_started_at) subscription_started_at = new Date().toISOString();
                break;

            // Legacy/Generic Gift fallback
            case 'gift':
                is_premium = 1;
                subscription_plan = 'lifetime'; 
                is_gift = 1;
                premium_until = '2036-01-01T00:00:00.000Z';
                if (!subscription_started_at) subscription_started_at = now.toISOString();
                break;

            case 'none':
                is_premium = 0;
                subscription_plan = null;
                premium_until = null;
                is_gift = 0;
                break;
            default:
                return res.status(400).json({ error: 'Invalid subscription type' });
        }

        const sql = `
            UPDATE users 
            SET is_premium = ?, subscription_plan = ?, premium_until = ?, trial_until = ?, subscription_started_at = ?, is_gift = ?
            WHERE id = ?
        `;

        db.run(sql, [is_premium, subscription_plan, premium_until, trial_until, subscription_started_at, is_gift, id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Log the manual change
            const logMsg = `Admin ${req.user.id} updated user ${id} subscription to: ${type} (Plan: ${subscription_plan}, Gift: ${is_gift})`;
            logEvent('ADMIN_SUBSCRIPTION_UPDATE', logMsg, id, req);

            // ALSO Log a specific premium grant for future audit
            if (is_premium === 1) {
                logEvent('PREMIUM_GRANT', `Manual grant: ${type} (Plan: ${subscription_plan}, Until: ${premium_until})`, id, req);
            }

            res.json({
                message: 'Subscription updated',
                user: { is_premium, subscription_plan, premium_until, trial_until, subscription_started_at, is_gift }
            });
        });
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
router.post('/newsletter/send', async (req, res) => {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: "Subject and message required" });

    // Fetches subscribers AND global settings (for signature) in parallel
    const pSubscribers = new Promise((resolve, reject) => {
        db.all("SELECT email_encrypted FROM users WHERE newsletter = 1", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    const pSettings = new Promise((resolve, reject) => {
        db.get("SELECT value FROM settings WHERE key = 'admin_signature'", [], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.value : '');
        });
    });

    try {
        const [rows, signature] = await Promise.all([pSubscribers, pSettings]);

        if (rows.length === 0) return res.json({ message: "No subscribers found", count: 0 });

        // Append signature if distinct and not already present (naive check)
        // If the user already has the signature in the HTML, we avoid duplicating.
        // We look for a significant chunk of the signature string to decide.
        let finalMessage = message;
        if (signature && !message.includes(signature)) {
            finalMessage += `<br><br>--<br>${signature}`;
        }

        let sentCount = 0;
        let errorCount = 0;
        const transporter = getTransporter();

        console.log(`Sending newsletter to ${rows.length} users...`);

        const emailPromises = rows.map(async (row) => {
            try {
                const email = decrypt(row.email_encrypted);
                const mailOptions = {
                    from: process.env.SMTP_FROM || '"Fiskeo" <noreply@fiskeo.fr>',
                    to: email,
                    subject: subject,
                    html: `<div style="font-family: sans-serif; padding: 20px; color: #334155;">
                        <h2 style="color: #0f172a; margin-bottom: 24px;">${subject}</h2>
                        <div style="line-height: 1.6;">
                            ${finalMessage}
                        </div>
                        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;"/>
                        <p style="font-size: 0.8em; color: #94a3b8; text-align: center;">
                            Vous recevez cet email car vous êtes inscrit à notre newsletter via l'application Fiskeo.
                        </p>
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

    } catch (err) {
        console.error("Newsletter global error:", err);
        return res.status(500).json({ error: err.message });
    }
});

export default router;
