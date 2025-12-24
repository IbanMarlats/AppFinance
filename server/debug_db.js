import db from './db.js';

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log("Tables:", tables.map(t => t.name));
    }
});
