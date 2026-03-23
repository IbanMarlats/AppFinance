import cron from 'node-cron';
import db from '../db.js';
import { generateMonthlyRecap } from '../services/recapService.js';

// Schedule: At 23:30 on the last day of the month
// cron syntax for last day of month is tricky in standard cron, but node-cron supports specific dates.
// However, a common trick is running on day 28-31 and checking if tomorrow is 1st.
// Or using a library that supports 'L'. node-cron does not support 'L' officially efficiently.
// Better approach: Run every day at 23:00, check if it's the last day of month.

export const initCronJobs = () => {
    console.log("Initializing Cron Jobs...");

    // Run every 1st of the month at 00:05
    cron.schedule('5 0 1 * *', async () => {
        console.log("It is the 1st of the month. Starting Monthly Recap generation for the PREVIOUS month...");

        const now = new Date();
        const lastMonth = new Date(now);
        lastMonth.setMonth(now.getMonth() - 1); // Go back one month

        const month = lastMonth.getMonth() + 1; // 1-12
        const year = lastMonth.getFullYear();

        // Fetch all premium users
        db.all("SELECT id FROM users WHERE is_premium = 1", async (err, users) => {
            if (err) {
                console.error("Error fetching users for Cron:", err);
                return;
            }

            console.log(`Found ${users.length} premium users.`);
            for (const user of users) {
                try {
                    await generateMonthlyRecap(user.id, month, year);
                    console.log(`Generated recap for user ${user.id}`);
                } catch (e) {
                    console.error(`Failed to generate recap for user ${user.id}:`, e);
                }
            }
        });
    });
};
