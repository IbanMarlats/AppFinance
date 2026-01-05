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

// Get all recaps for user
router.get('/', authenticateToken, (req, res) => {
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
