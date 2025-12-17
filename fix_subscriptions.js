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
    // 1. Check current state
    db.all("SELECT id, email_encrypted, is_premium, subscription_plan FROM users WHERE is_premium = 1", (err, rows) => {
        if (err) console.error(err);
        console.log("Before update:", rows);

        // 2. Update
        db.run("UPDATE users SET subscription_plan = 'gift' WHERE is_premium = 1 AND subscription_plan IN ('monthly', 'annual')", function (err) {
            if (err) {
                console.error("Update failed:", err);
            } else {
                console.log(`Updated ${this.changes} users to 'gift' plan.`);

                // 3. Verify
                db.all("SELECT id, email_encrypted, is_premium, subscription_plan FROM users WHERE is_premium = 1", (err, finalRows) => {
                    console.log("After update:", finalRows);
                    db.close();
                });
            }
        });
    });
});
