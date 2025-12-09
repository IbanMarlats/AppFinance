
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log('Setting last_login to NOW for all users...');

db.run("UPDATE users SET last_login = ?", [new Date().toISOString()], function (err) {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Rows updated: ${this.changes}`);
});
