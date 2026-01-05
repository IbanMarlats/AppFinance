
import db from './server/db.js';
import { hashEmail } from './server/utils/crypto.js';

const email = 'iban.marlats@gmail.com';

db.get("SELECT id FROM users WHERE email_hash = ?", [hashEmail(email)], async (err, user) => {
    if (err || !user) {
        console.error("User not found");
        return;
    }
    db.run("UPDATE users SET declaration_frequency = 'monthly' WHERE id = ?", [user.id], (err) => {
        if (err) console.error("Error updating", err);
        else console.log(`User ${email} reset to MONTHLY successfully.`);
    });
});
