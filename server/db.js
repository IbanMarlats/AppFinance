import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database.sqlite');
const sqlite = sqlite3.verbose();

const db = new sqlite.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

db.serialize(() => {
    // Platforms
    db.run(`CREATE TABLE IF NOT EXISTS platforms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    taxRate REAL NOT NULL
  )`);

    // Incomes
    db.run(`CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    platformId TEXT,
    FOREIGN KEY(platformId) REFERENCES platforms(id)
  )`);

    // Expenses
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL
  )`);

    // Seed default platform if empty
    db.get("SELECT count(*) as count FROM platforms", [], (err, row) => {
        if (row && row.count === 0) {
            console.log('Seeding default platforms...');
            const stmt = db.prepare("INSERT INTO platforms (id, name, taxRate) VALUES (?, ?, ?)");
            stmt.run(crypto.randomUUID(), 'Malt', 10);
            stmt.run(crypto.randomUUID(), 'Upwork', 20);
            stmt.run(crypto.randomUUID(), 'Direct', 0);
            stmt.finalize();
        }
    });
});

export default db;
