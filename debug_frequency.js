
import db from './server/db.js';
import { hashEmail } from './server/utils/crypto.js';

const email = 'iban.marlats@gmail.com';

setTimeout(() => {
    db.get("SELECT id, declaration_frequency FROM users WHERE email_hash = ?", [hashEmail(email)], (err, row) => {
        if (err) console.error(err);
        else console.log('Frequency:', row);
    });
}, 1000);
