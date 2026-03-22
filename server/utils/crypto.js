import crypto from 'crypto';
import dotenv from 'dotenv';

// Ensure env vars are loaded even if this is imported early
// Try multiple common locations for .env files
dotenv.config(); // Standard .env in CWD
dotenv.config({ path: 'server/.env' }); // Root-relative path
dotenv.config({ path: '../.env' }); // Up-one level (if running from subfolder)

// CRITICAL: Must be stable across restarts to prevent 401 errors/decryption failures
const SECRET_KEY = process.env.SECRET_KEY || 'stable_secret_key_fixed_for_dev_mode';
const ENCRYPTION_KEY = crypto.scryptSync(SECRET_KEY, 'salt', 32); // Derived key
const ALGORITHM = 'aes-256-cbc';

// Debug log for verification
const currentKeyHash = crypto.createHash('md5').update(SECRET_KEY).digest('hex');
console.log("Using CONSTANT SECRET_KEY hash:", currentKeyHash);
if (SECRET_KEY === 'stable_secret_key_fixed_for_dev_mode') {
    console.warn("WARNING: Using hardcoded fallback SECRET_KEY. This will break previous sessions if the .env key was different.");
}

export function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

const FALLBACK_SECRET_KEY = 'stable_secret_key_fixed_for_dev_mode';
const FALLBACK_ENCRYPTION_KEY = crypto.scryptSync(FALLBACK_SECRET_KEY, 'salt', 32);

export function decrypt(text) {
    try {
        return performDecryption(text, ENCRYPTION_KEY);
    } catch (err) {
        // If main key fails, try the fixed dev key as a fallback for transitioned accounts
        if (SECRET_KEY !== FALLBACK_SECRET_KEY) {
            try {
                return performDecryption(text, FALLBACK_ENCRYPTION_KEY);
            } catch (fallbackErr) {
                // Both failed
            }
        }
        throw err;
    }
}

function performDecryption(text, key) {
    const textParts = text.split(':');
    if (textParts.length < 2) throw new Error("Invalid encrypted format");
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export function hashEmail(email) {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

export { SECRET_KEY };
