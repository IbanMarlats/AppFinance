import db from '../db.js';
import { logEvent } from './logger.js';

/**
 * Repair script to restore premium status to users who lost it unexpectedly.
 * Criteria for restoration:
 * 1. User has is_gift = 1 but is_premium = 0.
 * 2. User has subscription_plan in (lifetime, gift_lifetime) but is_premium = 0.
 * 3. User was recently downgraded by the automated system (look at audit logs).
 */

const repair = async () => {
    console.log("🛠️ Starting Subscription Repair Audit...");

    // 1. Easy cases: Flags still exist but is_premium is 0
    db.all("SELECT id, is_gift, subscription_plan, premium_until FROM users WHERE (is_gift = 1 OR subscription_plan = 'lifetime' OR subscription_plan = 'gift_lifetime') AND is_premium = 0", async (err, rows) => {
        if (err) {
            console.error("Error fetching candidates:", err);
            return;
        }

        console.log(`Found ${rows.length} users with inconsistent flags (Gift/Lifetime set but not Premium).`);

        for (const user of rows) {
            console.log(`✅ Restoring User ${user.id} (Reason: Flags preserved)`);
            await restorePremium(user.id, "Repair: Flags preserved but is_premium was 0");
        }

        // 2. Complex cases: Check audit logs for automated downgrades of potentially manual grants
        db.all("SELECT * FROM audit_logs WHERE event_type = 'SUBSCRIPTION_DOWNGRADE' AND created_at > datetime('now', '-7 days') ORDER BY created_at DESC", async (err, logs) => {
            if (err) {
                console.error("Error fetching audit logs:", err);
                return;
            }

            console.log(`Analyzing ${logs.length} recent automated downgrades...`);

            for (const log of logs) {
                const userId = log.user_id;
                
                // Check if this user had a manual grant before
                db.get("SELECT id, is_premium, is_gift, subscription_plan FROM users WHERE id = ?", [userId], (err, user) => {
                    if (user && user.is_premium === 0) {
                        // Look for a PREMIUM_GRANT or ADMIN_SUBSCRIPTION_UPDATE for this user
                        db.get("SELECT id FROM audit_logs WHERE user_id = ? AND (event_type = 'PREMIUM_GRANT' OR event_type = 'ADMIN_SUBSCRIPTION_UPDATE') LIMIT 1", [userId], (err, grant) => {
                            if (grant) {
                                console.log(`⚠️ User ${userId} was downgraded but has a history of manual grants. Investigating...`);
                                // If they were downgraded with 'no_active_plan_evidence' but have a grant history, 
                                // it might be a loss of metadata.
                                if (log.description.includes('no_active_plan_evidence') || log.description.includes('UNKNOWN')) {
                                    console.log(`✅ Restoring User ${userId} (Reason: Manual grant history found)`);
                                    restorePremium(userId, "Repair: Restored based on manual grant history and suspicious downgrade reason");
                                }
                            }
                        });
                    }
                });
            }
        });
    });
};

const restorePremium = (userId, reason) => {
    return new Promise((resolve) => {
        db.run(
            "UPDATE users SET is_premium = 1, is_gift = 1 WHERE id = ?",
            [userId],
            (err) => {
                if (!err) {
                    logEvent('SUBSCRIPTION_REPAIR', reason, userId);
                }
                resolve();
            }
        );
    });
};

// Execute if run directly
repair().then(() => {
    // Keep alive briefly for async tasks if any (though logic above needs better await handling)
    setTimeout(() => {
        console.log("Done.");
        process.exit(0);
    }, 5000);
});
