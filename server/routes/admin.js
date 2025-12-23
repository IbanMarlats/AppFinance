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
        SELECT role, is_premium, last_login, newsletter, subscription_plan, trial_until, subscription_started_at, created_at, is_gift FROM users
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const totalUsers = rows.length;
        const now = new Date();

        // Trial Users: Anyone with an active trial date (whether manual 'trial' plan OR Stripe 'monthly' with trial)
        const trialUsers = rows.filter(r => {
            if (!r.trial_until) return false;
            return new Date(r.trial_until) > now;
        }).length;

        // Premium Users: Active is_premium BUT NOT currently in trial
        const premiumUsers = rows.filter(r => {
            if (r.is_premium !== 1) return false;
            // Exclude if in trial
            if (r.trial_until && new Date(r.trial_until) > now) return false;
            return true;
        }).length;

        const newsletterUsers = rows.filter(r => r.newsletter === 1).length;

        // Subscription Breakdowns (Exclude Trials from these counts to match 'premiumUsers')
        const isPaidPremium = (r) => r.is_premium === 1 && (!r.trial_until || new Date(r.trial_until) <= now);

        const premiumMonthly = rows.filter(r => isPaidPremium(r) && r.subscription_plan === 'monthly' && !r.is_gift).length;
        const premiumAnnual = rows.filter(r => isPaidPremium(r) && r.subscription_plan === 'annual' && !r.is_gift).length;
        const premiumLifetime = rows.filter(r => isPaidPremium(r) && r.subscription_plan === 'lifetime' && !r.is_gift).length;

        // This 'premiumTrial' variable is now redundant or can mean 'Manual Trial plan' specifically? 
        // Let's keep it as specific 'trial' plan count if needed, or just remove.
        // Actually, let's keep it as 'Manual Trial Plan' count for debug/legacy.
        const premiumTrial = rows.filter(r => r.subscription_plan === 'trial' && new Date(r.trial_until) > now).length;

        // Gift Breakdown
        const premiumGiftTotal = rows.filter(r => r.is_premium === 1 && r.is_gift).length;

        const giftMonthly = rows.filter(r => r.is_premium === 1 && r.is_gift && r.subscription_plan === 'monthly').length;
        const giftAnnual = rows.filter(r => r.is_premium === 1 && r.is_gift && r.subscription_plan === 'annual').length;
        const giftLifetime = rows.filter(r => r.is_premium === 1 && r.is_gift && r.subscription_plan === 'lifetime').length;

        // Trial Analytics - Global
        // Converted: Had a trial (trial_until exists and is past) AND is currently Premium (paid)
        const trialConverted = rows.filter(r => {
            return r.trial_until && new Date(r.trial_until) < now && r.is_premium === 1 && isPaidPremium(r);
        }).length;

        // Churn: Had a trial (trial_until exists and is past) AND is NOT premium
        const trialChurn = rows.filter(r => {
            return r.trial_until && new Date(r.trial_until) < now && r.is_premium === 0;
        }).length;

        // Trial Analytics - Monthly Evolution (Last 12 Months)
        const trialMonthlyStats = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = date.toISOString().slice(0, 7); // YYYY-MM

            // Users whose trial ended in this month
            const trialsEndedInMonth = rows.filter(r => {
                if (!r.trial_until) return false;
                const trialEnd = new Date(r.trial_until);
                return trialEnd.toISOString().slice(0, 7) === monthKey && trialEnd < now;
            });

            const count = trialsEndedInMonth.length;
            const converted = trialsEndedInMonth.filter(r => r.is_premium === 1 && r.subscription_plan !== 'trial').length;
            const churn = trialsEndedInMonth.filter(r => r.is_premium === 0).length;

            if (count > 0 || i < 6) {
                trialMonthlyStats.push({ month: monthKey, count, converted, churn });
            }
        }

        // Revenue Projection (MRR) - Current
        // Monthly: 8.90€ / month
        // Annual: 70.80€ / year => 5.90€ / month
        // Strictly exclude gifts (row.is_gift)
        const monthlyRevenue = premiumMonthly * 8.90;
        const annualRevenue = premiumAnnual * (70.80 / 12);
        const projectedMRR = monthlyRevenue + annualRevenue;

        // MRR Evolution (Last 12 Months)
        const mrrHistory = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = date.toISOString().slice(0, 7);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            // Estimate active paid users at that time
            const activeInMonth = rows.filter(r => {
                // Must be premium
                if (r.is_premium !== 1) return false;
                // Exclude gifts
                if (r.is_gift) return false;
                // Only Monthly/Annual plans count for MRR here
                if (r.subscription_plan !== 'monthly' && r.subscription_plan !== 'annual') return false;

                // Determine effective revenue start date
                let effectiveStartDate = new Date(r.subscription_started_at || r.created_at);

                // If user has a trial, revenue starts AFTER trial
                if (r.trial_until) {
                    const trialEnd = new Date(r.trial_until);
                    // If trial ends in the future relative to this month, they are not paying yet
                    // If trial ended in the past, revenue started at trialEnd
                    if (trialEnd > effectiveStartDate) {
                        effectiveStartDate = trialEnd;
                    }
                }

                // User contributes to MRR if their paying period started on or before the end of this month
                return effectiveStartDate <= monthEnd;
            });

            let mrr = 0;
            activeInMonth.forEach(u => {
                if (u.subscription_plan === 'monthly') mrr += 8.90;
                if (u.subscription_plan === 'annual') mrr += (70.80 / 12);
            });

            mrrHistory.push({ month: monthKey, value: mrr });
        }

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

        // Get unique visitors count
        db.get("SELECT COUNT(DISTINCT visitor_id) as uniqueVisitors FROM site_visits", [], (err, visitRow) => {
            const uniqueVisitors = (visitRow && visitRow.uniqueVisitors) || 0;

            res.json({
                totalUsers,
                premiumUsers,
                premiumMonthly,
                premiumAnnual,
                premiumLifetime,
                premiumTrial,
                premiumGift: premiumGiftTotal, // Total gifts
                giftBreakdown: { monthly: giftMonthly, annual: giftAnnual, lifetime: giftLifetime }, // Detailed gifts
                trialUsers,
                trialConverted,
                trialChurn,
                trialMonthlyStats,
                projectedMRR,
                mrrHistory,
                activeUsers,
                activePremiumUsers,
                newsletterUsers,
                usersByRole,
                uniqueVisitors
            });
        });
    });
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
        SELECT id, email_encrypted, role, is_premium, last_login, created_at, is_verified, trial_until, subscription_plan
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
    db.get("SELECT trial_until, subscription_started_at FROM users WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });

        let is_premium = 0;
        let subscription_plan = null;
        let premium_until = null;
        let trial_until = row.trial_until; // Preserve trial history by default
        let subscription_started_at = row.subscription_started_at;
        let is_gift = 0; // Default off

        const now = new Date();

        switch (type) {
            case 'lifetime':
                is_premium = 1;
                subscription_plan = 'lifetime';
                if (!subscription_started_at) subscription_started_at = now.toISOString();
                break;
            case 'annual':
                is_premium = 1;
                subscription_plan = 'annual';
                now.setFullYear(now.getFullYear() + 1);
                premium_until = now.toISOString();
                if (!subscription_started_at) subscription_started_at = new Date().toISOString();
                break;
            case 'monthly':
                is_premium = 1;
                subscription_plan = 'monthly';
                now.setMonth(now.getMonth() + 1);
                premium_until = now.toISOString();
                if (!subscription_started_at) subscription_started_at = new Date().toISOString();
                break;
            case 'trial':
                is_premium = 1;
                subscription_plan = 'trial';
                now.setDate(now.getDate() + 14);
                premium_until = now.toISOString();
                trial_until = now.toISOString(); // Set new trial end date
                is_gift = 0; // Trial is not a 'gift' in the sense of a granted plan
                break;

            // Gift Types (Granular)
            case 'gift_lifetime':
                is_premium = 1;
                subscription_plan = 'lifetime';
                is_gift = 1;
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
                subscription_plan = 'lifetime'; // Default to lifetime if generic
                is_gift = 1;
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
                    from: process.env.SMTP_FROM || '"Finance App" <noreply@financeapp.local>',
                    to: email,
                    subject: subject,
                    html: `<div style="font-family: sans-serif; padding: 20px; color: #334155;">
                        <h2 style="color: #0f172a; margin-bottom: 24px;">${subject}</h2>
                        <div style="line-height: 1.6;">
                            ${finalMessage}
                        </div>
                        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;"/>
                        <p style="font-size: 0.8em; color: #94a3b8; text-align: center;">
                            Vous recevez cet email car vous êtes inscrit à notre newsletter via l'application Finance.
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
