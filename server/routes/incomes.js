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
    const {
        name, amount, date, platformId, is_recurring, tjm,
        cogs, shipping_cost, status,
        material_cost, hours_spent,
        channel_source, income_type, invoice_date,
        distance_km,
        vat_rate
    } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    if (isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Amount must be a number' });
    }
    if (date && isNaN(Date.parse(date))) {
        return res.status(400).json({ error: 'Invalid date format' });
    }

    // Calculate VAT amount
    const rate = parseFloat(vat_rate) || 0;
    const vatAmount = (parseFloat(amount) * rate) / 100;

    const id = uuidv4();
    db.run(
        `INSERT INTO incomes (
            id, name, amount, date, platformId, is_recurring, tjm, user_id, 
            cogs, shipping_cost, status,
            material_cost, hours_spent,
            channel_source, income_type, invoice_date,
            distance_km, vat_rate, vat_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id, name, amount, date, platformId, is_recurring ? 1 : 0, tjm || null, req.user.id,
            cogs || 0, shipping_cost || 0, status || 'confirmed',
            material_cost || 0, hours_spent || 0,
            channel_source || null, income_type || 'active', invoice_date || null,
            distance_km || 0, rate, vatAmount
        ],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                id, name, amount, date, platformId, is_recurring: !!is_recurring, tjm,
                cogs, shipping_cost, status,
                material_cost, hours_spent,
                channel_source, income_type, invoice_date,
                distance_km, vat_rate: rate, vat_amount: vatAmount
            });
        }
    );
});

router.put('/:id', (req, res) => {
    const {
        name, amount, date, platformId, is_recurring, tjm,
        cogs, shipping_cost, status,
        material_cost, hours_spent,
        channel_source, income_type, invoice_date,
        distance_km,
        vat_rate
    } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    if (isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Amount must be a number' });
    }
    if (date && isNaN(Date.parse(date))) {
        return res.status(400).json({ error: 'Invalid date format' });
    }

    // Calculate VAT amount
    const rate = parseFloat(vat_rate) || 0;
    const vatAmount = (parseFloat(amount) * rate) / 100;

    db.run(
        `UPDATE incomes SET 
            name = ?, amount = ?, date = ?, platformId = ?, is_recurring = ?, tjm = ?, 
            cogs = ?, shipping_cost = ?, status = ?,
            material_cost = ?, hours_spent = ?,
            channel_source = ?, income_type = ?, invoice_date = ?,
            distance_km = ?, vat_rate = ?, vat_amount = ?
        WHERE id = ? AND user_id = ?`,
        [
            name, amount, date, platformId, is_recurring ? 1 : 0, tjm || null,
            cogs || 0, shipping_cost || 0, status || 'confirmed',
            material_cost || 0, hours_spent || 0,
            channel_source || null, income_type || 'active', invoice_date || null,
            distance_km || 0, rate, vatAmount,
            req.params.id, req.user.id
        ],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                id: req.params.id, name, amount, date, platformId, is_recurring: !!is_recurring, tjm,
                cogs, shipping_cost, status,
                material_cost, hours_spent, channel_source, income_type, invoice_date, distance_km,
                vat_rate: rate, vat_amount: vatAmount
            });
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
