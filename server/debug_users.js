
import db from './db.js';
import { decrypt, hashEmail } from './utils/crypto.js';

console.log("Listing all users from DB...");

db.all("SELECT id, email_hash, email_encrypted, password_hash, role, is_premium FROM users", [], (err, rows) => {
    if (err) {
        console.error("DB Error:", err);
        return;
    }
    console.log(`Found ${rows.length} users.`);
    rows.forEach(row => {
        try {
            const email = decrypt(row.email_encrypted);
            console.log(`User: ${email} | ID: ${row.id} | Role: ${row.role} | Premium: ${row.is_premium}`);
            const checkHash = hashEmail(email);
            if (checkHash !== row.email_hash) {
                console.error(`  [WARNING] Hash mismatch! DB Hash: ${row.email_hash} vs Computed: ${checkHash}`);
            } else {
                console.log(`  [OK] Hash matches.`);
            }
        } catch (e) {
            console.error(`User ID ${row.id}: Decryption failed.`, e.message);
        }
    });
});
