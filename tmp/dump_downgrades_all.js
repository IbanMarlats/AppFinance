import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(process.cwd(), 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log("Analyzing all subscription downgrades...");

db.all("SELECT user_id, description, created_at FROM audit_logs WHERE event_type = 'SUBSCRIPTION_DOWNGRADE' ORDER BY created_at DESC", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log(`Found ${rows.length} total automated downgrades.`);
        rows.forEach(r => {
            console.log(`- ${r.user_id} on ${r.created_at} | Reason: ${r.description}`);
        });
    }
    db.close();
});
