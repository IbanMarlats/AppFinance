const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("Removing Malt and Freework for ecommerce users...");

db.all("SELECT id FROM users WHERE role = 'ecommerce'", [], (err, users) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    if (users.length === 0) {
        console.log("No ecommerce users found.");
        db.close();
        return;
    }

    const tasks = [];
    users.forEach(user => {
        tasks.push(new Promise((resolve) => {
            db.run(
                "DELETE FROM platforms WHERE user_id = ? AND name IN ('Malt', 'Freework')",
                [user.id],
                function (err) {
                    if (err) console.error(`Error deleting for user ${user.id}:`, err);
                    else if (this.changes > 0) console.log(`Removed ${this.changes} platforms for user ${user.id}`);
                    resolve();
                }
            );
        }));
    });

    Promise.all(tasks).then(() => {
        console.log("Cleanup complete.");
        db.close();
    });
});
