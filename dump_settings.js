const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('server/database.sqlite');

db.all('SELECT * FROM settings', (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log('--- SETTINGS START ---');
    rows.forEach(r => {
        console.log(`${r.key}: ${r.value}`);
    });
    console.log('--- SETTINGS END ---');
    db.close();
});
