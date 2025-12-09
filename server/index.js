import dotenv from 'dotenv';
// Attempt to load .env from server directory if running from root
dotenv.config({ path: 'server/.env' });
// Also try default (root) just in case they moved it
dotenv.config();
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 3001;
// CRITICAL: Must be stable across restarts to prevent 401 errors/decryption failures
const SECRET_KEY = 'stable_secret_key_fixed_for_dev_mode';
console.log("Using CONSTANT SECRET_KEY hash:", crypto.createHash('md5').update(SECRET_KEY).digest('hex'));
console.log("Current working directory:", process.cwd());

// --- EMAIL CONFIGURATION ---
let transporter;

async function createTransporter() {
    if (!transporter) {
        // 1. Try Environment Variables (Real Email)
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            console.log("Configuring authentic SMTP transporter...");
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            console.log(`SMTP configured with host: ${process.env.SMTP_HOST}`);
        }
        // 2. Fallback to Ethereal (Development / Test)
        else {
            try {
                const testAccount = await nodemailer.createTestAccount();
                transporter = nodemailer.createTransport({
                    host: "smtp.ethereal.email",
                    port: 587,
                    secure: false, // true for 465, false for other ports
                    auth: {
                        user: testAccount.user, // generated ethereal user
                        pass: testAccount.pass, // generated ethereal password
                    },
                });
                console.log("----------------------------------------------------------------");
                console.log(" [DEV MODE] Email Transporter using Ethereal (Mock Server)");
                console.log(" User: " + testAccount.user);
                console.log("----------------------------------------------------------------");
            } catch (e) {
                console.error("Failed to create Ethereal account, falling back to console log");
                transporter = null;
            }
        }
    }
    return transporter;
}
createTransporter();

async function sendVerificationEmail(email, token) {
    const link = `http://localhost:${PORT}/api/auth/verify/${token}`;
    const mailOptions = {
        from: process.env.SMTP_FROM || '"Finance App" <noreply@financeapp.local>',
        to: email,
        subject: "Vérifiez votre email",
        html: `<h1>Bienvenue !</h1><p>Merci de confirmer votre inscription en cliquant sur ce lien :</p><a href="${link}">${link}</a>`,
    };

    if (transporter) {
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log("Message sent: %s", info.messageId);
            if (info.messageId && !process.env.SMTP_HOST) {
                console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
            }
        } catch (error) {
            console.error("Error sending email: ", error);
        }
    } else {
        console.log("----------------------------------------------------------------");
        console.log(" >>> VERIFICATION LINK: " + link);
        console.log("----------------------------------------------------------------");
    }
}


// --- ENCRYPTION HELPERS ---
const ENCRYPTION_KEY = crypto.scryptSync(SECRET_KEY, 'salt', 32); // Derived key
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function hashEmail(email) {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

// --- MIDDLEWARE ---
app.use(cors({
    origin: 'http://localhost:5173', // Vite dev server
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token invalid' });
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
    const { email, password, role, newsletter } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    const emailHash = crypto.createHash('sha256').update(email).digest('hex');
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

            // Login immediately 
            const token = jwt.sign({ id, is_verified: false, role }, SECRET_KEY, { expiresIn: '7d' });
            res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
            res.status(201).json({ message: 'User created. Please check email.', user: { id, email, is_verified: 0, role } });
        }
    );
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const emailHash = hashEmail(email);

    db.get("SELECT * FROM users WHERE email_hash = ?", [emailHash], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        // Update last_login
        db.run("UPDATE users SET last_login = ? WHERE id = ?", [new Date().toISOString(), user.id]);

        const token = jwt.sign({ id: user.id, is_verified: !!user.is_verified, role: user.role || 'admin' }, SECRET_KEY, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });

        res.json({ message: 'Logged in', user: { id: user.id, email: email, is_verified: user.is_verified, role: user.role || 'admin' } });
    });
});


// Logout
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
});

