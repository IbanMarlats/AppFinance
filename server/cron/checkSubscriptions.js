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
                const isGift = Boolean(user.is_gift) || user.is_gift === 1 || String(user.is_gift) === "1";
                const isLifetime = user.subscription_plan === 'lifetime' || 
                                 user.subscription_plan === 'gift_lifetime' || 
                                 user.subscription_plan === 'gift' ||
                                 user.subscription_plan === 'premium_lifetime';

                // 2. Evaluation Logic (Ordered by precedence)
                
                // A. Lifetime or Gift flag are ABSOLUTE protections
                if (isLifetime || isGift) {
                    shouldBePremium = true;
                    reason = isLifetime ? `LIFETIME_PROTECTED (${user.subscription_plan})` : 'GIFT_FLAG_PROTECTED';
                } 
                // B. Manual expiry date (Primary manual override)
                else if (user.premium_until && new Date(user.premium_until) > now) {
                    shouldBePremium = true;
                    reason = `MANUAL_EXPIRY_FUTURE (until ${user.premium_until})`;
                }
                // C. Trial period
                else if (user.trial_until && new Date(user.trial_until) > now) {
                    shouldBePremium = true;
                    reason = `TRIAL_ACTIVE (until ${user.trial_until})`;
                }
                // D. Stripe Check (Last resort for payment-based plans)
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
                            reason = `STRIPE_CHECK_SUCCESS (${activeSub.status})`;
                        } else {
                            // EXTRA SAFETY: Even if Stripe says inactive, if they have a recognized plan string 
                            // we stay premium if premium_until is missing or in future.
                            // We add 'premium_restored' to this list for absolute safety.
                            const recognizedPlans = ['annual', 'lifetime', 'monthly', 'premium', 'premium_restored'];
                            if (recognizedPlans.includes(user.subscription_plan)) {
                                if (!user.premium_until || new Date(user.premium_until) > now) {
                                    shouldBePremium = true;
                                    reason = `STRIPE_INACTIVE_BUT_PLAN_PROTECTED (${user.subscription_plan})`;
                                } else {
                                    shouldBePremium = false;
                                    reason = `STRIPE_INACTIVE_AND_MANUAL_EXPIRED (expired at ${user.premium_until})`;
                                }
                            } else {
                                // If no recognizable plan and Stripe says inactive, downgrade.
                                shouldBePremium = false; 
                                reason = `STRIPE_INACTIVE (last_status: ${subscriptions.data[0]?.status || 'none'}, plan: ${user.subscription_plan || 'none'})`;
                            }
                        }
                    } catch (stripeErr) {
                        console.error(`[SUBS] Stripe error for user ${user.id}:`, stripeErr.message);
                        shouldBePremium = true;
                        reason = 'STRIPE_API_ERROR_FALLBACK';
                    }
                } else {
                    // No Stripe ID, no Gift flag, no future expiry date...
                    // In this case, we keep them premium but log it as UNKNOWN_ORIGIN if they are already premium
                    // to avoid accidental loss. We ONLY downgrade if we have EXPLICIT historical dates that are in the past.
                    
                    if (user.premium_until && new Date(user.premium_until) <= now) {
                        shouldBePremium = false;
                        reason = `EXPIRED_MANUAL_DATE (expired at ${user.premium_until})`;
                    } else if (user.trial_until && new Date(user.trial_until) <= now) {
                        shouldBePremium = false;
                        reason = `EXPIRED_TRIAL (expired at ${user.trial_until})`;
                    } else {
                        // If they are here, they are is_premium=1 but we have no evidence of why or when it expires.
                        // We KEEP them to avoid accidental loss.
                        shouldBePremium = true;
                        reason = 'PREVENTIVE_RETENTION (Already Premium, no evidence of expiration)';
                    }
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
                    // Only log if it's not a standard protection we see every day, 
                    // or if it was a mystery protection so we can audit later.
                    if (reason.includes('UNKNOWN') || reason.includes('FALLBACK')) {
                        console.log(`✨ [SUBS] User ${user.id} remains Premium (SAFETY). Reason: ${reason}`);
                    }
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
