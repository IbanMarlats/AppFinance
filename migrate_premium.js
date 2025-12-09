
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log('Migrating admins to premium...');

db.run("UPDATE users SET is_premium = 1 WHERE role = 'admin'", function (err) {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Rows updated: ${this.changes}`);
});
