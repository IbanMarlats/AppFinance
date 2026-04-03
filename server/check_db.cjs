const sqlite3 = require('sqlite3');
const path = require('path');
const db = new sqlite3.Database(path.resolve(__dirname, 'database.sqlite'));

db.all(
  "SELECT id, is_premium, subscription_plan, premium_until, is_gift, stripe_customer_id FROM users WHERE is_premium = 1 OR is_gift = 1 OR subscription_plan IS NOT NULL OR premium_until IS NOT NULL",
  (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      rows.forEach(r => {
        console.log('---');
        console.log('ID:', r.id.substring(0, 8));
        console.log('Premium:', r.is_premium);
        console.log('Plan:', r.subscription_plan);
        console.log('Until:', r.premium_until);
        console.log('Gift:', r.is_gift);
        console.log('Stripe:', r.stripe_customer_id ? 'YES' : 'NO');
      });
      console.log('Total:', rows.length);
    }
    db.close();
  }
);