// Verify Email
app.get('/api/auth/verify/:token', (req, res) => {
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
app.post('/api/auth/resend-verification', (req, res) => {
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
app.get('/api/auth/me', authenticateToken, (req, res) => {
    db.get("SELECT email_encrypted, is_verified, role, is_premium FROM users WHERE id = ?", [req.user.id], (err, row) => {
        if (!row) return res.status(404).json({ error: "User not found" });
        try {
            res.json({
                id: req.user.id,
                email: decrypt(row.email_encrypted), // Decrypt for display
                is_verified: !!row.is_verified,
                role: row.role,
                is_premium: !!row.is_premium
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


// --- DATA ROUTES (PROTECTED) ---

// Platforms
app.get('/api/platforms', authenticateToken, (req, res) => {
    db.all("SELECT * FROM platforms WHERE user_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/platforms', authenticateToken, (req, res) => {
    const { name, taxRate } = req.body;
    const id = uuidv4();
    db.run("INSERT INTO platforms (id, name, taxRate, user_id) VALUES (?, ?, ?, ?)", [id, name, taxRate, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, name, taxRate });
    });
});

app.put('/api/platforms/:id', authenticateToken, (req, res) => {
    const { name, taxRate, fixed_fee } = req.body;
    db.run("UPDATE platforms SET name = ?, taxRate = ?, fixed_fee = ? WHERE id = ? AND user_id = ?",
        [name, taxRate, fixed_fee || 0, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, taxRate, fixed_fee: fixed_fee || 0 });
        }
    );
});

app.delete('/api/platforms/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM platforms WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// Incomes
app.get('/api/incomes', authenticateToken, (req, res) => {
    db.all("SELECT * FROM incomes WHERE user_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/incomes', authenticateToken, (req, res) => {
    const { name, amount, date, platformId, is_recurring, tjm } = req.body;
    const id = uuidv4();
    db.run("INSERT INTO incomes (id, name, amount, date, platformId, is_recurring, tjm, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [id, name, amount, date, platformId, is_recurring ? 1 : 0, tjm || null, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, name, amount, date, platformId, is_recurring: !!is_recurring, tjm });
        }
    );
});

app.put('/api/incomes/:id', authenticateToken, (req, res) => {
    const { name, amount, date, platformId, is_recurring, tjm } = req.body;
    db.run("UPDATE incomes SET name = ?, amount = ?, date = ?, platformId = ?, is_recurring = ?, tjm = ? WHERE id = ? AND user_id = ?",
        [name, amount, date, platformId, is_recurring ? 1 : 0, tjm || null, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, amount, date, platformId, is_recurring: !!is_recurring, tjm });
        }
    );
});

app.delete('/api/incomes/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM incomes WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// Expenses
app.get('/api/expenses', authenticateToken, (req, res) => {
    db.all("SELECT * FROM expenses WHERE user_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/expenses', authenticateToken, (req, res) => {
    const { name, amount, date, category, is_recurring } = req.body;
    const id = uuidv4();
    db.run("INSERT INTO expenses (id, name, amount, date, category, is_recurring, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, name, amount, date, category, is_recurring ? 1 : 0, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, name, amount, date, category, is_recurring: !!is_recurring });
        }
    );
});

app.put('/api/expenses/:id', authenticateToken, (req, res) => {
    const { name, amount, date, category, is_recurring } = req.body;
    db.run("UPDATE expenses SET name = ?, amount = ?, date = ?, category = ?, is_recurring = ? WHERE id = ? AND user_id = ?",
        [name, amount, date, category, is_recurring ? 1 : 0, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, amount, date, category, is_recurring: !!is_recurring });
        }
    );
});

app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM expenses WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// Categories
app.get('/api/categories', authenticateToken, (req, res) => {
    db.all("SELECT * FROM expense_categories WHERE user_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/categories', authenticateToken, (req, res) => {
    const { name, color } = req.body;
    const id = uuidv4();
    db.run("INSERT INTO expense_categories (id, name, color, user_id) VALUES (?, ?, ?, ?)",
        [id, name, color, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, name, color });
        }
    );
});

app.delete('/api/categories/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM expense_categories WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// Admin Routes
app.get('/api/admin/stats', authenticateToken, isAdmin, (req, res) => {
    db.all("SELECT role, is_premium, last_login, newsletter, COUNT(*) as count FROM users GROUP BY role, is_premium, last_login, newsletter", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const now = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);

        let activeUsers = 0;
        let activePremiumUsers = 0;

        rows.forEach(r => {
            if (r.last_login && new Date(r.last_login) >= threeMonthsAgo) {
                activeUsers += r.count;
                if (r.is_premium) activePremiumUsers += r.count;
            }
        });

        // Correct newsletter count: filter for newsletter = true in raw rows, 
        // OR if grouped query: sum counts where newsletter=1.
        // Wait, the query groups by everything so we have many rows.
        // Let's optimize: fetch raw rows is easier for calculating everything in JS for small app size.
    });

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

app.post('/api/admin/search', authenticateToken, isAdmin, (req, res) => {
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

app.put('/api/admin/user/:id/premium', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const { is_premium } = req.body; // Expect boolean

    db.run("UPDATE users SET is_premium = ? WHERE id = ?", [is_premium ? 1 : 0, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });

        res.json({ message: 'Premium status updated', is_premium: !!is_premium });
    });
});

// Settings Routes
app.get('/api/settings', authenticateToken, (req, res) => {
    db.all("SELECT * FROM settings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        res.json(settings);
    });
});

app.put('/api/admin/settings', authenticateToken, isAdmin, (req, res) => {
    const settings = req.body; // Expect object { key: value, ... }
    const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        Object.entries(settings).forEach(([key, value]) => {
            stmt.run(key, value);
        });
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Settings updated' });
        });
        stmt.finalize();
    });
});

