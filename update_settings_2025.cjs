const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server/database.sqlite');

const settings2025 = {
    'tva_threshold': '37500',
    'tva_threshold_sell': '85000',
    'micro_threshold': '77700',
    'micro_threshold_sell': '188700',
    'urssaf_freelance': '24.8',
    'urssaf_freelance_bnc': '24.8',
    'urssaf_freelance_bic': '21.4',
    'urssaf_ecommerce': '12.4'
};

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not open database', err);
        process.exit(1);
    }
    console.log('Connected to database at', dbPath);
    db.configure('busyTimeout', 5000);
});

db.serialize(() => {
    console.log("Updating Global Settings to 2025 values...");

    const stmtCheck = db.prepare("SELECT value FROM settings WHERE key = ?");
    const stmtUpdate = db.prepare("UPDATE settings SET value = ? WHERE key = ?");
    const stmtInsert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");

    let count = 0;
    const total = Object.keys(settings2025).length;

    Object.entries(settings2025).forEach(([key, value]) => {
        db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
            if (err) console.error(err);

            if (row) {
                console.log(`Updating ${key}: ${row.value} -> ${value}`);
                stmtUpdate.run(value, key);
            } else {
                console.log(`Inserting ${key}: ${value}`);
                stmtInsert.run(key, value);
            }
            count++;
            if (count === total) {
                console.log("All operations queued.");
            }
        });
    });
});

// Wait briefly for operations (sqlite3 is async but serialized here)
// Better logic: wrap in promise or just wait for exit.
// Given serialized, it should run in order.
setTimeout(() => {
    console.log("Closing...");
    db.close();
}, 2000);
