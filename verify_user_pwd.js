
import db from './server/db.js';
import bcrypt from 'bcryptjs';
import { hashEmail } from './server/utils/crypto.js';

const email = 'iban.marlats@gmail.com';
const passwordToTest = 'Im23093128*1881';

console.log('Testing password for email:', email);

db.get("SELECT password_hash FROM users WHERE email_hash = ?", [hashEmail(email)], async (err, user) => {
    if (err) {
        console.error('DB Error:', err);
        process.exit(1);
    }
    if (!user) {
        console.error('User not found in DB!');
        process.exit(1);
    }

    console.log('User found. Hash:', user.password_hash);
    const isValid = await bcrypt.compare(passwordToTest, user.password_hash);
    console.log('Is password valid?', isValid);
    
    if (!isValid) {
        console.log('The password provided by the user does NOT match the hash in the DB.');
    } else {
        console.log('The password matches the hash. The issue might be elsewhere (e.g. frontend sending wrong data or session issue).');
    }
    process.exit(0);
});
