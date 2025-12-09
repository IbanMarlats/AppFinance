
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

db.all("SELECT id, role, is_premium FROM users", (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("Users found:", rows.length);
    rows.forEach(r => {
        console.log(`ID: ${r.id}, Role: ${r.role}, Premium: ${r.is_premium}`);
    });
});
