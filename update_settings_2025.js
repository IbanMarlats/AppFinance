import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'server/database.sqlite');

const db = new sqlite3.Database(dbPath);

const settings2025 = {
    'tva_threshold': '37500',
    'tva_threshold_sell': '85000',
    'micro_threshold': '77700',
    'micro_threshold_sell': '188700',
    'urssaf_freelance': '24.8', // Legacy key
    'urssaf_freelance_bnc': '23.1',
    'urssaf_freelance_bic': '21.2',
    'urssaf_ecommerce': '12.3'
};

console.log(`Opening database at ${dbPath}...`);

db.serialize(() => {
    for (const [key, value] of Object.entries(settings2025)) {
        db.run(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [key, value],
            (err) => {
                if (err) console.error(`Error updating ${key}:`, err);
                else console.log(`Updated ${key} to ${value}`);
            }
        );
    }
});

db.close(() => {
    console.log("Done.");
});
