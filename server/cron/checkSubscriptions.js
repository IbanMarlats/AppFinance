import Stripe from 'stripe';
import db from '../db.js';
import cron from 'node-cron';
import dotenv from 'dotenv';

// Load env vars if not already loaded (though index.js does it)
dotenv.config({ path: 'server/.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

import { logEvent } from '../utils/logger.js';

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
                let reason = 'expired/invalid';
                const now = new Date();

                // 1. Basic flags
                const isGift = user.is_gift === 1 || user.is_gift === true || String(user.is_gift) === "1";
                const isLifetime = user.subscription_plan === 'lifetime' || 
                                 user.subscription_plan === 'gift_lifetime' || 
                                 user.subscription_plan === 'gift';

                // 2. Evaluation Logic (Ordered by precedence)
                
                // A. Lifetime is absolute protection
                if (isLifetime) {
                    shouldBePremium = true;
                    reason = 'lifetime_plan';
                } 
                // B. Gift flag is absolute protection
                else if (isGift) {
                    shouldBePremium = true;
                    reason = 'gift_flag';
                }
                // C. Manual expiry date (Primary manual override)
                else if (user.premium_until && new Date(user.premium_until) > now) {
                    shouldBePremium = true;
                    reason = `manual_expiry_future (${user.premium_until})`;
                }
                // D. Trial period
                else if (user.trial_until && new Date(user.trial_until) > now) {
                    shouldBePremium = true;
                    reason = `active_trial (${user.trial_until})`;
                }
                // E. Stripe Check (Last resort for payment-based plans)
                else if (user.stripe_customer_id) {
                    try {
                        const subscriptions = await stripe.subscriptions.list({
                            customer: user.stripe_customer_id,
                            status: 'all', 
                            limit: 5 
                        });

                        const activeSub = subscriptions.data.find(sub =>
                            ['active', 'trialing', 'past_due'].includes(sub.status)
                        );

                        if (activeSub) {
                            shouldBePremium = true;
                            reason = `stripe_active (${activeSub.status})`;
                        } else {
                            // If user was NOT a gift and NOT manually extended, and Stripe says inactive...
                            if (user.subscription_plan === 'annual') {
                                // Annual plans are often one-off payments (mode: payment)
                                // We keep them premium and rely on the premium_until date (which we now set in stripe.js)
                                // If premium_until is missing (legacy), we err on the side of caution.
                                shouldBePremium = true;
                                reason = 'stripe_annual_payment_assumed_active';
                            } else {
                                shouldBePremium = false; 
                                reason = `stripe_inactive (${subscriptions.data[0]?.status || 'none'})`;
                            }
                        }
                    } catch (stripeErr) {
                        console.error(`[SUBS] Stripe error for user ${user.id}:`, stripeErr.message);
                        // Safely keep premium if Stripe is unreachable to avoid accidental lock-outs
                        shouldBePremium = true;
                        reason = 'stripe_error_fallback';
                    }
                } else {
                    // No Stripe ID, no Gift flag, no future expiry date...
                    shouldBePremium = false;
                    reason = 'no_active_plan_found';
                }

                if (!shouldBePremium) {
                    console.log(`📉 [SUBS] Downgrading user ${user.id} to Free. Reason: ${reason}`);

                    await new Promise((resolve, reject) => {
                        db.run(
                            "UPDATE users SET is_premium = 0, subscription_plan = NULL WHERE id = ?",
                            [user.id],
                            (err) => err ? reject(err) : resolve()
                        );
                    });

                    // Log to Audit Logs
                    logEvent('SUBSCRIPTION_DOWNGRADE', `Automated downgrade to Free. Logic: ${reason}`, user.id);
                } else {
                    console.log(`✨ [SUBS] User ${user.id} remains Premium. Logic: ${reason}`);
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
