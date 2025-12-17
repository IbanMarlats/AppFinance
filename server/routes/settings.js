import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// GET Settings - Merge Global + User Overrides
router.get('/', (req, res) => {
    // 1. Get Global Settings
    db.all("SELECT * FROM settings", [], (err, globalRows) => {
        if (err) return res.status(500).json({ error: err.message });

        const globalSettings = globalRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});

        // 2. Get User Overrides
        db.all("SELECT key, value FROM user_settings WHERE user_id = ?", [req.user.id], (err, userRows) => {
            if (err) return res.status(500).json({ error: err.message });

            const userSettings = userRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});

            // 3. Merge (User overrides Global)
            const finalSettings = { ...globalSettings, ...userSettings };

            // Add metadata about what is overridden? 
            // Optional: Frontend might want to know if it's using default or personal.
            // For now, simple merge is what was requested (effective settings).

            res.json(finalSettings);
        });
    });
});

// PUT Settings - Update User Overrides
router.put('/', (req, res) => {
    const settings = req.body; // { key: value, ... }

    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings format' });
    }

    const userId = req.user.id;

    const stmt = db.prepare(`
        INSERT INTO user_settings (user_id, key, value) 
        VALUES (?, ?, ?) 
        ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
    `);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        Object.entries(settings).forEach(([key, value]) => {
            // If value matches global default, maybe delete the override? 
            // For simplicity, we just save what the user wants. 
            // If they want to "reset", they'd need a specific reset feature or we check vs global.
            // Let's just save.

            // Basic value sanitization to string
            let safeValue = String(value);
            // Limit length reasonably
            if (safeValue.length > 1000) safeValue = safeValue.substring(0, 1000);

            stmt.run(userId, key, safeValue);
        });
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'User settings updated' });
        });
        stmt.finalize();
    });
});

export default router;
