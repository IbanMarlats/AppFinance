import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', (req, res) => {
    db.all("SELECT * FROM expense_categories WHERE user_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/', (req, res) => {
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

router.delete('/:id', (req, res) => {
    db.run("DELETE FROM expense_categories WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

export default router;
