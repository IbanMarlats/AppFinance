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
        vat_rate,
        recurring_end_date,
        tax_category
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

    const rate = parseFloat(vat_rate) || 0;
    const vatAmount = (parseFloat(amount) * rate) / 100;

    const generateId = () => uuidv4();


    // Main entry
    const mainId = generateId();
    const mainEntry = {
        id: mainId, name, amount, date, platformId,
        is_recurring: is_recurring ? 1 : 0,
        recurring_end_date: recurring_end_date || null,
        tjm: tjm || null, user_id: req.user.id,
        cogs: cogs || 0, shipping_cost: shipping_cost || 0, status: status || 'confirmed',
        material_cost: material_cost || 0, hours_spent: hours_spent || 0,
        channel_source: channel_source || null, income_type: income_type || 'active',
        invoice_date: invoice_date || null,
        distance_km: distance_km || 0, vat_rate: rate, vat_amount: vatAmount,
        tax_category: tax_category || 'bnc'
    };


    // Backfill Logic
    const entriesToInsert = [mainEntry];

    if (is_recurring) {
        let currentDate = new Date(date);
        const now = new Date();
        const endDate = recurring_end_date ? new Date(recurring_end_date) : null;

        // Move to next month for the first backfill check
        currentDate.setMonth(currentDate.getMonth() + 1);

        while (currentDate <= now) {
            // Check if we passed the end date
            if (endDate && currentDate > endDate) break;

            const newDateStr = currentDate.toISOString().split('T')[0];
            const newId = generateId();

            entriesToInsert.push({
                ...mainEntry,
                id: newId,
                date: newDateStr
            });

            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    }

    const stmt = db.prepare(`INSERT INTO incomes (
        id, name, amount, date, platformId, is_recurring, recurring_end_date, tjm, user_id, 
        cogs, shipping_cost, status,
        material_cost, hours_spent,
        channel_source, income_type, invoice_date,
        distance_km, vat_rate, vat_amount, tax_category
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    const runInsert = (entry) => {
        return new Promise((resolve, reject) => {
            stmt.run([
                entry.id, entry.name, entry.amount, entry.date, entry.platformId,
                entry.is_recurring, entry.recurring_end_date, entry.tjm, entry.user_id,
                entry.cogs, entry.shipping_cost, entry.status,
                entry.material_cost, entry.hours_spent,
                entry.channel_source, entry.income_type, entry.invoice_date,
                entry.distance_km, entry.vat_rate, entry.vat_amount, entry.tax_category
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };

    // Use a transaction ideally, but serialized is okay for now
    db.serialize(async () => {
        db.run("BEGIN TRANSACTION");
        try {
            for (const entry of entriesToInsert) {
                await runInsert(entry);
            }
            stmt.finalize();
            db.run("COMMIT", () => {
                res.json(entriesToInsert);
            });
        } catch (err) {
            db.run("ROLLBACK");
            res.status(500).json({ error: err.message });
        }
    });
});

router.put('/:id', (req, res) => {
    const {
        name, amount, date, platformId, is_recurring, tjm,
        cogs, shipping_cost, status,
        material_cost, hours_spent,
        channel_source, income_type, invoice_date,
        distance_km,
        vat_rate,
        tax_category
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
            distance_km = ?, vat_rate = ?, vat_amount = ?, tax_category = ?
        WHERE id = ? AND user_id = ?`,
        [
            name, amount, date, platformId, is_recurring ? 1 : 0, tjm || null,
            cogs || 0, shipping_cost || 0, status || 'confirmed',
            material_cost || 0, hours_spent || 0,
            channel_source || null, income_type || 'active', invoice_date || null,
            distance_km || 0, rate, vatAmount, tax_category || 'bnc',
            req.params.id, req.user.id
        ],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                id: req.params.id, name, amount, date, platformId, is_recurring: !!is_recurring, tjm,
                cogs, shipping_cost, status,
                material_cost, hours_spent, channel_source, income_type, invoice_date, distance_km,
                vat_rate: rate, vat_amount: vatAmount, tax_category: tax_category || 'bnc'
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
