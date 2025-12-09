import { useFinance } from '../context/FinanceContext';

export default function ExpenseStats({ year }) {
    const { expenses, categories } = useFinance();

    const filteredExpenses = year
        ? expenses.filter(e => new Date(e.date).getFullYear() === year)
        : expenses;

    const stats = filteredExpenses.reduce((acc, curr) => {
        const cat = curr.category || 'Autre';
        if (!acc[cat]) acc[cat] = 0;
        acc[cat] += curr.amount;
        return acc;
    }, {});

    const total = Object.values(stats).reduce((a, b) => a + b, 0);

    const sortedStats = Object.entries(stats).sort((a, b) => b[1] - a[1]); // Sort by amount desc

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <h2>Répartition par Catégorie</h2>
            <div className="table-container">
                <table style={{ marginTop: '1rem' }}>
                    <thead>
                        <tr>
                            <th>Catégorie</th>
                            <th>Montant</th>
                            <th>%</th>
                            <th>Barre</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedStats.map(([catName, amount]) => {
                            const percent = total > 0 ? (amount / total) * 100 : 0;
                            const catColor = categories.find(c => c.name === catName)?.color || 'var(--accent)';

                            return (
                                <tr key={catName}>
                                    <td style={{ fontWeight: 'bold' }}>{catName}</td>
                                    <td>{amount.toFixed(2)}€</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{percent.toFixed(1)}%</td>
                                    <td style={{ width: '40%' }}>
                                        <div style={{
                                            backgroundColor: '#e5e7eb',
                                            borderRadius: '9999px',
                                            height: '0.5rem',
                                            width: '100%',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                backgroundColor: catColor,
                                                height: '100%',
                                                width: `${percent}%`
                                            }} />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {sortedStats.length === 0 && (
                            <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Pas de données</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
