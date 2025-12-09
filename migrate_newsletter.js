
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log('Running Newsletter Migration...');

db.serialize(() => {
    // Add column if not exists
    db.run("ALTER TABLE users ADD COLUMN newsletter BOOLEAN DEFAULT 1", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column newsletter already exists.');
            } else {
                console.error('Error adding column:', err.message);
                return;
            }
        } else {
            console.log('Column newsletter added.');
        }

        // Backfill existing users (ensure they are 1)
        db.run("UPDATE users SET newsletter = 1 WHERE newsletter IS NULL", (err) => {
            if (err) console.error("Error backfilling:", err);
            else console.log(`Backfilled newsletter=1 for matches.`);
        });
    });
});
