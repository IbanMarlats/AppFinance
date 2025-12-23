import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', (req, res) => {
    db.all("SELECT * FROM platforms WHERE user_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

router.post('/', (req, res) => {
    const { name, taxRate, fixed_fee, fee_vat_rate, color } = req.body;
    const id = uuidv4();
    db.run("INSERT INTO platforms (id, name, taxRate, fixed_fee, fee_vat_rate, color, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, name, taxRate, fixed_fee || 0, fee_vat_rate || 0, color || '#6366f1', req.user.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, name, taxRate, fixed_fee: fixed_fee || 0, fee_vat_rate: fee_vat_rate || 0, color });
        });
});

router.put('/:id', (req, res) => {
    const { name, taxRate, fixed_fee, fee_vat_rate, color } = req.body;
    db.run("UPDATE platforms SET name = ?, taxRate = ?, fixed_fee = ?, fee_vat_rate = ?, color = ? WHERE id = ? AND user_id = ?",
        [name, taxRate, fixed_fee || 0, fee_vat_rate || 0, color, req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, taxRate, fixed_fee: fixed_fee || 0, fee_vat_rate: fee_vat_rate || 0, color });
        }
    );
});

router.delete('/:id', (req, res) => {
    db.run("DELETE FROM platforms WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

export default router;
