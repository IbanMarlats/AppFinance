import sqlite3 from 'sqlite3';

const dbPath = 'c:/Users/Ibanm/source/repos/AI/server/database.sqlite';
const db = new sqlite3.Database(dbPath);

console.log("Checking last 20 audit logs...");

db.all("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20", (err, rows) => {
    if (err) {
        console.error("Error reading logs:", err);
    } else {
        console.table(rows.map(r => ({
            time: r.created_at,
            event: r.event_type,
            user: r.user_id,
            description: r.description
        })));
    }
    db.close();
});
