import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('server/database.sqlite');

const userId = 'e44fc389-2f25-417c-9173-df267e7a3300';
db.run("UPDATE users SET is_premium = 1, subscription_plan = 'gift_lifetime', is_gift = 1 WHERE id = ?", [userId], function (err) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Successfully restored premium for user ${userId}. Changes: ${this.changes}`);
    db.close();
});
