import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(process.cwd(), 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log("Checking for 'phantom' premium users (should be premium but aren't)...");

db.all("SELECT id, email_encrypted, subscription_plan, is_premium, is_gift, premium_until FROM users WHERE (is_gift = 1 OR subscription_plan = 'lifetime' OR subscription_plan = 'annual') AND is_premium = 0", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`Found ${rows.length} users who lost premium despite having gift/lifetime/annual flags.`);
        console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
});
