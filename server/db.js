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
    verification_token TEXT,
    role TEXT DEFAULT 'freelance',
    is_premium BOOLEAN DEFAULT 0,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  addColumnIfNotExists(db, 'users', 'role', "TEXT DEFAULT 'freelance'");
  addColumnIfNotExists(db, 'users', 'is_premium', "BOOLEAN DEFAULT 0");
  addColumnIfNotExists(db, 'users', 'last_login', "TEXT");
  addColumnIfNotExists(db, 'users', 'last_login', "TEXT");
  addColumnIfNotExists(db, 'users', 'created_at', "TEXT DEFAULT CURRENT_TIMESTAMP");
  addColumnIfNotExists(db, 'users', 'newsletter', "BOOLEAN DEFAULT 1");

  // Platforms
  db.run(`CREATE TABLE IF NOT EXISTS platforms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    taxRate REAL NOT NULL,
    fixed_fee REAL DEFAULT 0,
    user_id TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  addColumnIfNotExists(db, 'platforms', 'user_id', 'TEXT REFERENCES users(id)');
  addColumnIfNotExists(db, 'platforms', 'fixed_fee', 'REAL DEFAULT 0');

  // Incomes
  db.run(`CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    platformId TEXT,
    is_recurring BOOLEAN DEFAULT 0,
    tjm REAL,
    user_id TEXT,
    FOREIGN KEY(platformId) REFERENCES platforms(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  addColumnIfNotExists(db, 'incomes', 'user_id', 'TEXT REFERENCES users(id)');
  addColumnIfNotExists(db, 'incomes', 'is_recurring', 'BOOLEAN DEFAULT 0');
  addColumnIfNotExists(db, 'incomes', 'tjm', 'REAL');

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

  // User Settings Overrides
  db.run(`CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT,
    key TEXT,
    value TEXT,
    PRIMARY KEY (user_id, key),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Settings
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`, (err) => {
    if (!err) {
      const defaults = {
        tva_threshold: 36800,
        micro_threshold: 77700,
        urssaf_freelance: 25,
        urssaf_ecommerce: 12.3
      };
      Object.entries(defaults).forEach(([key, val]) => {
        db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [key, val]);
      });
    }
  });

  // Audit Logs
  db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    event_type TEXT,
    description TEXT,
    ip_address TEXT,
    created_at DATETIME
  )`);

  // Verification token index
  db.run("CREATE INDEX IF NOT EXISTS idx_verification_token ON users(verification_token)");
});

export default db;

