import { useFinance } from '../context/FinanceContext';

export default function StatsDashboard() {
    const { incomes, expenses, platforms } = useFinance();

    // Helper calculation
    const calculate = (inc) => {
        const p = platforms.find(pl => pl.id === inc.platformId) || { taxRate: 0 };
        const gross = inc.amount;
        const fee = gross * (p.taxRate / 100);
        const net1 = gross - fee;
        const urssaf = net1 * 0.25;
        const final = net1 - urssaf;
        return { gross, final };
    };

    // 1. By Platform
    const byPlatform = incomes.reduce((acc, curr) => {
        const pId = curr.platformId;
        const pName = platforms.find(p => p.id === pId)?.name || 'Inconnu';
        if (!acc[pId]) acc[pId] = { name: pName, gross: 0, final: 0 };

        const { gross, final } = calculate(curr);
        acc[pId].gross += gross;
        acc[pId].final += final;
        return acc;
    }, {});

    // 2. Global Profit/Loss Calculation per Month
    const statsByMonth = {};

    // Add Incomes (Net Final)
    incomes.forEach(inc => {
        const month = inc.date.substring(0, 7); // YYYY-MM
        if (!statsByMonth[month]) statsByMonth[month] = { income: 0, expense: 0, profit: 0, gross: 0 };
        const { gross, final } = calculate(inc);
        statsByMonth[month].income += final;
        statsByMonth[month].gross += gross;
        statsByMonth[month].profit += final; // Add income to profit
    });

    // Subtract Expenses
    expenses.forEach(exp => {
        const month = exp.date.substring(0, 7);
        if (!statsByMonth[month]) statsByMonth[month] = { income: 0, expense: 0, profit: 0, gross: 0 };
        statsByMonth[month].expense += exp.amount;
        statsByMonth[month].profit -= exp.amount; // Subtract expense from profit
    });

    // Global Totals
    const globalTotal = Object.values(statsByMonth).reduce((acc, curr) => ({
        income: acc.income + curr.income,
        expense: acc.expense + curr.expense,
        profit: acc.profit + curr.profit
    }), { income: 0, expense: 0, profit: 0 });

    return (
        <div>
            {/* Global Summary Card */}
            <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--border)' }}>
                <h2 style={{ marginBottom: '1rem' }}>Bilan Global</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                    <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Total Recettes (Net)</div>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--success)' }}>{globalTotal.income.toFixed(2)}€</div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Total Dépenses</div>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--danger)' }}>{globalTotal.expense.toFixed(2)}€</div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: globalTotal.profit >= 0 ? '#eff6ff' : '#fff1f2', borderRadius: '8px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Résultat Net</div>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: globalTotal.profit >= 0 ? '#3b82f6' : 'var(--danger)' }}>
                            {globalTotal.profit > 0 ? '+' : ''}{globalTotal.profit.toFixed(2)}€
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <h2>Bilan par Mois</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Mois</th>
                            <th>Recettes (Net)</th>
                            <th>Dépenses</th>
                            <th>Bénéfice / Déficit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(statsByMonth).sort().reverse().map(([month, item]) => {
                            const [y, m] = month.split('-');
                            const dateObj = new Date(parseInt(y), parseInt(m) - 1);
                            const displayDate = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                            const capitalizedDate = displayDate.charAt(0).toUpperCase() + displayDate.slice(1);

                            return (
                                <tr key={month}>
                                    <td style={{ fontWeight: '500' }}>{capitalizedDate}</td>
                                    <td style={{ color: 'var(--success)' }}>+{item.income.toFixed(2)}€</td>
                                    <td style={{ color: 'var(--danger)' }}>-{item.expense.toFixed(2)}€</td>
                                    <td style={{ fontWeight: 'bold', color: item.profit >= 0 ? '#3b82f6' : 'var(--danger)' }}>
                                        {item.profit > 0 ? '+' : ''}{item.profit.toFixed(2)}€
                                    </td>
                                </tr>
                            );
                        })}
                        {Object.keys(statsByMonth).length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune donnée</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className="card">
                <h2>Détail Revenus par Plateforme (Net Final)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Plateforme</th>
                            <th>CA Brut</th>
                            <th>Net Final</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.values(byPlatform).map((item, idx) => (
                            <tr key={idx}>
                                <td><span className="badge">{item.name}</span></td>
                                <td>{item.gross.toFixed(2)}€</td>
                                <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{item.final.toFixed(2)}€</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
