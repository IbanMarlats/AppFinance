
import db from './server/db.js';
import { logEvent } from './server/utils/logger.js';

async function restore() {
    console.log("🔍 Searching for victims of the subscription bug...");
    
    // We look for users who are currently FREE but have metadata suggesting they were Premium
    db.all("SELECT id, is_premium, stripe_customer_id, trial_until, premium_until, is_gift, subscription_plan FROM users WHERE is_premium = 0", async (err, users) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }

        const victims = users.filter(u => 
            u.stripe_customer_id !== null || 
            u.is_gift === 1 || 
            u.trial_until !== null || 
            u.premium_until !== null ||
            (u.subscription_plan && u.subscription_plan !== '')
        );

        console.log(`Found ${victims.length} potential victims to restore.`);

        for (const user of victims) {
            console.log(`✅ Restoring Premium for user ${user.id} (Reason: Found metadata: StripeID=${user.stripe_customer_id}, Trial=${user.trial_until}, Expiry=${user.premium_until})`);
            
            await new Promise((resolve) => {
                db.run(
                    "UPDATE users SET is_premium = 1, is_gift = 1, premium_until = ? WHERE id = ?",
                    [new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), user.id], // 1 year buffer
                    (err) => {
                        if (err) console.error(`Failed to restore user ${user.id}:`, err.message);
                        else logEvent('SUBSCRIPTION_RESTORE', 'Restored from bug. Logic: Evidence of previous premium found.', user.id);
                        resolve();
                    }
                );
            });
        }

        console.log("🏁 Restoration complete.");
        process.exit(0);
    });
}

restore();
