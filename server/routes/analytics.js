import express from 'express';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { hashEmail } from '../utils/crypto.js'; // reusing generic hash function if suitable or just simple hash

const router = express.Router();

// Log a visit
router.post('/visit', (req, res) => {
    const { visitor_id } = req.body;

    // We expect a client-generated UUID. If not provided, we ignore or generate one?
    // Actually, client should send it.
    if (!visitor_id) {
        return res.status(400).json({ error: 'visitor_id required' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    // We can hash IP for some privacy if we want, but 'hashEmail' is sha256.
    // Let's just store it or a hash. Since this is a simple app, I'll store it directly 
    // or better, hash it to be GDPR nice, though not strictly required if we don't link to PII.
    // I'll reuse 'hashEmail' which is just a crypto hash wrapper.
    const ipHash = hashEmail(ip || 'unknown');

    // Check if this visitor_id already visited? 
    // User wants "number of DIFFERENT people".
    // Does that mean count of unique visitor_ids? Yes.
    // Do we need to store every visit? Or just one per visitor?
    // Storing every visit allows "Total Visits" vs "Unique Visitors".
    // I'll store every visit, or at least one per session/day.
    // For simplicity, I'll store every "hit" but maybe we want to debounce?
    // Let's just insert. The Count(Distinct visitor_id) will handle uniqueness.

    const id = uuidv4();
    db.run("INSERT INTO site_visits (id, visitor_id, ip_hash) VALUES (?, ?, ?)",
        [id, visitor_id, ipHash],
        (err) => {
            if (err) {
                console.error("Error logging visit:", err);
                return res.status(500).json({ error: 'Failed to log visit' });
            }
            res.json({ success: true });
        }
    );
});

export default router;
