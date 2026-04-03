
import db from './db.js';

console.log("Searching for users with subscription_plan set but is_premium = 0...");

db.all("SELECT id, subscription_plan, is_premium, premium_until, is_gift, stripe_customer_id FROM users WHERE (subscription_plan IS NOT NULL AND is_premium = 0) OR (is_gift = 1 AND is_premium = 0)", [], (err, rows) => {
    if (err) {
        console.error("DB Error:", err);
    } else {
        console.log(`Found ${rows.length} users in 'broken' state.`);
        rows.forEach(row => {
            console.log(`- User: ${row.id} | Plan: ${row.subscription_plan} | Gift: ${row.is_gift} | Stripe: ${row.stripe_customer_id} | Until: ${row.premium_until}`);
        });
    }
    process.exit();
});
