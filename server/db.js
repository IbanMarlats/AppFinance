import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

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

function addColumnIfNotExists(db, tableName, columnName, columnDef) {
  db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
    if (err) {
      console.error(`Error checking info for ${tableName}:`, err);
      return;
    }
    const exists = rows.some(row => row.name === columnName);
    if (!exists) {
      console.log(`Adding ${columnName} to ${tableName}...`);
      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`, (err) => {
        if (err) console.error(`Failed to add ${columnName} to ${tableName}`, err);
      });
    }
  });
}

db.serialize(() => {
  // Users Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email_encrypted TEXT NOT NULL,
    email_hash TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT 0,
    verification_token TEXT
  )`);

  // Platforms
  db.run(`CREATE TABLE IF NOT EXISTS platforms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    taxRate REAL NOT NULL,
    user_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  addColumnIfNotExists(db, 'platforms', 'user_id', 'TEXT REFERENCES users(id)');

  // Incomes
  db.run(`CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    platformId TEXT,
    is_recurring BOOLEAN DEFAULT 0,
    user_id TEXT,
    FOREIGN KEY(platformId) REFERENCES platforms(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  addColumnIfNotExists(db, 'incomes', 'user_id', 'TEXT REFERENCES users(id)');
  addColumnIfNotExists(db, 'incomes', 'is_recurring', 'BOOLEAN DEFAULT 0');

  // Expenses
  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    category TEXT,
    is_recurring BOOLEAN DEFAULT 0,
    user_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  addColumnIfNotExists(db, 'expenses', 'user_id', 'TEXT REFERENCES users(id)');
  addColumnIfNotExists(db, 'expenses', 'category', 'TEXT');
  addColumnIfNotExists(db, 'expenses', 'is_recurring', 'BOOLEAN DEFAULT 0');

  // Expense Categories
  db.run(`CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    user_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  addColumnIfNotExists(db, 'expense_categories', 'user_id', 'TEXT REFERENCES users(id)');

  // SEEDING (Only if platforms empty) - Kept simple but generic (no user_id initially)
  // NOTE: In multi-user app, seeding global data might be weird. 
  // We will leave this for now, but newly created users won't see these unless we assign them.
});

export default db;

