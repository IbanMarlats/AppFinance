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
  addColumnIfNotExists(db, 'users', 'subscription_plan', "TEXT"); // 'monthly', 'annual'
  addColumnIfNotExists(db, 'users', 'subscription_status', "TEXT"); // 'active', 'cancelled', 'expired'
  addColumnIfNotExists(db, 'users', 'premium_until', "TEXT");
  addColumnIfNotExists(db, 'users', 'reset_password_token', "TEXT");
  addColumnIfNotExists(db, 'users', 'reset_password_expires', "TEXT");
  addColumnIfNotExists(db, 'users', 'trial_until', "TEXT");
  addColumnIfNotExists(db, 'users', 'subscription_started_at', "TEXT");
  addColumnIfNotExists(db, 'users', 'is_gift', "BOOLEAN DEFAULT 0");
  addColumnIfNotExists(db, 'users', 'is_subject_vat', "BOOLEAN DEFAULT 0");
  addColumnIfNotExists(db, 'users', 'is_subject_vat', "BOOLEAN DEFAULT 0");
  addColumnIfNotExists(db, 'users', 'vat_start_date', "TEXT");
  addColumnIfNotExists(db, 'users', 'stripe_customer_id', "TEXT");
  addColumnIfNotExists(db, 'users', 'has_used_trial', "BOOLEAN DEFAULT 0");

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
  addColumnIfNotExists(db, 'platforms', 'fee_vat_rate', 'REAL DEFAULT 0');

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
  addColumnIfNotExists(db, 'incomes', 'is_recurring', 'BOOLEAN DEFAULT 0');
  addColumnIfNotExists(db, 'incomes', 'recurring_end_date', 'TEXT');
  addColumnIfNotExists(db, 'incomes', 'tjm', 'REAL');
  addColumnIfNotExists(db, 'incomes', 'cogs', 'REAL DEFAULT 0'); // Cost of Goods Sold
  addColumnIfNotExists(db, 'incomes', 'shipping_cost', 'REAL DEFAULT 0');
  addColumnIfNotExists(db, 'incomes', 'status', "TEXT DEFAULT 'confirmed'"); // confirmed, refunded, quote_sent, quote_signed

  // Artisan / Maker fields
  addColumnIfNotExists(db, 'incomes', 'material_cost', 'REAL DEFAULT 0');
  addColumnIfNotExists(db, 'incomes', 'hours_spent', 'REAL DEFAULT 0');

  // Creator / Influencer fields
  addColumnIfNotExists(db, 'incomes', 'channel_source', 'TEXT'); // Youtube, Twitch, Sponsor...
  addColumnIfNotExists(db, 'incomes', 'income_type', "TEXT DEFAULT 'active'"); // active, passive
  addColumnIfNotExists(db, 'incomes', 'invoice_date', 'TEXT'); // For payment delay calc

  // Service Provider fields
  addColumnIfNotExists(db, 'incomes', 'distance_km', 'REAL DEFAULT 0');

  // VAT Fields
  addColumnIfNotExists(db, 'incomes', 'vat_rate', 'REAL DEFAULT 0');
  addColumnIfNotExists(db, 'incomes', 'vat_amount', 'REAL DEFAULT 0');

  // Tax Category (BNC / BIC)
  addColumnIfNotExists(db, 'incomes', 'tax_category', "TEXT DEFAULT 'bnc'");

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
        urssaf_freelance: 25, // Fallback/Legacy
        urssaf_freelance_bnc: 23.1,
        urssaf_freelance_bic: 21.2,
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

  // Site Visits (Unique Visitors)
  db.run(`CREATE TABLE IF NOT EXISTS site_visits (
    id TEXT PRIMARY KEY,
    visitor_id TEXT,
    ip_hash TEXT,
    visited_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Index for fast counting
  db.run("CREATE INDEX IF NOT EXISTS idx_site_visits_visitor ON site_visits(visitor_id)");

  // Verification token index
  db.run("CREATE INDEX IF NOT EXISTS idx_verification_token ON users(verification_token)");

  // Goals Table
  db.run(`CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT, -- 'revenue' or 'expense'
    period TEXT, -- 'year' or 'month'
    target_amount REAL,
    period_key TEXT, -- '2025' or '2025-01'
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, type, period, period_key)
  )`);
});

export default db;

