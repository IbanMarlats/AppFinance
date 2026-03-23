import sqlite3 from 'sqlite3';
import fs from 'fs';
const db = new sqlite3.Database('server/database.sqlite');

db.all('PRAGMA table_info(users)', (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    fs.writeFileSync('users_schema.json', JSON.stringify(rows, null, 2));
    db.close();
    console.log('Schema saved to users_schema.json');
});
