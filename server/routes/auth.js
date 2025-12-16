import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { encrypt, decrypt, hashEmail, SECRET_KEY } from '../utils/crypto.js';
import { sendVerificationEmail } from '../utils/email.js';
import { authenticateToken } from '../middleware/auth.js';
import { logEvent } from '../utils/logger.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    const { email, password, role, newsletter } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
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
    const { email, password } = req.body;
    const emailHash = hashEmail(email);

    db.get("SELECT * FROM users WHERE email_hash = ?", [emailHash], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        // Update last_login
        db.run("UPDATE users SET last_login = ? WHERE id = ?", [new Date().toISOString(), user.id]);

        const token = jwt.sign({ id: user.id, is_verified: !!user.is_verified, role: user.role || 'admin' }, SECRET_KEY, { expiresIn: '30d' });
        res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax' });

        res.json({ message: 'Logged in', user: { id: user.id, email: email, is_verified: user.is_verified, role: user.role || 'admin' } });
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
    db.get("SELECT email_encrypted, is_verified, role, is_premium, created_at FROM users WHERE id = ?", [req.user.id], (err, row) => {
        if (!row) return res.status(404).json({ error: "User not found" });
        try {
            res.json({
                id: req.user.id,
                email: decrypt(row.email_encrypted), // Decrypt for display
                is_verified: !!row.is_verified,
                role: row.role,
                is_premium: !!row.is_premium,
                created_at: row.created_at
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

export default router;
