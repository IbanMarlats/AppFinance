import Stripe from 'stripe';
import db from '../db.js';
import cron from 'node-cron';
import dotenv from 'dotenv';

// Load env vars if not already loaded (though index.js does it)
dotenv.config({ path: 'server/.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const checkSubscriptions = async () => {
    console.log('🔄 Checking subscription status with Stripe...');

    db.all("SELECT id, email_encrypted, stripe_customer_id, trial_until FROM users WHERE is_premium = 1", async (err, users) => {
        if (err) {
            console.error('❌ Error fetching users:', err);
            return;
        }

        if (users.length === 0) {
            console.log('No premium users to check.');
            return;
        }

        console.log(`Checking ${users.length} premium users...`);

        for (const user of users) {
            try {
                let shouldBePremium = false;

                // 1. Check Stripe if customer ID exists
                if (user.stripe_customer_id) {
                    try {
                        const subscriptions = await stripe.subscriptions.list({
                            customer: user.stripe_customer_id,
                            status: 'all', // Fetch all to see what's going on
                            limit: 3
                        });

                        // We consider the user premium if they have at least one subscription that is:
                        // - active (paid)
                        // - trialing
                        // - past_due (grace period, usually give access)
                        const activeSub = subscriptions.data.find(sub =>
                            ['active', 'trialing', 'past_due'].includes(sub.status)
                        );

                        if (activeSub) {
                            shouldBePremium = true;
                            // Optionally update expiry if we wanted to sync trial_until, but simplified logic first
                        } else {
                            console.log(`User ${user.id}: No active Stripe subscription found.`);
                        }
                    } catch (stripeErr) {
                        console.error(`Stripe error for user ${user.id}:`, stripeErr.message);
                        // If stripe error (e.g. invalid customer ID), strict safety might stay premium, 
                        // but usually invalid ID means no sub. Let's assume keep premium to safely avoid accidental cut-off on network error?
                        // Re-reading user issue: "le compte admin était en test...".
                        // If invalid ID, it's safer to downgrade IF we trust the local DB is messy.
                        // But let's keep current state if Stripe errors to avoid nuking users during downtime.
                        shouldBePremium = true;
                    }
                } else {
                    // No stripe ID? Check manual trial date
                    // If trial_until is valid and in the future
                    if (user.trial_until && new Date(user.trial_until) > new Date()) {
                        shouldBePremium = true;
                    } else {
                        console.log(`User ${user.id}: No Stripe ID and trial expired.`);
                    }
                }

                if (!shouldBePremium) {
                    console.log(`📉 Downgrading user ${user.id} to Free.`);

                    await new Promise((resolve, reject) => {
                        db.run(
                            "UPDATE users SET is_premium = 0, subscription_plan = NULL WHERE id = ?",
                            [user.id],
                            (err) => err ? reject(err) : resolve()
                        );
                    });
                }

            } catch (error) {
                console.error(`Error processing user ${user.id}:`, error.message);
            }
        }
        console.log('✅ Subscription check complete.');
    });
};

export const initSubscriptionCron = () => {
    // Run on startup
    checkSubscriptions();

    // Run every night at 3 AM
    cron.schedule('0 3 * * *', () => {
        checkSubscriptions();
    });
};
