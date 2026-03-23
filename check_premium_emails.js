import { decrypt } from './server/utils/crypto.js';
import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('server/database.sqlite');

db.all('SELECT id, email_encrypted, is_premium, is_gift FROM users WHERE is_premium = 1 OR is_gift = 1', (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log('--- RECIPIENTS START ---');
    rows.forEach(r => {
        try {
            console.log(`FULL_ID:${r.id}|Email:${decrypt(r.email_encrypted)}|Premium:${r.is_premium}|Gift:${r.is_gift}`);
        } catch (e) {
            console.log(`FULL_ID:${r.id}|Email(Enc):${r.email_encrypted}|Premium:${r.is_premium}|Gift:${r.is_gift} (Decryption failed)`);
        }
    });
    console.log('--- RECIPIENTS END ---');
    db.close();
});
