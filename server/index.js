import dotenv from 'dotenv';
// Attempt to load .env from server directory if running from root
dotenv.config({ path: 'server/.env' });
// Also try default (root) just in case they moved it
dotenv.config();

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

const app = express();
const PORT = process.env.PORT || 3001;

console.log("Current working directory:", process.cwd());

// Initialize Email Transporter
// Initialize Email Transporter
createTransporter();

// Initialize Cron Jobs
import { initCronJobs } from './cron/monthlyRecap.js';
initCronJobs();

// --- MIDDLEWARE ---
app.use(cors({
    origin: 'http://localhost:5173', // Vite dev server
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
app.use('/api/stripe', stripeRoutes);
app.use('/api/contact', contactRoutes);

app.use('/api/contact', contactRoutes);

import recapRoutes from './routes/recaps.js';
app.use('/api/recaps', recapRoutes);

import uploadRoutes from './routes/upload.js';
app.use('/api/upload', uploadRoutes);

// Static Uploads
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Public Settings Route (Used in auth/registration possibly? Or general app config)
// The original code had /api/settings as authenticated, but also a GET /api/settings. 
// Let's check original. It was `app.get('/api/settings', authenticateToken, ...)`
// So it fits in a general route or we can put it in a dedicated settings route. 
// Since it's just one GET, I'll add it here or in a 'general' router.
// Actually, I put the admin POST settings in admin.js. 
// Let's add the GET /api/settings here or create a small router for it if we want to be pure.
// For now, I'll just add it inline or better yet, maybe in `auth.js` or `admin.js`?
// No, it's for general user settings maybe? No, it's system settings.
// Let's keep it here for now or duplicate logic to admin if it makes sense? 
// No, let's just add it as a standalone endpoint or use a new 'settings.js' route. 
// It's small so I'll put it here to keep it simple, OR move it to a `misc.js`.
// Actually, `admin.js` has the PUT. I should probably move the GET there too but remove isAdmin for GET?
// Let's look at `server/routes/admin.js` again... I only put PUT there.
// I will just add the GET route here to avoid importing another file for 1 route, or cleaner: put it in `admin.js` and allow non-admin access for GET?
// No, `admin.js` has `router.use(isAdmin)`.
// Okay, I'll just put it here.


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
