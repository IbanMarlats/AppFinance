import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all goals for the current user
router.get('/', authenticateToken, (req, res) => {
    db.all("SELECT * FROM goals WHERE user_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Set a goal (Upsert)
router.post('/', authenticateToken, (req, res) => {
    const { type, period, target_amount, period_key } = req.body;

    if (!['revenue', 'expense'].includes(type)) return res.status(400).json({ error: "Invalid type" });
    if (!['year', 'month'].includes(period)) return res.status(400).json({ error: "Invalid period" });
    if (!period_key) return res.status(400).json({ error: "Period key required" });

    // Check Premium Status
    db.get("SELECT is_premium FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user || !user.is_premium) {
            return res.status(403).json({ error: "Premium functionality required" });
        }

        // Proceed with upsert logic...

        // Proceed with upsert logic...
        upsertGoal();
    });

    function upsertGoal() {
        db.get(
            "SELECT id FROM goals WHERE user_id = ? AND type = ? AND period = ? AND period_key = ?",
            [req.user.id, type, period, period_key],
            (err, row) => {
                if (err) return res.status(500).json({ error: err.message });

                if (row) {
                    // Update
                    db.run(
                        "UPDATE goals SET target_amount = ? WHERE id = ?",
                        [target_amount, row.id],
                        (err) => {
                            if (err) return res.status(500).json({ error: err.message });
                            res.json({ message: "Goal updated", id: row.id, target_amount });
                        }
                    );
                } else {
                    // Insert
                    const id = uuidv4();
                    db.run(
                        "INSERT INTO goals (id, user_id, type, period, target_amount, period_key) VALUES (?, ?, ?, ?, ?, ?)",
                        [id, req.user.id, type, period, target_amount, period_key],
                        (err) => {
                            if (err) return res.status(500).json({ error: err.message });
                            res.json({ message: "Goal set", id, target_amount });
                        }
                    );
                }
            }
        );
    }


});

export default router;
