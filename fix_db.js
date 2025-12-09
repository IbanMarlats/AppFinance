
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log('Attempting to add created_at column (nullable)...');

const now = new Date().toISOString();

db.serialize(() => {
    db.run("ALTER TABLE users ADD COLUMN created_at TEXT", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column already exists.');
            } else {
                console.error('Error adding column:', err.message);
                return;
            }
        } else {
            console.log('Column created_at added successfully.');
        }

        // Backfill
        console.log('Backfilling created_at for existing users...');
        db.run("UPDATE users SET created_at = ? WHERE created_at IS NULL", [now], function (err) {
            if (err) console.error("Error backfilling:", err);
            else console.log(`Updated ${this.changes} rows.`);
        });
    });
});