app.delete('/api/incomes/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM incomes WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// Expenses
app.get('/api/expenses', authenticateToken, (req, res) => {
    db.all("SELECT * FROM expenses WHERE user_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/expenses', authenticateToken, (req, res) => {
    const { name, amount, date, category, is_recurring } = req.body;
    const id = uuidv4();
    db.run("INSERT INTO expenses (id, name, amount, date, category, is_recurring, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, name, amount, date, category, is_recurring ? 1 : 0, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, name, amount, date, category, is_recurring: !!is_recurring });
        }
    );
});

app.put('/api/expenses/:id', authenticateToken, (req, res) => {
    const { name, amount, date, category, is_recurring } = req.body;
    db.run("UPDATE expenses SET name = ?, amount = ?, date = ?, category = ?, is_recurring = ? WHERE id = ? AND user_id = ?",
        [name, amount, date, category, is_recurring ? 1 : 0, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, amount, date, category, is_recurring: !!is_recurring });
        }
    );
});

app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM expenses WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// Categories
app.get('/api/categories', authenticateToken, (req, res) => {
    db.all("SELECT * FROM expense_categories WHERE user_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/categories', authenticateToken, (req, res) => {
    const { name, color } = req.body;
    const id = uuidv4();
    db.run("INSERT INTO expense_categories (id, name, color, user_id) VALUES (?, ?, ?, ?)",
        [id, name, color, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, name, color });
        }
    );
});

app.delete('/api/categories/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM expense_categories WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// Admin Routes
app.get('/api/admin/stats', authenticateToken, isAdmin, (req, res) => {
    db.all("SELECT role, is_premium, last_login, newsletter, COUNT(*) as count FROM users GROUP BY role, is_premium, last_login, newsletter", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const now = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);

        let activeUsers = 0;
        let activePremiumUsers = 0;

        rows.forEach(r => {
            if (r.last_login && new Date(r.last_login) >= threeMonthsAgo) {
                activeUsers += r.count;
                if (r.is_premium) activePremiumUsers += r.count;
            }
        });

        // Correct newsletter count: filter for newsletter = true in raw rows, 
        // OR if grouped query: sum counts where newsletter=1.
        // Wait, the query groups by everything so we have many rows.
        // Let's optimize: fetch raw rows is easier for calculating everything in JS for small app size.
    });

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

app.post('/api/admin/search', authenticateToken, isAdmin, (req, res) => {
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

app.put('/api/admin/user/:id/premium', authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const { is_premium } = req.body; // Expect boolean

    db.run("UPDATE users SET is_premium = ? WHERE id = ?", [is_premium ? 1 : 0, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'User not found' });

        res.json({ message: 'Premium status updated', is_premium: !!is_premium });
    });
});

// Settings Routes
app.get('/api/settings', authenticateToken, (req, res) => {
    db.all("SELECT * FROM settings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        res.json(settings);
    });
});

app.put('/api/admin/settings', authenticateToken, isAdmin, (req, res) => {
    const settings = req.body; // Expect object { key: value, ... }
    const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        Object.entries(settings).forEach(([key, value]) => {
            stmt.run(key, value);
        });
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Settings updated' });
        });
        stmt.finalize();
    });
});

app.post('/api/admin/newsletter/send', authenticateToken, isAdmin, (req, res) => {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: "Subject and message required" });

    db.all("SELECT email_encrypted FROM users WHERE newsletter = 1", [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows.length === 0) return res.json({ message: "No subscribers found", count: 0 });

        let sentCount = 0;
        let errorCount = 0;

        // Send in parallel or serial? Serial is safer for rate limits, but parallel is faster.
        // Let's do simple Promise.all or for...of loop.
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

        res.json({ message: "Newsletter processing complete", sent: sentCount, errors: errorCount });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
