import jwt from 'jsonwebtoken';
import { SECRET_KEY } from '../utils/crypto.js';

export const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    
    // Debug logging for production troubleshooting
    if (!token) {
        console.warn(`[AUTH] Missing token for ${req.path}. Secure: ${req.secure}, Headers: ${JSON.stringify(req.headers.cookie ? 'Cookie present' : 'No cookies')}`);
        return res.status(401).json({ error: 'Not authenticated' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.error(`[AUTH] Invalid token for ${req.path}:`, err.message);
            return res.status(403).json({ error: 'Token invalid' });
        }
        req.user = user;
        next();
    });
};

export const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};
