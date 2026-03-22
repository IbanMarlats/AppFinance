import dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config(); // Standard .env in CWD
dotenv.config({ path: 'server/.env' }); // Root-relative path
dotenv.config({ path: '../.env' }); // Up-one level

console.log("=== SERVER STARTING UP ===");
console.log("Time:", new Date().toISOString());
console.log("Working Directory:", process.cwd());
console.log("Node version:", process.version);

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import db from './db.js';
import { createTransporter } from './utils/email.js';
import { authenticateToken } from './middleware/auth.js';

// Routes
import authRoutes from './routes/auth.js';
import platformRoutes from './routes/platforms.js';
import incomeRoutes from './routes/incomes.js';
import expenseRoutes from './routes/expenses.js';
import categoryRoutes from './routes/categories.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import goalsRoutes from './routes/goals.js';
import stripeRoutes from './routes/stripe.js';
import contactRoutes from './routes/contact.js';
import recapRoutes from './routes/recaps.js';
import uploadRoutes from './routes/upload.js';

// Global Error Handlers to prevent crashing and provide logs
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Proxy (Essential for correctly identifying HTTPS behind Alwaysdata/Heroku/etc)
app.set('trust proxy', 1);

console.log("Current working directory:", process.cwd());

// Initialize Email Transporter
createTransporter();

// Initialize Cron Jobs
import { initCronJobs } from './cron/monthlyRecap.js';
import { initSubscriptionCron } from './cron/checkSubscriptions.js';
initCronJobs();
initSubscriptionCron();

// --- MIDDLEWARE ---
app.use(cors({
    origin: (origin, callback) => {
        // Build list of allowed origins
        const allowed = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'https://ibanmarlats.alwaysdata.net', 'https://fiskeo.fr', 'https://www.fiskeo.fr'];
        if (process.env.FRONTEND_URL) {
            allowed.push(...process.env.FRONTEND_URL.split(' '));
        }

        if (!origin || allowed.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/recaps', recapRoutes);
app.use('/api/upload', uploadRoutes);

// Static Uploads
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Final Error Middleware
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    res.status(500).json({ 
        error: 'Internal Server Error', 
        message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur interne est survenue'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("Alwaysdata IP:", process.env.IP);
    console.log("Alwaysdata PORT:", process.env.PORT);
});
