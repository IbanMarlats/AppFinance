
import db from './db.js';

console.log("Checking for SUBSCRIPTION_DOWNGRADE events in audit_logs...");

db.all("SELECT * FROM audit_logs WHERE event_type = 'SUBSCRIPTION_DOWNGRADE' ORDER BY created_at DESC LIMIT 20", [], (err, rows) => {
    if (err) {
        console.error("DB Error fetching audit logs:", err);
    } else {
        console.log(`Found ${rows.length} recent downgrades:`);
        rows.forEach(row => {
            console.log(`[${row.created_at}] User ID: ${row.user_id} | Reason: ${row.description}`);
        });
    }

    console.log("\nChecking for users with is_gift=1 but is_premium=0...");
    db.all("SELECT id, is_gift, is_premium, subscription_plan, premium_until FROM users WHERE is_gift = 1 AND is_premium = 0", [], (err, rows) => {
        if (err) {
            console.error("DB Error fetching users:", err);
        } else {
            console.log(`Found ${rows.length} users with is_gift=1 but NO premium.`);
            rows.forEach(row => {
                console.log(`User ID: ${row.id} | Plan: ${row.subscription_plan} | Until: ${row.premium_until}`);
            });
        }
        process.exit();
    });
});
