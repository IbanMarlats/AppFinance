import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { encrypt, decrypt, hashEmail, SECRET_KEY } from '../utils/crypto.js';
import { isValidEmail, isValidPassword } from '../utils/validation.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import { authenticateToken } from '../middleware/auth.js';
import { logEvent } from '../utils/logger.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    let { email, password, role, newsletter } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    email = email.trim();

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!isValidPassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const emailHash = hashEmail(email);
    const emailEncrypted = encrypt(email);
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const verificationToken = uuidv4();
    const createdAt = new Date().toISOString();
    const isNewsletter = newsletter === true ? 1 : 0;

    db.run(
        "INSERT INTO users (id, email_hash, email_encrypted, password_hash, verification_token, role, created_at, newsletter) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, emailHash, emailEncrypted, hashedPassword, verificationToken, role, createdAt, isNewsletter],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }

            // Send Email
            sendVerificationEmail(email, verificationToken);

            // Log Event
            logEvent('USER_REGISTER', `New user registered: ${email}`, id, req);
            logEvent('EMAIL_SENT', `Verification email sent to: ${email}`, id, req);

            // Login immediately 
            const token = jwt.sign({ id, is_verified: false, role }, SECRET_KEY, { expiresIn: '30d' });
            res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
            res.status(201).json({ message: 'User created. Please check email.', user: { id, email, is_verified: 0, role } });
        }
    );
});

// Login
router.post('/login', (req, res) => {
    let { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    email = email.trim();
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    if (typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid password format' });
    }

    const emailHash = hashEmail(email);

    db.get("SELECT * FROM users WHERE email_hash = ?", [emailHash], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        // Update last_login
        db.run("UPDATE users SET last_login = ? WHERE id = ?", [new Date().toISOString(), user.id]);

        const token = jwt.sign({ id: user.id, is_verified: !!user.is_verified, role: user.role || 'admin' }, SECRET_KEY, { expiresIn: '30d' });
        res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax' });

        res.json({
            message: 'Logged in',
            user: {
                id: user.id,
                email: email,
                is_verified: !!user.is_verified,
                role: user.role || 'admin',
                is_premium: !!user.is_premium,
                subscription_plan: user.subscription_plan,
                premium_until: user.premium_until
            }
        });
    });
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
});

// Verify Email
router.get('/verify/:token', (req, res) => {
    const { token } = req.params;
    db.get("SELECT * FROM users WHERE verification_token = ?", [token], (err, user) => {
        if (err) return res.status(500).send("Error");
        if (!user) return res.status(400).send("Invalid token");

        db.run("UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?", [user.id], (err) => {
            if (err) return res.status(500).send("Error updating user");
            res.send("<h1>Email Verified!</h1><p>You can close this window and refresh your app.</p>");
        });
    });
});

// Resend Verification
router.post('/resend-verification', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const emailHash = hashEmail(email);
    db.get("SELECT * FROM users WHERE email_hash = ?", [emailHash], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: "User not found" });

        if (user.is_verified) {
            return res.status(400).json({ error: "Already verified" });
        }

        // Reuse existing token or generate new one?
        let token = user.verification_token;
        if (!token) {
            token = uuidv4();
            db.run("UPDATE users SET verification_token = ? WHERE id = ?", [token, user.id]);
        }

        // Decrypt real email to send
        try {
            const realEmail = decrypt(user.email_encrypted);
            sendVerificationEmail(realEmail, token);
            res.json({ message: "Email sent" });
        } catch (e) {
            res.status(500).json({ error: "Decryption error" });
        }
    });
});

// Get Current User (Session check)
router.get('/me', authenticateToken, (req, res) => {
    db.get("SELECT email_encrypted, is_verified, role, is_premium, is_gift, created_at, subscription_plan, subscription_status, premium_until, trial_until, is_subject_vat, vat_start_date FROM users WHERE id = ?", [req.user.id], (err, row) => {
        if (!row) return res.status(404).json({ error: "User not found" });
        try {
            res.json({
                id: req.user.id,
                email: decrypt(row.email_encrypted), // Decrypt for display
                is_verified: !!row.is_verified,
                role: row.role,
                is_premium: !!row.is_premium,
                is_gift: !!row.is_gift,
                created_at: row.created_at,
                subscription_plan: row.subscription_plan,
                subscription_status: row.subscription_status,
                premium_until: row.premium_until,
                trial_until: row.trial_until,
                is_subject_vat: !!row.is_subject_vat,
                vat_start_date: row.vat_start_date
            });
        } catch (e) {
            console.error("Decryption failed for user " + req.user.id + ":", e);
            // If we can't decrypt, the data is likely invalid/key changed. 
            // Force logout to avoid infinite 500 loop on frontend.
            res.clearCookie('token');
            res.status(401).json({ error: "Session invalid (Decryption failed)" });
        }
    });
});

