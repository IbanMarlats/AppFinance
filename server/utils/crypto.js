import crypto from 'crypto';

// CRITICAL: Must be stable across restarts to prevent 401 errors/decryption failures
const SECRET_KEY = 'stable_secret_key_fixed_for_dev_mode';
const ENCRYPTION_KEY = crypto.scryptSync(SECRET_KEY, 'salt', 32); // Derived key
const ALGORITHM = 'aes-256-cbc';

// Debug log for verification
console.log("Using CONSTANT SECRET_KEY hash:", crypto.createHash('md5').update(SECRET_KEY).digest('hex'));

export function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export function hashEmail(email) {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

export { SECRET_KEY };
