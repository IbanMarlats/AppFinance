import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(process.cwd(), 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log("Dumping all users to see their status...");

db.all("SELECT id, role, is_premium, is_gift, subscription_plan FROM users", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.table(rows);
    }
    db.close();
});
