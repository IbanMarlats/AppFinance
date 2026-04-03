
import db from './db.js';

console.log("Checking audit logs for SUBSCRIPTION_DOWNGRADE events...");

db.all("SELECT * FROM audit_logs WHERE event_type = 'SUBSCRIPTION_DOWNGRADE' ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
        console.error("DB Error:", err);
    } else {
        console.log(`Found ${rows.length} total downgrades.`);
        rows.forEach(row => {
            console.log(`[${row.created_at}] User: ${row.user_id} | Reason: ${row.description}`);
        });
    }
    process.exit();
});
