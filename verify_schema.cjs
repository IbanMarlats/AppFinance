
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(incomes)", (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    const columns = rows.map(r => r.name);
    const expected = ['product_ref', 'unit_price', 'quantity', 'unit_cost', 'shipping_fees', 'transaction_fees'];

    const missing = expected.filter(c => !columns.includes(c));

    if (missing.length > 0) {
        console.log("❌ Missing columns:", missing);
    } else {
        console.log("✅ All e-commerce columns present!");
    }

    // Also check default user role if we want, but schema is main priority
    db.close();
});
