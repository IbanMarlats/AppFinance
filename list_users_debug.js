
import db from './server/db.js';
import { decrypt, hashEmail } from './server/utils/crypto.js';

db.all("SELECT id, email_encrypted, email_hash, password_hash FROM users", (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Found ${rows.length} users:`);
    rows.forEach(row => {
        try {
            const email = decrypt(row.email_encrypted);
            const calculatedHash = hashEmail(email);
            console.log(`- ID: ${row.id}`);
            console.log(`  Email (decrypted): ${email}`);
            console.log(`  Stored Hash: ${row.email_hash}`);
            console.log(`  Calc Hash:   ${calculatedHash}`);
            console.log(`  Match? ${row.email_hash === calculatedHash}`);
            console.log(`  Pwd Hash: ${row.password_hash.substring(0, 10)}...`);
            console.log('---');
        } catch (e) {
            console.log(`- ID: ${row.id} (Decryption failed)`);
            console.log(`  Stored Hash: ${row.email_hash}`);
            console.log('---');
        }
    });
    process.exit(0);
});
