import express from 'express';
import cors from 'cors';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Platforms
app.get('/api/platforms', (req, res) => {
    db.all("SELECT * FROM platforms", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/platforms', (req, res) => {
    const { name, taxRate } = req.body;
    const id = uuidv4();
    db.run("INSERT INTO platforms (id, name, taxRate) VALUES (?, ?, ?)", [id, name, taxRate], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, name, taxRate });
    });
});

app.put('/api/platforms/:id', (req, res) => {
    const { name, taxRate } = req.body;
    db.run("UPDATE platforms SET name = ?, taxRate = ? WHERE id = ?",
        [name, taxRate, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, taxRate });
        }
    );
});

app.delete('/api/platforms/:id', (req, res) => {
    db.run("DELETE FROM platforms WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// Incomes
app.get('/api/incomes', (req, res) => {
    db.all("SELECT * FROM incomes", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/incomes', (req, res) => {
    const { name, amount, date, platformId } = req.body;
    const id = uuidv4();
    db.run("INSERT INTO incomes (id, name, amount, date, platformId) VALUES (?, ?, ?, ?, ?)", [id, name, amount, date, platformId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, name, amount, date, platformId });
    });
});

app.put('/api/incomes/:id', (req, res) => {
    const { name, amount, date, platformId } = req.body;
    db.run("UPDATE incomes SET name = ?, amount = ?, date = ?, platformId = ? WHERE id = ?",
        [name, amount, date, platformId, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, amount, date, platformId });
        }
    );
});

app.delete('/api/incomes/:id', (req, res) => {
    db.run("DELETE FROM incomes WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// Expenses
app.get('/api/expenses', (req, res) => {
    db.all("SELECT * FROM expenses", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/expenses', (req, res) => {
    const { name, amount, date } = req.body;
    const id = uuidv4();
    db.run("INSERT INTO expenses (id, name, amount, date) VALUES (?, ?, ?, ?)", [id, name, amount, date], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, name, amount, date });
    });
});

app.put('/api/expenses/:id', (req, res) => {
    const { name, amount, date } = req.body;
    db.run("UPDATE expenses SET name = ?, amount = ?, date = ? WHERE id = ?",
        [name, amount, date, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: req.params.id, name, amount, date });
        }
    );
});

app.delete('/api/expenses/:id', (req, res) => {
    db.run("DELETE FROM expenses WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
