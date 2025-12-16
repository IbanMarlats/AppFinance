import { useState, useEffect } from 'react';
import axios from 'axios';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import ExpenseStats from './ExpenseStats';

export default function StatsDashboard() {
    const { incomes, expenses, platforms, settings } = useFinance();
    const { user } = useAuth();

    // Year Filtering
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Visibility State
    const [showConfig, setShowConfig] = useState(false);
    const [visibleSections, setVisibleSections] = useState({
        monthlyFixed: false,
        expenses: false,
        platforms: false,
        annualHistory: false
    });

    // Load from settings when available
    useEffect(() => {
        if (settings && settings.stats_preferences) {
            try {
                const prefs = JSON.parse(settings.stats_preferences);
                setVisibleSections(prev => ({ ...prev, ...prefs }));
            } catch (e) {
                console.error("Failed to parse stats preferences", e);
            }
        } else {
            // Fallback to localStorage if no DB settings found (legacy or first load)
            const saved = localStorage.getItem('stats_preferences');
            if (saved) {
                try {
                    setVisibleSections(JSON.parse(saved));
                } catch (e) { }
            }
        }
    }, [settings]);

    const toggleSection = async (key) => {
        const newState = { ...visibleSections, [key]: !visibleSections[key] };
        setVisibleSections(newState);

        // Save to DB
        try {
            await axios.put('http://localhost:3001/api/settings', {
                stats_preferences: JSON.stringify(newState)
            }, { withCredentials: true });

            // Also update localStorage as backup/fast load
            localStorage.setItem('stats_preferences', JSON.stringify(newState));
        } catch (e) {
            console.error("Failed to save preferences", e);
        }
    };

    // Compute available years from both incomes and expenses
    const availableYears = [
        ...new Set([
            ...incomes.map(i => new Date(i.date).getFullYear()),
            ...expenses.map(e => new Date(e.date).getFullYear())
        ])
    ];
    if (!availableYears.includes(new Date().getFullYear())) {
        availableYears.push(new Date().getFullYear());
    }
    availableYears.sort((a, b) => b - a);

    // Filter Data by Year
    const filteredIncomes = incomes.filter(i => new Date(i.date).getFullYear() === selectedYear);
    const filteredExpenses = expenses.filter(e => new Date(e.date).getFullYear() === selectedYear);

    // Helper calculation
    const calculate = (inc) => {
        const p = platforms.find(pl => pl.id === inc.platformId) || { taxRate: 0, fixed_fee: 0 };
        const gross = inc.amount;
        const fee = (gross * (p.taxRate / 100)) + (p.fixed_fee || 0);
        const net1 = gross - fee;

        const uRate = user?.role === 'ecommerce' ? (settings.urssaf_ecommerce || 12.3) : (settings.urssaf_freelance || 25);
        const urssafRate = uRate / 100;
        const urssaf = net1 * urssafRate;
        const final = net1 - urssaf;
        return { gross, net1, final };
    };

    // 1. By Platform (using filtered incomes)
    const byPlatform = filteredIncomes.reduce((acc, curr) => {
        const pId = curr.platformId;
        const pName = platforms.find(p => p.id === pId)?.name || 'Inconnu';
        if (!acc[pId]) acc[pId] = { name: pName, gross: 0, net1: 0, final: 0 };

        const { gross, net1, final } = calculate(curr);
        acc[pId].gross += gross;
        acc[pId].net1 += net1;
        acc[pId].final += final;
        return acc;
    }, {});

    // 2. Global Profit/Loss Calculation per Month
    const statsByMonth = {};

    // Add Incomes (Net Final)
    filteredIncomes.forEach(inc => {
        const month = inc.date.substring(0, 7); // YYYY-MM
        if (!statsByMonth[month]) statsByMonth[month] = { income: 0, expense: 0, profit: 0, gross: 0 };
        const { gross, final } = calculate(inc);
        statsByMonth[month].income += final;
        statsByMonth[month].gross += gross;
        statsByMonth[month].profit += final; // Add income to profit
    });

    // Subtract Expenses
    filteredExpenses.forEach(exp => {
        const month = exp.date.substring(0, 7);
        if (!statsByMonth[month]) statsByMonth[month] = { income: 0, expense: 0, profit: 0, gross: 0 };
        statsByMonth[month].expense += exp.amount;
        statsByMonth[month].profit -= exp.amount; // Subtract expense from profit
    });

    // Global Totals (Compute Gross/Net1 correctly for global stats)
    const globalTotal = Object.values(statsByMonth).reduce((acc, curr) => ({
        gross: acc.gross + curr.gross,
        net1: (acc.net1 || 0) + ((curr.gross || 0) - (curr.fee || 0)), // Approximation if fee not tracked in monthly stats
        income: acc.income + curr.income,
        expense: acc.expense + curr.expense,
        profit: acc.profit + curr.profit
    }), { gross: 0, net1: 0, income: 0, expense: 0, profit: 0 });

    // Correct Net1 (Sum of filtered incomes net1)
    globalTotal.net1 = filteredIncomes.reduce((acc, curr) => acc + calculate(curr).net1, 0);

    // 3. TJM Moyen Calculation
    const incomesWithTjm = filteredIncomes.filter(inc => inc.tjm && inc.tjm > 0);
    const avgTjm = incomesWithTjm.length > 0
        ? incomesWithTjm.reduce((acc, curr) => acc + curr.tjm, 0) / incomesWithTjm.length
        : 0;

    // 4. Annual History Aggregation (Recap by Year) - Uses ALL data, not filtered
    const statsByYear = {};
    const yearsSet = new Set([
        ...incomes.map(i => new Date(i.date).getFullYear()),
        ...expenses.map(e => new Date(e.date).getFullYear())
    ]);

    // Initialize years
    yearsSet.forEach(y => {
        statsByYear[y] = { income: 0, expense: 0, profit: 0 };
    });

    incomes.forEach(inc => {
        const y = new Date(inc.date).getFullYear();
        if (statsByYear[y]) {
            const { final } = calculate(inc);
            statsByYear[y].income += final;
            statsByYear[y].profit += final;
        }
    });

    expenses.forEach(exp => {
        const y = new Date(exp.date).getFullYear();
        if (statsByYear[y]) {
            statsByYear[y].expense += exp.amount;
            statsByYear[y].profit -= exp.amount;
        }
    });

    const sortedYears = [...yearsSet].sort((a, b) => b - a);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', marginRight: '1rem' }}>
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className="btn"
                        style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}
                    >
                        ⚙️ Personnaliser
                    </button>
                    {showConfig && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            zIndex: 10,
                            width: '250px'
                        }}>
                            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Afficher/Masquer</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', cursor: user.is_premium ? 'pointer' : 'not-allowed', opacity: user.is_premium ? 1 : 0.6 }}>
                                    <input
                                        type="checkbox"
                                        checked={user.is_premium && visibleSections.monthlyFixed}
                                        onChange={() => user.is_premium && toggleSection('monthlyFixed')}
                                        disabled={!user.is_premium}
                                        style={{ marginRight: '0.5rem' }}
                                    />
                                    Dépenses Mensuelles
                                    {!user.is_premium && <span className="text-xs bg-amber-100 text-amber-800 px-1.5 rounded ml-2">Premium</span>}
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', cursor: user.is_premium ? 'pointer' : 'not-allowed', opacity: user.is_premium ? 1 : 0.6 }}>
                                    <input
                                        type="checkbox"
                                        checked={user.is_premium && visibleSections.expenses}
                                        onChange={() => user.is_premium && toggleSection('expenses')}
                                        disabled={!user.is_premium}
                                        style={{ marginRight: '0.5rem' }}
                                    />
                                    Répartition par Catégorie
                                    {!user.is_premium && <span className="text-xs bg-amber-100 text-amber-800 px-1.5 rounded ml-2">Premium</span>}
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', cursor: user.is_premium ? 'pointer' : 'not-allowed', opacity: user.is_premium ? 1 : 0.6 }}>
                                    <input
                                        type="checkbox"
                                        checked={user.is_premium && visibleSections.platforms}
                                        onChange={() => user.is_premium && toggleSection('platforms')}
                                        disabled={!user.is_premium}
                                        style={{ marginRight: '0.5rem' }}
                                    />
                                    Détail par Plateforme
                                    {!user.is_premium && <span className="text-xs bg-amber-100 text-amber-800 px-1.5 rounded ml-2">Premium</span>}
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', cursor: user.is_premium ? 'pointer' : 'not-allowed', opacity: user.is_premium ? 1 : 0.6 }}>
                                    <input
                                        type="checkbox"
                                        checked={user.is_premium && visibleSections.annualHistory}
                                        onChange={() => user.is_premium && toggleSection('annualHistory')}
                                        disabled={!user.is_premium}
                                        style={{ marginRight: '0.5rem' }}
                                    />
                                    Bilan par Année
                                    {!user.is_premium && <span className="text-xs bg-amber-100 text-amber-800 px-1.5 rounded ml-2">Premium</span>}
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <span style={{ marginRight: '1rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Année :</span>
                <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                    style={{
                        fontSize: '1rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        backgroundColor: '#fff',
                        cursor: 'pointer'
                    }}
                >
                    {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>

            {/* Global Summary Card */}
            <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--border)' }}>
                <h2 style={{ marginBottom: '1rem' }}>Bilan Global</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
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
                    <div style={{ padding: '1rem', backgroundColor: '#faf5ff', borderRadius: '8px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>TJM Moyen</div>
                        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--accent)' }}>
                            {avgTjm > 0 ? Math.round(avgTjm) + '€' : '-'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recurring Expenses Table */}
            {user.is_premium && visibleSections.monthlyFixed && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div className="flex justify-between" style={{ marginBottom: '1rem' }}>
                        <h2>Dépenses Mensuelles (Fixes)</h2>
                        <div className="badge" style={{ fontSize: '1.2em', padding: '0.5em 1em', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                            Total: <span style={{ color: 'var(--danger)' }}>
                                {expenses.filter(e => e.is_recurring).reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}€
                            </span>
                        </div>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    <th>Catégorie</th>
                                    <th>Montant</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.filter(e => e.is_recurring).map(e => (
                                    <tr key={e.id}>
                                        <td>{e.name}</td>
                                        <td><span className="badge">{e.category || 'Autre'}</span></td>
                                        <td style={{ color: 'var(--danger)' }}>{e.amount.toFixed(2)}€</td>
                                    </tr>
                                ))}
                                {expenses.filter(e => e.is_recurring).length === 0 && (
                                    <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune charge fixe définie</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Expense Stats by Category */}
            {user.is_premium && visibleSections.expenses && <ExpenseStats year={selectedYear} />}

            <div className="card">
                <h2>Bilan par Mois</h2>
                <div className="table-container">
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
            </div>

            {user.is_premium && visibleSections.platforms && (
                <div className="card">
                    <h2>Détail Revenus par Plateforme</h2>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Plateforme</th>
                                    <th>CA Brut</th>
                                    <th>Net Interm.</th>
                                    <th>Net Final</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.values(byPlatform).map((item, idx) => (
                                    <tr key={idx}>
                                        <td><span className="badge">{item.name}</span></td>
                                        <td>{item.gross.toFixed(2)}€</td>
                                        <td style={{ opacity: 0.8 }}>{item.net1.toFixed(2)}€</td>
                                        <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{item.final.toFixed(2)}€</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {user.is_premium && visibleSections.annualHistory && (
                <div className="card">
                    <h2>Bilan par Année</h2>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Année</th>
                                    <th>Recettes (Net)</th>
                                    <th>Dépenses</th>
                                    <th>Bénéfice / Déficit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedYears.map(year => {
                                    const st = statsByYear[year];
                                    return (
                                        <tr key={year}>
                                            <td style={{ fontWeight: 'bold' }}>{year}</td>
                                            <td style={{ color: 'var(--success)' }}>+{st.income.toFixed(2)}€</td>
                                            <td style={{ color: 'var(--danger)' }}>-{st.expense.toFixed(2)}€</td>
                                            <td style={{ fontWeight: 'bold', color: st.profit >= 0 ? '#3b82f6' : 'var(--danger)' }}>
                                                {st.profit > 0 ? '+' : ''}{st.profit.toFixed(2)}€
                                            </td>
                                        </tr>
                                    );
                                })}
                                {sortedYears.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune donnée</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
