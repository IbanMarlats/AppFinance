import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(process.cwd(), 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log("Dumping all user subscription states...");

db.all("SELECT id, is_premium, is_gift, subscription_plan, premium_until, trial_until FROM users", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`Total users: ${rows.length}`);
        const premium = rows.filter(r => r.is_premium === 1);
        const gifts = rows.filter(r => r.is_gift === 1 || String(r.is_gift) === "1");
        console.log(`Premium: ${premium.length}, Gifts: ${gifts.length}`);
        
        // Show some users
        console.log("Sample users:");
        console.log(JSON.stringify(rows.slice(0, 10), null, 2));
    }
    db.close();
});
