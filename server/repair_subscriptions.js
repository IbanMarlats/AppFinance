import db from './db.js';
import { logEvent } from './utils/logger.js';

async function repair() {
    console.log("🛠 Starting subscription repair...");

    // Find users who:
    // 1. Have is_gift = 1 but are NOT premium
    // 2. OR have a subscription_plan but are NOT premium (except if it was explicitly cancelled/expired correctly)
    // Actually, following the user's report, almost all manual grants have is_gift=1.
    
    db.all("SELECT id, is_premium, is_gift, subscription_plan, premium_until FROM users WHERE is_premium = 0 AND (is_gift = 1 OR subscription_plan IS NOT NULL)", async (err, users) => {
        if (err) {
            console.error("❌ Error fetching users:", err);
            return;
        }

        if (users.length === 0) {
            console.log("✅ No broken users found.");
            process.exit(0);
        }

        console.log(`🔍 Found ${users.length} users to potentially restore.`);

        for (const user of users) {
            try {
                // For users with is_gift = 1, we restore them as 'premium_restored' if plan is missing
                const newPlan = user.subscription_plan || 'premium_restored';
                
                console.log(`♻️ Restoring user ${user.id} to Premium (${newPlan})...`);
                
                await new Promise((resolve, reject) => {
                    db.run(
                        "UPDATE users SET is_premium = 1, subscription_plan = ? WHERE id = ?",
                        [newPlan, user.id],
                        (err) => err ? reject(err) : resolve()
                    );
                });

                logEvent('SUBSCRIPTION_RESTORED', `Manual restoration of premium status. Previous plan: ${user.subscription_plan}`, user.id);
            } catch (error) {
                console.error(`❌ Failed to restore user ${user.id}:`, error.message);
            }
        }

        console.log("✅ Repair complete.");
        process.exit(0);
    });
}

repair();
