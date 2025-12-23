const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("Adding color column to platforms...");

db.run(`ALTER TABLE platforms ADD COLUMN color TEXT`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Column already exists.');
        } else {
            console.error('Error adding column:', err);
        }
    } else {
        console.log('Column added successfully.');
    }
    db.close();
});
