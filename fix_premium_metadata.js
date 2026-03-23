import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log('🔄 Fixing premium metadata for existing users...');

// Update all users who are currently marked as is_premium = 1 
// to have is_gift = 1 and periodic premium_until if they don't have it.
db.serialize(() => {
    db.run("UPDATE users SET is_gift = 1 WHERE is_premium = 1 AND (subscription_plan IS NULL OR subscription_plan = '')", function(err) {
        if (err) {
            console.error('❌ Error updating is_gift:', err.message);
        } else {
            console.log(`✅ Marked ${this.changes} users as 'gift' to preserve premium status.`);
        }
    });

    // Also set a long expiry as a double safety
    const longExpiry = new Date();
    longExpiry.setFullYear(longExpiry.getFullYear() + 10); // 10 years
    
    db.run("UPDATE users SET premium_until = ? WHERE is_premium = 1 AND premium_until IS NULL", [longExpiry.toISOString()], function(err) {
        if (err) {
            console.error('❌ Error updating premium_until:', err.message);
        } else {
            console.log(`✅ Set long expiry for ${this.changes} premium users.`);
        }
    });

    db.close((err) => {
        if (err) console.error(err.message);
        console.log('🏁 Metadata fix complete.');
    });
});
