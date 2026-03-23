import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('server/database.sqlite');

db.all('SELECT * FROM settings WHERE key LIKE "urssaf_%"', (err, rows) => {
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
