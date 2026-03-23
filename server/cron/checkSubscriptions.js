import Stripe from 'stripe';
import db from '../db.js';
import cron from 'node-cron';
import dotenv from 'dotenv';

// Load env vars if not already loaded (though index.js does it)
dotenv.config({ path: 'server/.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const checkSubscriptions = async () => {
    console.log('🔄 Checking subscription status with Stripe...');

    db.all("SELECT id, email_encrypted, stripe_customer_id, trial_until, subscription_plan, premium_until, is_gift FROM users WHERE is_premium = 1", async (err, users) => {
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
                const now = new Date();

                // 1. Check Manual Overrides first
                if (user.subscription_plan === 'lifetime' || user.is_gift === 1) {
                    shouldBePremium = true;
                } 
                // 2. Check manual expiry / trial dates
                else if (user.premium_until && new Date(user.premium_until) > now) {
                    shouldBePremium = true;
                }
                else if (user.trial_until && new Date(user.trial_until) > now) {
                    shouldBePremium = true;
                }
                // 3. Check Stripe if customer ID exists (and no manual override found)
                else if (user.stripe_customer_id) {
                    try {
                        const subscriptions = await stripe.subscriptions.list({
                            customer: user.stripe_customer_id,
                            status: 'all', 
                            limit: 3
                        });

                        const activeSub = subscriptions.data.find(sub =>
                            ['active', 'trialing', 'past_due'].includes(sub.status)
                        );

                        if (activeSub) {
                            shouldBePremium = true;
                        } else {
                            console.log(`User ${user.id}: No active Stripe subscription found.`);
                        }
                    } catch (stripeErr) {
                        console.error(`Stripe error for user ${user.id}:`, stripeErr.message);
                        // Safely keep premium if Stripe is unreachable to avoid accidental lock-outs
                        shouldBePremium = true;
                    }
                } else {
                    console.log(`User ${user.id}: No Stripe ID and all manual plans expired.`);
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
