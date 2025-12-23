
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log('Running expenses schema migration...');

const columns = [
    { name: 'vat_rate', type: 'REAL' },
    { name: 'vat_amount', type: 'REAL' },
    { name: 'frequency', type: "TEXT DEFAULT 'monthly'" }
];

db.serialize(() => {
    columns.forEach(col => {
        db.run(`ALTER TABLE expenses ADD COLUMN ${col.name} ${col.type}`, (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log(`Column ${col.name} already exists.`);
                } else {
                    console.error(`Error adding column ${col.name}:`, err.message);
                }
            } else {
                console.log(`Column ${col.name} added successfully.`);
            }
        });
    });
});