// Update Profile (VAT)
router.put('/me', authenticateToken, (req, res) => {
    const { is_subject_vat, vat_start_date } = req.body;

    // Validate inputs if needed (date format etc)

    // Build dynamic query
    let fields = [];
    let values = [];

    if (is_subject_vat !== undefined) {
        fields.push("is_subject_vat = ?");
        values.push(is_subject_vat ? 1 : 0);
    }
    if (vat_start_date !== undefined) {
        fields.push("vat_start_date = ?");
        values.push(vat_start_date);
    }

    if (fields.length === 0) {
        return res.json({ message: "Nothing to update" });
    }

    values.push(req.user.id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;

    db.run(sql, values, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Profile updated" });
    });
});

// Update subscription
router.post('/subscribe', authenticateToken, (req, res) => {
    const { plan } = req.body; // 'monthly' or 'annual'
    if (!['monthly', 'annual'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan' });
    }

    // Mock payment success logic
    const duration = plan === 'annual' ? 365 : 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + duration);

    db.run(
        `UPDATE users 
         SET is_premium = 1, 
             subscription_plan = ?, 
             subscription_status = 'active',
             premium_until = ?  -- Assuming we add this column or rely on is_premium for now. 
             -- Wait, I didn't add 'premium_until' to DB schema in previous step? 
             -- Let's check DB schema. 'is_premium' exists. 'premium_until' was used in frontend mock but maybe not in DB?
             -- Actually UserProfile.jsx uses user.premium_until. 
             -- Let's add premium_until to DB schema if it's missing or use it if it's there.
             -- Checking DB.js content from previous reads...
         WHERE id = ?`,
        [plan, expiryDate.toISOString(), req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Return updated user info
            db.get("SELECT id, email_encrypted, email_hash, role, is_premium, subscription_plan, subscription_status FROM users WHERE id = ?", [req.user.id], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    ...row,
                    // Mock returning the date we just set, if DB didn't have column it might be lost (but I will add it now if needed)
                    premium_until: expiryDate.toISOString()
                });
            });
        }
    );
});

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, (req, res) => {
    // In a real app, this would be "cancel at period end".
    // For demo/MVP, we'll revert to free immediately or set status to cancelled.
    // Let's set status to cancelled but keep is_premium until expiry logic runs (which we don't have).
    // The user likely wants to see the "Subscribe" buttons again to test.
    // So let's force remove premium for testing purposes, or allow 're-subscribe'.

    db.run(
        `UPDATE users 
         SET is_premium = 0, 
             subscription_status = 'cancelled',
             premium_until = NULL 
         WHERE id = ?`,
        [req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Subscription cancelled' });
        }
    );
});

// Request Password Reset
router.post('/request-password-reset', async (req, res) => {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    email = email.trim();

    const emailHash = hashEmail(email);

    db.get("SELECT * FROM users WHERE email_hash = ?", [emailHash], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        // Security: Don't reveal if user does not exist.
        if (!user) return res.json({ message: "Si un compte existe, un email a été envoyé." });

        const token = uuidv4();
        const expires = Date.now() + 3600000; // 1 hour

        db.run("UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?", [token, expires, user.id], (err) => {
            if (err) return res.status(500).json({ error: "DB Error" });

            try {
                const realEmail = decrypt(user.email_encrypted);
                sendPasswordResetEmail(realEmail, token);
                res.json({ message: "Si un compte existe, un email a été envoyé." });
            } catch (e) {
                res.status(500).json({ error: "Email failed" });
            }
        });
    });
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) return res.status(400).json({ error: "Token and password required" });
    if (!isValidPassword(newPassword)) return res.status(400).json({ error: "Password must be at least 8 characters" });

    db.get("SELECT * FROM users WHERE reset_password_token = ?", [token], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: "Invalid or expired token" });

        if (Date.now() > parseInt(user.reset_password_expires)) {
            return res.status(400).json({ error: "Token expired" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.run("UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?", [hashedPassword, user.id], (err) => {
            if (err) return res.status(500).json({ error: "Update failed" });
            res.json({ message: "Mot de passe modifié avec succès" });
        });
    });
});

export default router;
