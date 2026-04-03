
import db from './db.js';
import { checkSubscriptions } from './cron/checkSubscriptions.js';

// Setup a test user
const testUserId = 'test-annual-user-' + Date.now();

console.log(`Setting up test user: ${testUserId}`);

db.run(
    "INSERT INTO users (id, email_hash, email_encrypted, password_hash, is_premium, subscription_plan, stripe_customer_id, is_gift) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [testUserId, 'hash_'+testUserId, 'enc_'+testUserId, 'pass', 1, 'annual', 'cus_mock_annual', 0],
    async (err) => {
        if (err) {
            console.error("Setup failed:", err);
            process.exit(1);
        }

        console.log("User created. Running checkSubscriptions...");

        // Note: Stripe check will naturally fail for 'cus_mock_annual' 
        // but our new logic should catch 'annual' plan type and keep it premium.
        
        try {
            await checkSubscriptions();
            
            // Check result
            db.get("SELECT is_premium, subscription_plan FROM users WHERE id = ?", [testUserId], (err, row) => {
                if (err) console.error(err);
                
                if (row.is_premium === 1) {
                    console.log("✅ SUCCESS: User remained premium despite mock Stripe ID.");
                } else {
                    console.error("❌ FAILURE: User was downgraded!");
                }

                // Cleanup
                db.run("DELETE FROM users WHERE id = ?", [testUserId], () => {
                    console.log("Test user cleaned up. Exiting.");
                    process.exit();
                });
            });
        } catch (e) {
            console.error("Execution error:", e);
            process.exit(1);
        }
    }
);
