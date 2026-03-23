import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('server/database.sqlite');

db.all('SELECT * FROM user_settings WHERE user_id = "e44fc389-2f25-417c-9e4c-46ca9deb4bea"', (err, rows) => {
    console.log('User Settings Overrides:', rows);
    db.close();
});
