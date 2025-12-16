import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', (req, res) => {
    db.all("SELECT * FROM incomes WHERE user_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/', (req, res) => {
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

router.put('/:id', (req, res) => {
    const { name, amount, date, platformId, is_recurring, tjm } = req.body;
    db.run("UPDATE incomes SET name = ?, amount = ?, date = ?, platformId = ?, is_recurring = ?, tjm = ? WHERE id = ? AND user_id = ?",
        [name, amount, date, platformId, is_recurring ? 1 : 0, tjm || null, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, amount, date, platformId, is_recurring: !!is_recurring, tjm });
        }
    );
});

router.delete('/:id', (req, res) => {
    db.run("DELETE FROM incomes WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

export default router;
