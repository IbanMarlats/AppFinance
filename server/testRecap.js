import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
import db from './db.js';
import { generateMonthlyRecap } from './services/recapService.js';
import fs from 'fs';
import { hashEmail } from './utils/crypto.js';

const log = (msg) => {
    const line = `${new Date().toISOString()} - ${msg}\n`;
    console.log(msg);
    fs.appendFileSync('test_log.txt', line);
};

const generateTestRecap = async () => {
    const email = 'iban.marlats@gmail.com';
    const emailHash = hashEmail(email);
    const month = 12; // December
    const year = 2025;

    log(`Looking for user ${email}...`);

    db.get("SELECT id FROM users WHERE email_hash = ?", [emailHash], async (err, user) => {
        if (err) {
            log(`DB Error: ${err.message}`);
            process.exit(1);
            return;
        }
        if (!user) {
            log("User not found!");
            process.exit(1);
            return;
        }

        log(`Found user ${user.id}. Generating recap for ${month}/${year}...`);

        try {
            const res = await generateMonthlyRecap(user.id, month, year);
            log(`Recap generated successfully! ID: ${res.recapId}`);
            process.exit(0);
        } catch (e) {
            log(`Generation failed: ${e.message}\n${e.stack}`);
            process.exit(1);
        }
    });
};

generateTestRecap();
