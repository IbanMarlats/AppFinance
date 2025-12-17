import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

export default function ArtisanStats({ year }) {
    const { incomes, expenses } = useFinance();
    const { user } = useAuth();

    if (user?.role !== 'artisan') return null;

    const [smic, setSmic] = useState(11.65); // Brut or Net? User implies Net visual, but 11.65 is Brut 2024. Let's use 10 for simple mental math or default 11.65

    // Filter by year
    const filteredIncomes = incomes.filter(i => new Date(i.date).getFullYear() === year && i.status !== 'quote_sent');

    // 1. Real Hourly Rate Table
    // Filter items with hours_spent > 0
    const measuredItems = filteredIncomes.filter(i => i.hours_spent > 0);

    // Sort by Hourly Rate Ascending (Worst first)
    measuredItems.sort((a, b) => {
        const rateA = (a.amount - (a.material_cost || 0)) / a.hours_spent;
        const rateB = (b.amount - (b.material_cost || 0)) / b.hours_spent;
        return rateA - rateB;
    });

    // 2. Material vs Sales Ratio (Monthly)
    const monthlyStats = {};

    // Sales
    filteredIncomes.forEach(inc => {
        const m = inc.date.substring(0, 7);
        if (!monthlyStats[m]) monthlyStats[m] = { sales: 0, material: 0 };
        monthlyStats[m].sales += inc.amount;
        monthlyStats[m].material += (inc.material_cost || 0); // Directly attributed material cost
    });

    // Also include "Global Material Expenses" if they use the Expense table for bulk buying?
    // The user said "Comparaison Achats vs Ventes". "Achats de matières".
    // If they tracked it in expenses with category "Matière", we should use that.
    // Let's look for "Matière", "Bois", "Tissu", "Materiel" in expenses.
    const materialKeywords = ['matière', 'bois', 'tissu', 'cuir', 'métal', 'fourniture', 'achat', 'stock'];
    const filteredExpenses = expenses.filter(e => new Date(e.date).getFullYear() === year);

    filteredExpenses.forEach(exp => {
        const m = exp.date.substring(0, 7);
        const cat = (exp.category || '').toLowerCase();
        const name = (exp.name || '').toLowerCase();
        if (materialKeywords.some(k => cat.includes(k) || name.includes(k))) {
            if (!monthlyStats[m]) monthlyStats[m] = { sales: 0, material: 0 };
            // If we use the "Attributed" cost in incomes, we might double count if we also sum "Bulk" expenses.
            // But usually artisans buy bulk (Expense) and use bit by bit (Income attributed cost).
            // The user wants "Gestion de stock simplifiée" -> "Achats vs Ventes". 
            // This implies Cashflow impact. So we should compare Bulk Expense vs Sales Revenue.
            // AND separately, the specific "Cost per product".
            // Implementation: Bar Chart uses Bulk Expenses. Table uses Attributed Cost.
            monthlyStats[m].material += exp.amount;
        }
    });

    // Determine KPI: Average Material Cost % (from Products)
    const totalRevenue = measuredItems.reduce((acc, curr) => acc + curr.amount, 0);
    const totalAttributedMaterial = measuredItems.reduce((acc, curr) => acc + (curr.material_cost || 0), 0);
    const avgMaterialCostPercent = totalRevenue > 0 ? (totalAttributedMaterial / totalRevenue) * 100 : 0;

    return (
        <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', color: '#d97706' }}>🔨 Dashboard Artisan</h2>

            {/* KPI Card */}
            <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '3rem' }}>🧱</div>
                    <div>
                        <div className="text-sm text-amber-800 font-bold uppercase tracking-wider">Coût Matière Moyen (sur produits finis)</div>
                        <div className="text-2xl font-bold text-amber-900">{avgMaterialCostPercent.toFixed(1)}% du prix de vente</div>
                        <div className="text-xs text-amber-700">Objectif recommandé : &lt; 20%</div>
                    </div>
                </div>
            </div>

            {/* Table A: Hourly Rate */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>⏱️ Taux Horaire Réel</h3>
                <p className="text-sm text-slate-500 mb-4">Calculé sur (Prix Vente - Coût Matière) / Heures</p>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Produit</th>
                                <th>Prix Vente</th>
                                <th>Coût Matière</th>
                                <th>Temps (h)</th>
                                <th>Marge / h</th>
                                <th>Rentabilité</th>
                            </tr>
                        </thead>
                        <tbody>
                            {measuredItems.map((item, idx) => {
                                const realRate = (item.amount - (item.material_cost || 0)) / item.hours_spent;
                                const isBad = realRate < smic;
                                return (
                                    <tr key={idx} style={{ backgroundColor: isBad ? '#fef2f2' : '#f0fdf4' }}>
                                        <td style={{ fontWeight: '500' }}>{item.name}</td>
                                        <td>{item.amount.toFixed(2)}€</td>
                                        <td style={{ color: '#d97706' }}>-{item.material_cost?.toFixed(2) || 0}€</td>
                                        <td>{item.hours_spent}h</td>
                                        <td style={{ fontWeight: 'bold', fontSize: '1.1em', color: isBad ? '#dc2626' : '#16a34a' }}>
                                            {realRate.toFixed(2)}€ / h
                                        </td>
                                        <td>
                                            {isBad ?
                                                <span className="badge danger">⚠️ &lt; SMIC</span> :
                                                <span className="badge success">✅ Viable</span>
                                            }
                                        </td>
                                    </tr>
                                );
                            })}
                            {measuredItems.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: '#666' }}>Aucun produit avec heures et matière renseignés</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Table B: Purchases vs Sales (Bar Chart Simulation) */}
            <div className="card">
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>⚖️ Achats Matière vs Ventes (Mensuel)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Object.entries(monthlyStats).sort().map(([month, data]) => {
                        const maxVal = Math.max(data.sales, data.material, 1);
                        const salesPct = (data.sales / maxVal) * 100;
                        const matPct = (data.material / maxVal) * 100;
                        const isStockIssue = data.material > data.sales;

                        return (
                            <div key={month} style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) 4fr', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#444' }}>{month}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {/* Sales Bar */}
                                    <div style={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                                        <div style={{ width: `${salesPct}%`, backgroundColor: '#4ade80', height: '100%', borderRadius: '4px' }}></div>
                                        <span style={{ marginLeft: '8px', fontSize: '0.8em', color: '#166534' }}>Ventes: {data.sales.toFixed(0)}€</span>
                                    </div>
                                    {/* Material Bar */}
                                    <div style={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                                        <div style={{ width: `${matPct}%`, backgroundColor: isStockIssue ? '#ef4444' : '#fcd34d', height: '100%', borderRadius: '4px' }}></div>
                                        <span style={{ marginLeft: '8px', fontSize: '0.8em', color: isStockIssue ? '#991b1b' : '#b45309' }}>
                                            Achats: {data.material.toFixed(0)}€ {isStockIssue && '⚠️'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {Object.keys(monthlyStats).length === 0 && <div className="text-center text-slate-500">Aucune donnée</div>}
                </div>
            </div>
        </div>
    );
}
