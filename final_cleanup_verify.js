import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('server/database.sqlite');

db.serialize(() => {
    // 1. Clear empty override for the user
    db.run('DELETE FROM user_settings WHERE user_id = "e44fc389-2f25-417c-9e4c-46ca9deb4bea" AND key = "urssaf_freelance_bnc" AND value = ""', (err) => {
        if (err) console.error(err);
        else console.log('Cleared empty BNC override for user.');
    });

    // 2. Final check of global settings
    db.all('SELECT * FROM settings WHERE key LIKE "urssaf_%"', (err, rows) => {
        console.log('Final Global URSSAF Settings:', rows);
    });

    // 3. Final check of user settings (should be empty for BNC now)
    db.all('SELECT * FROM user_settings WHERE user_id = "e44fc389-2f25-417c-9e4c-46ca9deb4bea"', (err, rows) => {
        console.log('Final User Overrides:', rows);
        db.close();
    });
});
