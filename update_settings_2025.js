import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'server/database.sqlite');

async function updateSettings() {
    console.log(`Opening database at ${dbPath}...`);
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const settings2025 = {
        'tva_threshold': '37500',
        'tva_threshold_sell': '85000',
        'micro_threshold': '77700',
        'micro_threshold_sell': '188700',
        'urssaf_freelance': '24.8', // Legacy key, mapped to BNC often
        'urssaf_freelance_bnc': '24.8',
        'urssaf_freelance_bic': '21.4',
        'urssaf_ecommerce': '12.4'
    };

    console.log("Updating Global Settings to 2025 values...");

    for (const [key, value] of Object.entries(settings2025)) {
        const existing = await db.get("SELECT value FROM settings WHERE key = ?", [key]);
        if (existing) {
            console.log(`Updating ${key}: ${existing.value} -> ${value}`);
            await db.run("UPDATE settings SET value = ? WHERE key = ?", [value, key]);
        } else {
            console.log(`Inserting ${key}: ${value}`);
            await db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [key, value]);
        }
    }

    console.log("Done.");
}

updateSettings().catch(err => console.error(err));
