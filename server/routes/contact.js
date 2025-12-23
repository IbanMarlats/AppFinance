import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendSuggestionEmail } from '../utils/email.js';
import { decrypt } from '../utils/crypto.js';

const router = express.Router();

router.use(authenticateToken);

// POST /suggest - Send a suggestion email
router.post('/suggest', (req, res) => {
    const { suggestion } = req.body;

    if (!suggestion || typeof suggestion !== 'string' || suggestion.trim().length === 0) {
        return res.status(400).json({ error: 'Suggestion text is required' });
    }

    // Get user email from DB
    db.get("SELECT email_encrypted FROM users WHERE id = ?", [req.user.id], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "User not found" });

        try {
            const userEmail = decrypt(row.email_encrypted);
            const success = await sendSuggestionEmail(userEmail, suggestion.trim());

            if (success) {
                res.json({ message: "Suggestion sent successfully" });
            } else {
                res.status(500).json({ error: "Failed to send email" });
            }
        } catch (e) {
            console.error("Error processing suggestion:", e);
            res.status(500).json({ error: "Internal server error" });
        }
    });
});

export default router;
