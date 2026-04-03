const sqlite3 = require('sqlite3');
const path = require('path');
const db = new sqlite3.Database(path.resolve(__dirname, 'database.sqlite'));

db.all("SELECT id, is_premium, subscription_plan, premium_until, trial_until, is_gift, stripe_customer_id FROM users", (err, users) => {
    if (err) {
        console.error(err);
        return;
    }

    const now = new Date();
    console.log('Current Server Time:', now.toISOString());
    console.log('Checking', users.length, 'users with NEW logic...');

    users.forEach(user => {
        if (!user.is_premium) return;

        let shouldBePremium = false;
        let reason = 'expired/invalid';

        const isGift = user.is_gift === 1 || user.is_gift === true || String(user.is_gift) === "1";
        const isLifetime = user.subscription_plan === 'lifetime' || 
                         user.subscription_plan === 'gift_lifetime' || 
                         user.subscription_plan === 'gift';

        // 1. Lifetime
        if (isLifetime) {
            shouldBePremium = true;
            reason = 'lifetime_plan';
        } 
        // 2. Gift flag (absolute protection)
        else if (isGift) {
            shouldBePremium = true;
            reason = 'gift_flag';
        }
        // 3. Manual expiry (Primary manual override)
        else if (user.premium_until && new Date(user.premium_until) > now) {
            shouldBePremium = true;
            reason = `manual_expiry_future (${user.premium_until})`;
        }
        // 4. Trial
        else if (user.trial_until && new Date(user.trial_until) > now) {
            shouldBePremium = true;
            reason = `active_trial (${user.trial_until})`;
        }
        // 5. Stripe
        else if (user.stripe_customer_id) {
            // Simulation: Assume Stripe check would happen here
            reason = `stripe_check_required`;
            shouldBePremium = true; // Fallback for simulation
        } else {
            shouldBePremium = false;
            reason = 'no_active_plan_found';
        }

        console.log(`User ${user.id.substring(0,8)} | Prem: ${user.is_premium} | Plan: ${user.subscription_plan} | Gift: ${user.is_gift} | Should: ${shouldBePremium} | Reason: ${reason}`);
    });
    db.close();
});
