import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
        process.exit(1);
    }
    console.log('Connected to database');
});

db.serialize(() => {
    // 1. Ensure column exists (in case server didn't restart yet)
    db.run("ALTER TABLE users ADD COLUMN is_gift BOOLEAN DEFAULT 0", (err) => {
        if (!err) console.log("Added is_gift column");
        else console.log("is_gift column likely exists");

        // 2. Migrate existing 'gift' plans
        db.all("SELECT id FROM users WHERE subscription_plan = 'gift'", (err, rows) => {
            if (err) return console.error(err);

            if (rows.length > 0) {
                console.log(`Migrating ${rows.length} 'gift' users to 'lifetime' + is_gift=1...`);
                // Defaulting previous 'gift' generic plan to 'lifetime' + gift flag
                db.run("UPDATE users SET subscription_plan = 'lifetime', is_gift = 1 WHERE subscription_plan = 'gift'", function (err) {
                    if (err) console.error("Migration failed:", err);
                    else console.log(`Migrated ${this.changes} users.`);
                    db.close();
                });
            } else {
                console.log("No legacy 'gift' plans found to migrate.");
                db.close();
            }
        });
    });
});
