import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateMonthlyRecap } from '../services/recapService.js';

const router = express.Router();

// Get all recaps for user
router.get('/', authenticateToken, (req, res) => {
    db.all(`SELECT * FROM monthly_recaps WHERE user_id = ? ORDER BY year DESC, month DESC`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        rows = rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
        res.json(rows);
    });
});

// Force generate (Admin or Testing)
// Ideally keep this admin only or strict rate limit
router.post('/generate-test', authenticateToken, async (req, res) => {
    try {
        const { month, year } = req.body;
        // Default to current month/year if not provided
        const curDate = new Date();
        const m = month || curDate.getMonth() + 1;
        const y = year || curDate.getFullYear();

        const result = await generateMonthlyRecap(req.user.id, m, y);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark notification read (moved logic here or general notifications route)
// We might need a separate notifications route, but for now lets keep recaps simple.

export default router;
