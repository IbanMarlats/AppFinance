import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('server/database.sqlite');

db.all('SELECT id, role, declaration_frequency FROM users WHERE id = "e44fc389-2f25-417c-9e4c-46ca9deb4bea"', (err, users) => {
    console.log('User Details:', users);
});

db.all('SELECT * FROM settings', (err, settings) => {
    console.log('--- ALL SETTINGS ---');
    settings.forEach(s => console.log(`${s.key}: ${s.value}`));
    db.close();
});
