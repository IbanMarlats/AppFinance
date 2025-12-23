const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'server/database.sqlite');
const db = new sqlite3.Database(dbPath);

const DEFAULTS = [
    { name: 'Malt', taxRate: 10, fixed_fee: 0, fee_vat_rate: 20, color: '#ef4444' },
    { name: 'Freework', taxRate: 0, fixed_fee: 0, fee_vat_rate: 0, color: '#3b82f6' },
    { name: 'Hors Plateforme', taxRate: 0, fixed_fee: 0, fee_vat_rate: 0, color: '#64748b' }
];

console.log("Seeding default platforms...");

db.all("SELECT id FROM users", [], (err, users) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    let pending = 0;
    if (users.length === 0) {
        console.log("No users.");
        db.close();
        return;
    }

    // Force at least 1 pending to keep alive until loop starts
    // Actually simpler logic:

    const tasks = [];
    users.forEach(user => {
        DEFAULTS.forEach(def => {
            tasks.push(new Promise((resolve) => {
                const { name, taxRate, fixed_fee, fee_vat_rate, color } = def;
                db.get("SELECT id FROM platforms WHERE user_id = ? AND name = ?", [user.id, name], (err, row) => {
                    if (row) {
                        resolve();
                        return;
                    }
                    const id = crypto.randomUUID();
                    console.log(`Adding ${name} for user ${user.id}`);
                    db.run(
                        "INSERT INTO platforms (id, name, taxRate, fixed_fee, fee_vat_rate, color, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        [id, name, taxRate, fixed_fee, fee_vat_rate, color, user.id],
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
