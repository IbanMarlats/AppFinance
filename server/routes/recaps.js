import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateMonthlyRecap, generateYearlyRecap } from '../services/recapService.js';

const router = express.Router();

// ... existing routes

router.post('/generate-annual', authenticateToken, async (req, res) => {
    try {
        const { year } = req.body;
        const y = year || new Date().getFullYear();
        const result = await generateYearlyRecap(req.user.id, y);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/generate-monthly', authenticateToken, async (req, res) => {
    try {
        const { month, year } = req.body;
        const m = month || new Date().getMonth(); // Default to last month if not specified
        const y = year || new Date().getFullYear();
        const result = await generateMonthlyRecap(req.user.id, m, y);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all recaps for user
router.get('/', authenticateToken, async (req, res) => {
    // If premium, ensure the last 2 months exist
    if (req.user.is_premium) {
        try {
            const now = new Date();
            for (let i = 1; i <= 2; i++) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const m = date.getMonth() + 1;
                const y = date.getFullYear();

                // Check if exists
                const exists = await new Promise((resolve) => {
                    db.get("SELECT id FROM monthly_recaps WHERE user_id = ? AND month = ? AND year = ?", [req.user.id, m, y], (err, row) => {
                        resolve(!!row);
                    });
                });

                if (!exists) {
                    console.log(`Auto-generating missing recap for ${m}/${y} for user ${req.user.id}`);
                    await generateMonthlyRecap(req.user.id, m, y);
                }
            }
        } catch (e) {
            console.error("Auto-generation of missing recaps failed:", e);
        }
    }

    db.all(`SELECT * FROM monthly_recaps WHERE user_id = ? ORDER BY year DESC, month DESC`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows = rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
        res.json(rows);
    });
});

// Get all ANNUAL recaps for user
router.get('/annual', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM yearly_recaps WHERE user_id = ? ORDER BY year DESC`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows = rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
        res.json(rows);
    });
});

// Mark notification read (moved logic here or general notifications route)
// We might need a separate notifications route, but for now lets keep recaps simple.

// Mark notification read (moved logic here or general notifications route)
// We might need a separate notifications route, but for now lets keep recaps simple.

export default router;
