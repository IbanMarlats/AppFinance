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
const SECRET_KEY = process.env.SECRET_KEY || 'your_super_secret_key_change_this_later';

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

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const emailHash = hashEmail(email);
    const emailEncrypted = encrypt(email);
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const verificationToken = uuidv4();

    db.run(
        "INSERT INTO users (id, email_hash, email_encrypted, password_hash, verification_token) VALUES (?, ?, ?, ?, ?)",
        [id, emailHash, emailEncrypted, hashedPassword, verificationToken],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }

            // Send Email
            sendVerificationEmail(email, verificationToken);

            // Login immediately (Optional: Usually wait for verification, but for UX let's allow basic access or set cookie)
            const token = jwt.sign({ id, is_verified: false }, SECRET_KEY, { expiresIn: '7d' });
            res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'strict' }); // 1 week
            res.status(201).json({ message: 'User created. Please check email.', user: { id, email, is_verified: 0 } });
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

        const token = jwt.sign({ id: user.id, is_verified: !!user.is_verified }, SECRET_KEY, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'strict' });

        // Decrypt email for consistency if needed, but we have it in req.body. 
        // Wait, user might have used different casing in login than reg?
        // hashEmail uses toLowerCase(). req.body.email might be anything.
        // Better to return the email from the DB (decrypted) or just use the one they logged in with (since it matched).
        // Using req.body.email is safe enough since we found the user with it.
        // Also need is_verified from DB.

        res.json({ message: 'Logged in', user: { id: user.id, email: email, is_verified: user.is_verified } });
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
    db.get("SELECT email_encrypted, is_verified FROM users WHERE id = ?", [req.user.id], (err, row) => {
        if (!row) return res.status(404).json({ error: "User not found" });
        try {
            res.json({
                id: req.user.id,
                email: decrypt(row.email_encrypted), // Decrypt for display
                is_verified: row.is_verified
            });
        } catch (e) {
            res.status(500).json({ error: "Descryption failed" });
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
    const { name, taxRate } = req.body;
    db.run("UPDATE platforms SET name = ?, taxRate = ? WHERE id = ? AND user_id = ?",
        [name, taxRate, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, taxRate });
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
    const { name, amount, date, platformId, is_recurring } = req.body;
    const id = uuidv4();
    db.run("INSERT INTO incomes (id, name, amount, date, platformId, is_recurring, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, name, amount, date, platformId, is_recurring ? 1 : 0, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, name, amount, date, platformId, is_recurring: !!is_recurring });
        }
    );
});

app.put('/api/incomes/:id', authenticateToken, (req, res) => {
    const { name, amount, date, platformId, is_recurring } = req.body;
    db.run("UPDATE incomes SET name = ?, amount = ?, date = ?, platformId = ?, is_recurring = ? WHERE id = ? AND user_id = ?",
        [name, amount, date, platformId, is_recurring ? 1 : 0, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, amount, date, platformId, is_recurring: !!is_recurring });
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
