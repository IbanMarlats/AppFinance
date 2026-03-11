const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, email_encrypted, role FROM users WHERE role = 'ecommerce'", [], (err, users) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    if (users.length === 0) {
        console.log("No ecommerce users found.");
        db.close();
        return;
    }

    console.log(`Found ${users.length} ecommerce users.`);

    users.forEach(user => {
        db.all("SELECT name FROM platforms WHERE user_id = ?", [user.id], (err, platforms) => {
            console.log(`User ${user.id} (${user.role}):`);
            platforms.forEach(p => console.log(` - ${p.name}`));
        });
    });

    // Give it a moment to print
    setTimeout(() => db.close(), 1000);
});
