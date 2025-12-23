const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'server/database.sqlite');
const db = new sqlite3.Database(dbPath);

const DEFAULTS = [
    { name: 'Prospection', color: '#f59e0b' }, // Amber
    { name: 'Serveur', color: '#64748b' }, // Slate
    { name: 'URSSAF', color: '#6366f1' } // Indigo
];

console.log("Seeding default categories...");

db.all("SELECT id FROM users", [], (err, users) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    if (users.length === 0) {
        console.log("No users.");
        db.close();
        return;
    }

    const tasks = [];
    users.forEach(user => {
        DEFAULTS.forEach(def => {
            tasks.push(new Promise((resolve) => {
                const { name, color } = def;
                db.get("SELECT id FROM expense_categories WHERE user_id = ? AND name = ?", [user.id, name], (err, row) => {
                    if (row) {
                        resolve();
                        return;
                    }
                    const id = crypto.randomUUID();
                    console.log(`Adding ${name} for user ${user.id}`);
                    db.run(
                        "INSERT INTO expense_categories (id, name, color, user_id) VALUES (?, ?, ?, ?)",
                        [id, name, color, user.id],
                        (err) => resolve()
                    );
                });
            }));
        });
    });

    Promise.all(tasks).then(() => {
        console.log("All done.");
        db.close();
    });
});
