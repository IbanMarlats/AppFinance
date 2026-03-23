import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '../utils/email.js';
import { decrypt } from '../utils/crypto.js';

// Helper to run query as promise
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

export const generateMonthlyRecap = async (userId, month, year) => {
    try {
        console.log(`Generating recap for user ${userId}, ${month}/${year}`);

        // 1. Calculate Date Range
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

        console.log(`Date range: ${startDate} to ${endDate}`);

        // 2. Fetch User Data
        const [user] = await query("SELECT * FROM users WHERE id = ?", [userId]);
        if (!user) throw new Error("User not found");

        let userEmail = "";
        try {
            userEmail = decrypt(user.email_encrypted);
        } catch (e) {
            console.warn("Could not decrypt email, maybe plain text or different key?", e);
            userEmail = user.email_encrypted; // fallback
        }

        // 3. Fetch Settings (Global + User Overrides)
        const globalSettingsRows = await query("SELECT key, value FROM settings");
        const globalSettings = globalSettingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});

        const userSettingsRows = await query("SELECT key, value FROM user_settings WHERE user_id = ?", [userId]);
        const userSettings = userSettingsRows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});

        const settings = { ...globalSettings, ...userSettings };

        // 4. Financial Stats

        // CA Brut (Total Income)
        const incomes = await query(`
            SELECT * FROM incomes 
            WHERE user_id = ? AND date >= ? AND date <= ?
        `, [userId, startDate, endDate]);

        const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);

        // CA Net (Income - Expenses)
        const expenses = await query(`
            SELECT * FROM expenses 
            WHERE user_id = ? AND date >= ? AND date <= ?
        `, [userId, startDate, endDate]);

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netIncome = totalIncome - totalExpenses;

        // URSSAF Estimate
        let socialRate = 0.22; // Default ~22%
        if (user.role === 'freelance_bic') socialRate = (parseFloat(settings.urssaf_freelance_bic) || 21.2) / 100;
        else if (user.role === 'freelance_bnc') socialRate = (parseFloat(settings.urssaf_freelance_bnc) || 23.1) / 100;
        else if (user.role === 'ecommerce') socialRate = (parseFloat(settings.urssaf_ecommerce) || 12.3) / 100;
        else socialRate = (parseFloat(settings.urssaf_freelance) || 25) / 100;

        const estimatedUrssaf = totalIncome * socialRate;

        // Top Revenue Source
        const incomeByPlatform = {};
        for (const inc of incomes) {
            const pid = inc.platformId || 'other';
            incomeByPlatform[pid] = (incomeByPlatform[pid] || 0) + inc.amount;
        }

        let topPlatformId = null;
        let maxVal = -1;
        for (const [pid, val] of Object.entries(incomeByPlatform)) {
            if (val > maxVal) {
                maxVal = val;
                topPlatformId = pid;
            }
        }

        let topSourceResult = "Divers";
        if (topPlatformId && topPlatformId !== 'other') {
            const [plat] = await query("SELECT name FROM platforms WHERE id = ?", [topPlatformId]);
            if (plat) topSourceResult = plat.name;
        }

        // Top Expense Category
        const expenseByCat = {};
        for (const exp of expenses) {
            const cat = exp.category || 'other';
            expenseByCat[cat] = (expenseByCat[cat] || 0) + exp.amount;
        }

        let topExpenseCat = "Divers";
        let maxExp = -1;
        for (const [cat, val] of Object.entries(expenseByCat)) {
            if (val > maxExp) {
                maxExp = val;
                topExpenseCat = cat;
            }
        }

        // Goals Check
        const periodKey = `${year}-${String(month).padStart(2, '0')}`;
        const [goal] = await query(`
            SELECT * FROM goals WHERE user_id = ? AND type = 'revenue' AND period = 'month' AND period_key = ?
        `, [userId, periodKey]);

        const goalTarget = goal ? goal.target_amount : 0;
        const goalProgress = goalTarget > 0 ? (totalIncome / goalTarget) * 100 : 0;

        // Enhancements: VAT, YTD, M-1

        // 3.1 VAT Collected
        const totalVatCollected = incomes.reduce((sum, inc) => sum + (inc.vat_amount || 0), 0);

        // 3.2 Year-to-Date Revenue (for thresholds)
        // From Jan 1st of current year to endDate
        const yearStart = `${year}-01-01`;
        const ytdIncomes = await query(`
            SELECT amount FROM incomes 
            WHERE user_id = ? AND date >= ? AND date <= ?
        `, [userId, yearStart, endDate]);
        const ytdRevenue = ytdIncomes.reduce((sum, inc) => sum + inc.amount, 0);

        // 3.3 M-1 Comparison
        // Get previous month's recap or data
        let prevMonth = month - 1;
        let prevYear = year;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = year - 1;
        }
        // Try to fetch previous month recap
        const [prevRecap] = await query("SELECT data FROM monthly_recaps WHERE user_id = ? AND month = ? AND year = ?", [userId, prevMonth, prevYear]);

        let growthPercentage = null;
        if (prevRecap) {
            const prevData = JSON.parse(prevRecap.data);
            const prevIncome = prevData.stats.totalIncome;
            if (prevIncome > 0) {
                growthPercentage = ((totalIncome - prevIncome) / prevIncome) * 100;
            }
        }

        // 4. Construct Data
        const recapData = {
            generated_at: new Date().toISOString(),
            stats: {
                totalIncome,
                totalExpenses,
                netIncome,
                estimatedUrssaf,
                totalVatCollected,
                ytdRevenue,
                growthPercentage,
                topSource: topSourceResult,
                topExpense: topExpenseCat,
                transactionCount: incomes.length,
                expenseCount: expenses.length,
                declarationFrequency: user.declaration_frequency || 'monthly'
            },
            goal: {
                target: goalTarget,
                progress: goalProgress
            }
        };

        // Special Quarterly Logic
        if (user.declaration_frequency === 'quarterly' && [3, 6, 9, 12].includes(month)) {
            // It's the end of a quarter (March, June, Sept, Dec)
            // We need to sum up Q1, Q2, Q3 or Q4
            const quarterStartMonth = month - 2; // e.g. 3-2 = 1 (Jan)
            const quarterStartDate = new Date(year, quarterStartMonth - 1, 1).toISOString().split('T')[0];
            const quarterEndDate = endDate; // Current month end

            const quarterIncomes = await query(`
                SELECT amount FROM incomes 
                WHERE user_id = ? AND date >= ? AND date <= ?
            `, [userId, quarterStartDate, quarterEndDate]);

            const quarterTotalIncome = quarterIncomes.reduce((sum, inc) => sum + inc.amount, 0);
            const quarterTotalUrssaf = quarterTotalIncome * socialRate;

            recapData.stats.quarterlyTotalIncome = quarterTotalIncome;
            recapData.stats.quarterlyTotalUrssaf = quarterTotalUrssaf;
            recapData.stats.isQuarterlyRecap = true;
        }

        // 5. Save to DB
        const [existing] = await query("SELECT id FROM monthly_recaps WHERE user_id = ? AND month = ? AND year = ?", [userId, month, year]);

        let recapId = existing ? existing.id : uuidv4();

        if (existing) {
            await run("UPDATE monthly_recaps SET data = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?", [JSON.stringify(recapData), recapId]);
        } else {
            await run("INSERT INTO monthly_recaps (id, user_id, month, year, data) VALUES (?, ?, ?, ?, ?)", [recapId, userId, month, year, JSON.stringify(recapData)]);
        }

        // 6. Notifications
        // In-App
        const notifId = uuidv4();
        const monthName = new Date(year, month - 1).toLocaleString('fr-FR', { month: 'long' });
        await run(`
            INSERT INTO notifications (id, user_id, type, message, link) 
            VALUES (?, ?, 'recap', ?, '/dashboard/recaps/${recapId}')
        `, [notifId, userId, `Votre bilan de ${monthName} est disponible !`]);

        // Email
        if (userEmail) {
            const emailHtml = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <h1 style="color: #4f46e5; text-align: center;">Bilan Mensuel : ${monthName} ${year}</h1>
                    <p>Bonjour,</p>
                    <p>Votre récapitulatif mensuel est prêt. Voici les chiffres clés :</p>
                    
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Chiffre d'Affaires :</strong> ${totalIncome.toFixed(2)}€</p>
                        <p style="margin: 5px 0;"><strong>Bénéfice Net :</strong> ${netIncome.toFixed(2)}€</p>
                        <p style="margin: 5px 0;"><strong>URSSAF (est.) :</strong> ${estimatedUrssaf.toFixed(2)}€</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="http://localhost:5173/dashboard?tab=recap" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Voir le bilan complet</a>
                    </div>
                </div>
            `;

            await sendEmail(userEmail, `Votre Bilan de ${monthName} ${year}`, emailHtml);
        }

        return { success: true, recapId };

    } catch (error) {
        console.error("Error generating recap:", error);
        throw error;
    }
};

export const generateYearlyRecap = async (userId, year) => {
    try {
        console.log(`Generating YEARLY recap for user ${userId}, ${year}`);

        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        // 1. Fetch Incomes
        const incomes = await query(`
            SELECT * FROM incomes 
            WHERE user_id = ? AND date >= ? AND date <= ?
        `, [userId, startDate, endDate]);

        const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);

        // 2. Fetch Expenses
        const expenses = await query(`
            SELECT * FROM expenses 
            WHERE user_id = ? AND date >= ? AND date <= ?
        `, [userId, startDate, endDate]);

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netIncome = totalIncome - totalExpenses;

        // 3. Best Month
        const incomeByMonth = {};
        for (const inc of incomes) {
            const m = new Date(inc.date).getMonth(); // 0-11
            incomeByMonth[m] = (incomeByMonth[m] || 0) + inc.amount;
        }

        let bestMonthIndex = -1;
        let bestMonthAmount = -1;
        for (const [m, amt] of Object.entries(incomeByMonth)) {
            if (amt > bestMonthAmount) {
                bestMonthAmount = amt;
                bestMonthIndex = parseInt(m);
            }
        }

        const bestMonthName = bestMonthIndex >= 0
            ? new Date(year, bestMonthIndex, 1).toLocaleString('fr-FR', { month: 'long' })
            : 'Aucun';

        // 4. Top Source
        const incomeByPlatform = {};
        for (const inc of incomes) {
            const pid = inc.platformId || 'other';
            incomeByPlatform[pid] = (incomeByPlatform[pid] || 0) + inc.amount;
        }

        let topPlatformId = null;
        let maxVal = -1;
        for (const [pid, val] of Object.entries(incomeByPlatform)) {
            if (val > maxVal) {
                maxVal = val;
                topPlatformId = pid;
            }
        }

        let topSourceResult = "Divers";
        if (topPlatformId && topPlatformId !== 'other') {
            const [plat] = await query("SELECT name FROM platforms WHERE id = ?", [topPlatformId]);
            if (plat) topSourceResult = plat.name;
        }

        // 5. User Data for URSSAF Rate
        const [user] = await query("SELECT role, declaration_frequency FROM users WHERE id = ?", [userId]);
        let socialRate = 0.22;
        if (user.role === 'freelance_bic') socialRate = 0.212;
        if (user.role === 'freelance_bnc') socialRate = 0.231;
        if (user.role === 'ecommerce') socialRate = 0.123;

        const totalUrssaf = totalIncome * socialRate;

        // 6. Annual Goal (Revenue)
        // Check for an annual goal for this year
        const [goal] = await query(`
            SELECT * FROM goals WHERE user_id = ? AND type = 'revenue' AND period = 'year' AND period_key = ?
        `, [userId, String(year)]);

        const goalTarget = goal ? goal.target_amount : 0;
        const goalProgress = goalTarget > 0 ? (totalIncome / goalTarget) * 100 : 0;

        // 7. Savings / Remainder
        const remainder = netIncome - totalUrssaf;

        const recapData = {
            generated_at: new Date().toISOString(),
            stats: {
                totalIncome,
                totalExpenses,
                netIncome,
                totalUrssaf,
                remainder,
                bestMonth: bestMonthName,
                bestMonthAmount,
                topSource: topSourceResult,
                transactionCount: incomes.length,
                goal: {
                    target: goalTarget,
                    progress: goalProgress
                }
            }
        };

        // 7. Save
        const [existing] = await query("SELECT id FROM yearly_recaps WHERE user_id = ? AND year = ?", [userId, year]);
        let recapId = existing ? existing.id : uuidv4();

        if (existing) {
            await run("UPDATE yearly_recaps SET data = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?", [JSON.stringify(recapData), recapId]);
        } else {
            await run("INSERT INTO yearly_recaps (id, user_id, year, data) VALUES (?, ?, ?, ?)", [recapId, userId, year, JSON.stringify(recapData)]);
        }

        return { success: true, recapId };

    } catch (e) {
        console.error("Error generating annual recap", e);
        throw e;
    }
};
