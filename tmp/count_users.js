import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(process.cwd(), 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log(`TOTAL USERS IN DB: ${row.count}`);
    }
    db.close();
});
