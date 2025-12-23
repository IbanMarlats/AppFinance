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
    const { name, amount, date, category, is_recurring, vat_rate, vat_amount, frequency, recurring_end_date } = req.body;

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

    const generateId = () => uuidv4();
    const mainId = generateId();

    const mainEntry = {
        id: mainId, name, amount, date, category,
        is_recurring: is_recurring ? 1 : 0,
        vat_rate: vat_rate || 0,
        vat_amount: vat_amount || 0,
        frequency: frequency || 'monthly',
        recurring_end_date: recurring_end_date || null,
        user_id: req.user.id
    };

    // Backfill Logic
    const entriesToInsert = [mainEntry];

    if (is_recurring) {
        let currentDate = new Date(date);
        const now = new Date();
        const endDate = recurring_end_date ? new Date(recurring_end_date) : null;
        const isAnnual = frequency === 'annual';

        // Move to next occurrence for the first backfill check
        if (isAnnual) {
            currentDate.setFullYear(currentDate.getFullYear() + 1);
        } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

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

            if (isAnnual) {
                currentDate.setFullYear(currentDate.getFullYear() + 1);
            } else {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }
    }

    const stmt = db.prepare(`INSERT INTO expenses (id, name, amount, date, category, is_recurring, vat_rate, vat_amount, frequency, user_id, recurring_end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    const runInsert = (entry) => {
        return new Promise((resolve, reject) => {
            stmt.run([
                entry.id, entry.name, entry.amount, entry.date, entry.category,
                entry.is_recurring, entry.vat_rate, entry.vat_amount, entry.frequency, entry.user_id, entry.recurring_end_date
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    };

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
    const { name, amount, date, category, is_recurring, vat_rate, vat_amount, frequency } = req.body;

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

    db.run(
        "UPDATE expenses SET name = ?, amount = ?, date = ?, category = ?, is_recurring = ?, vat_rate = ?, vat_amount = ?, frequency = ? WHERE id = ? AND user_id = ?",
        [name, amount, date, category, is_recurring ? 1 : 0, vat_rate || 0, vat_amount || 0, frequency || 'monthly', req.params.id, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, amount, date, category, is_recurring: !!is_recurring, vat_rate, vat_amount, frequency });
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
