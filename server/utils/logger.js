import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

/**
 * Logs an event to the audit_logs table.
 * @param {string} type - The event type (e.g., 'REGISTER', 'LOGIN_FAIL', 'SETTINGS_UPDATE').
 * @param {string} description - A human-readable description of the event.
 * @param {string|null} userId - The ID of the user associated with the event (optional).
 * @param {object} req - The Express request object (to extract IP address).
 */
export const logEvent = (type, description, userId = null, req = null) => {
    const id = uuidv4();
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : 'UNKNOWN';
    const createdAt = new Date().toISOString();

    db.run(
        "INSERT INTO audit_logs (id, user_id, event_type, description, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [id, userId, type, description, ipAddress, createdAt],
        (err) => {
            if (err) {
                console.error("Failed to write audit log:", err);
            }
        }
    );
};
