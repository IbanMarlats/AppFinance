
import db from './server/db.js';

const runVerification = async () => {
    console.log("Starting verification...");

    const testId = 'verify_test_' + Date.now();
    const userId = 'test_user_id'; // Assuming this user might not exist, but we need a valid FK? 
    // Wait, user_id FK is enforced? 
    // db.js schema: FOREIGN KEY(user_id) REFERENCES users(id)
    // So I need a valid user or disable FK checks (sqlite default is disabled unless enabled).
    // db.js enables PRAGMA foreign_keys = ON usually.
    // Let's check db.js for foreign_keys pragma.

    // Attempting insert.
    const sql = `INSERT INTO incomes (
        id, name, amount, date, platformId, is_recurring, user_id, 
        product_ref, unit_price, quantity, unit_cost, shipping_fees, transaction_fees
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
        await new Promise((resolve, reject) => {
            db.run(sql, [
                testId, 'Test Product', 100, '2023-01-01', 'amazon', 0, userId,
                'REF123', 50, 2, 10, 5, 2
            ], function (err) {
                if (err) {
                    if (err.message.includes('FOREIGN KEY constraint failed')) {
                        console.log("⚠️ FK constraint failed as expected (no user), but SQL syntax is valid!");
                        resolve();
                    } else {
                        reject(err);
                    }
                } else {
                    console.log("✅ Insert successful!");
                    resolve();
                }
            });
        });

        // Clean up if inserted
        db.run("DELETE FROM incomes WHERE id = ?", [testId]);

    } catch (error) {
        console.error("❌ Verification Failed:", error.message);
        process.exit(1);
    }
};

runVerification();
