
import db from './server/db.js';

const now = new Date();
const fourHoursAgo = new Date(now.getTime() - (4 * 60 * 60 * 1000)).toISOString();

console.log(`Checking for downgrades since ${fourHoursAgo}...`);

db.all(
    "SELECT * FROM audit_logs WHERE event_type = 'SUBSCRIPTION_DOWNGRADE' AND created_at >= ? ORDER BY created_at DESC", 
    [fourHoursAgo], 
    (err, rows) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Found ${rows.length} downgrade logs:`);
        rows.forEach(row => {
            console.log(`- [${row.created_at}] User ${row.user_id}: ${row.description}`);
        });
        
        if (rows.length > 0) {
            const userIds = [...new Set(rows.map(r => r.user_id))];
            console.log(`\nChecking details for affected users: ${userIds.join(', ')}`);
            db.all(
                "SELECT id, email_encrypted, is_premium, subscription_plan, premium_until, is_gift FROM users WHERE id IN (" + userIds.map(() => '?').join(',') + ")",
                userIds,
                (err, users) => {
                    if (err) {
                        console.error(err);
                        process.exit(1);
                    }
                    users.forEach(u => {
                        console.log(`- User ${u.id}: Premium=${u.is_premium}, Plan=${u.subscription_plan}, Until=${u.premium_until}, Gift=${u.is_gift}`);
                    });
                    process.exit(0);
                }
            );
        } else {
            process.exit(0);
        }
    }
);
