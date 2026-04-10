
import db from './server/db.js';
import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function scan() {
    db.all("SELECT id, email_encrypted, stripe_customer_id, trial_until, subscription_plan, premium_until, is_gift, is_premium FROM users", async (err, users) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }

        console.log(`Analyzing ${users.length} users...`);
        const now = new Date();

        for (const user of users) {
             const isGift = Boolean(user.is_gift) || user.is_gift === 1 || String(user.is_gift) === "1";
             const isLifetime = user.subscription_plan === 'lifetime' || 
                                 user.subscription_plan === 'gift_lifetime' || 
                                 user.subscription_plan === 'gift' ||
                                 user.subscription_plan === 'premium_lifetime';

            let shouldBePremium = false;
            let reason = 'none';

            if (isLifetime) {
                shouldBePremium = true;
                reason = `LIFETIME_PROTECTED (${user.subscription_plan})`;
            } else if (isGift) {
                shouldBePremium = true;
                reason = 'GIFT_FLAG_PROTECTED';
            } else if (user.premium_until && new Date(user.premium_until) > now) {
                shouldBePremium = true;
                reason = `MANUAL_EXPIRY_FUTURE (until ${user.premium_until})`;
            } else if (user.trial_until && new Date(user.trial_until) > now) {
                shouldBePremium = true;
                reason = `TRIAL_ACTIVE (until ${user.trial_until})`;
            } else if (user.stripe_customer_id) {
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
                        if (user.subscription_plan === 'annual' || user.subscription_plan === 'lifetime') {
                             shouldBePremium = true;
                             reason = `STRIPE_INACTIVE_BUT_PLAN_PROTECTED (${user.subscription_plan})`;
                        } else {
                             shouldBePremium = false;
                             reason = `STRIPE_INACTIVE (${subscriptions.data[0]?.status || 'none'})`;
                        }
                    }
                } catch (e) {
                    shouldBePremium = true;
                    reason = 'STRIPE_ERROR_FALLBACK';
                }
            } else {
                if (user.premium_until && new Date(user.premium_until) <= now) {
                    shouldBePremium = false;
                    reason = `EXPIRED_MANUAL_DATE`;
                } else if (user.trial_until && new Date(user.trial_until) <= now) {
                    shouldBePremium = false;
                    reason = `EXPIRED_TRIAL`;
                } else if (user.is_premium) {
                    shouldBePremium = true;
                    reason = 'UNKNOWN_PROTECTION';
                }
            }

            if (user.is_premium && !shouldBePremium) {
                console.log(`!!! WOULD DOWNGRADE User ${user.id}: Plan=${user.subscription_plan}, StripeID=${user.stripe_customer_id}, Reason=${reason}`);
            } else if (!user.is_premium && shouldBePremium) {
                // console.log(`User ${user.id} is FREE but should be PREMIUM? Reason: ${reason}`);
            } else if (user.is_premium) {
                // console.log(`User ${user.id} is safe. Reason: ${reason}`);
            }
        }
        process.exit(0);
    });
}

scan();
