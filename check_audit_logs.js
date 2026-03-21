
import db from './server/db.js';

db.all("SELECT * FROM audit_logs WHERE event_type LIKE '%LOGIN%' ORDER BY created_at DESC LIMIT 20", (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Found ${rows.length} login-related logs:`);
    rows.forEach(row => {
        console.log(`- [${row.created_at}] ${row.event_type}: ${row.description} (IP: ${row.ip_address})`);
    });
    process.exit(0);
});
