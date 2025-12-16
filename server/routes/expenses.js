import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', (req, res) => {
    db.all("SELECT * FROM expenses WHERE user_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/', (req, res) => {
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

router.put('/:id', (req, res) => {
    const { name, amount, date, category, is_recurring } = req.body;
    db.run("UPDATE expenses SET name = ?, amount = ?, date = ?, category = ?, is_recurring = ? WHERE id = ? AND user_id = ?",
        [name, amount, date, category, is_recurring ? 1 : 0, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, amount, date, category, is_recurring: !!is_recurring });
        }
    );
});

router.delete('/:id', (req, res) => {
    db.run("DELETE FROM expenses WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

export default router;
