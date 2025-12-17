import { useState, useEffect } from 'react';
import axios from 'axios';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import ExpenseStats from './ExpenseStats';
import EcommerceStats from './EcommerceStats';
import ArtisanStats from './ArtisanStats';
import CreatorStats from './CreatorStats';
import ServiceStats from './ServiceStats';

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
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-end items-center gap-4 mb-6">
                <div className="relative">
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                    >
                        ⚙️ Personnaliser
                    </button>
                    {showConfig && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-4">
                            <h4 className="font-bold text-sm text-slate-800 mb-3 border-b border-slate-100 pb-2">Affichage</h4>
                            <div className="space-y-2">
                                {[
                                    { key: 'monthlyFixed', label: 'Dépenses Mensuelles' },
                                    { key: 'expenses', label: 'Répartition Catégories' },
                                    { key: 'platforms', label: 'Détail Plateformes' },
                                    { key: 'annualHistory', label: 'Bilan Annuel' },
                                ].map(({ key, label }) => (
                                    <label key={key} className={`flex items-center gap-2 text-sm ${user.is_premium ? 'cursor-pointer text-slate-700 hover:text-indigo-600' : 'cursor-not-allowed text-slate-400'}`}>
                                        <input
                                            type="checkbox"
                                            checked={user.is_premium && visibleSections[key]}
                                            onChange={() => user.is_premium && toggleSection(key)}
                                            disabled={!user.is_premium}
                                            className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                        />
                                        <span>{label}</span>
                                        {!user.is_premium && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">PREMIUM</span>}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-300 p-1">
                    <span className="text-sm font-semibold text-slate-500 px-2">Année :</span>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                        className="text-sm border-none focus:ring-0 text-slate-700 font-bold bg-transparent cursor-pointer py-1 pr-8"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Premium Role Dashboards */}
            {user.role === 'ecommerce' && user.is_premium && (
                <EcommerceStats year={selectedYear} />
            )}
            {user.role === 'artisan' && (
                <ArtisanStats year={selectedYear} />
            )}
            {user.role === 'creator' && (
                <CreatorStats year={selectedYear} />
            )}
            {user.role === 'field_service' && (
                <ServiceStats year={selectedYear} />
            )}

            {/* Global Summary Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Bilan Global {selectedYear}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                        <div className="text-sm font-medium text-emerald-600 mb-1">Total Recettes (Net)</div>
                        <div className="text-2xl font-bold text-emerald-700">{globalTotal.income.toFixed(2)}€</div>
                    </div>
                    <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                        <div className="text-sm font-medium text-red-600 mb-1">Total Dépenses</div>
                        <div className="text-2xl font-bold text-red-700">{globalTotal.expense.toFixed(2)}€</div>
                    </div>
                    <div className={`p-4 rounded-xl border ${globalTotal.profit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                        <div className={`text-sm font-medium mb-1 ${globalTotal.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Résultat Net</div>
                        <div className={`text-2xl font-bold ${globalTotal.profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                            {globalTotal.profit > 0 ? '+' : ''}{globalTotal.profit.toFixed(2)}€
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                        <div className="text-sm font-medium text-indigo-600 mb-1">TJM Moyen</div>
                        <div className="text-2xl font-bold text-indigo-700">
                            {avgTjm > 0 ? Math.round(avgTjm) + '€' : '-'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recurring Expenses Table */}
            {user.is_premium && visibleSections.monthlyFixed && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-800">Dépenses Mensuelles (Fixes)</h2>
                        <div className="bg-red-50 border border-red-100 px-3 py-1 rounded-lg flex items-center gap-2">
                            <span className="text-slate-600 font-medium text-sm">Total:</span>
                            <span className="text-lg font-bold text-red-600">
                                {expenses.filter(e => e.is_recurring).reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}€
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="px-4 py-3 font-semibold text-slate-500">Nom</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500">Catégorie</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {expenses.filter(e => e.is_recurring).map(e => (
                                    <tr key={e.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">{e.name}</td>
                                        <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{e.category || 'Autre'}</span></td>
                                        <td className="px-4 py-3 text-right font-bold text-red-600">{e.amount.toFixed(2)}€</td>
                                    </tr>
                                ))}
                                {expenses.filter(e => e.is_recurring).length === 0 && (
                                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">Aucune charge fixe définie</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Expense Stats by Category */}
            {user.is_premium && visibleSections.expenses && <ExpenseStats year={selectedYear} />}

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                <h2 className="text-lg font-bold text-slate-800 mb-6">Bilan par Mois</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="px-4 py-3 font-semibold text-slate-500">Mois</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 text-right">Recettes (Net)</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 text-right">Dépenses</th>
                                <th className="px-4 py-3 font-semibold text-slate-500 text-right">Bénéfice / Déficit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {Object.entries(statsByMonth).sort().reverse().map(([month, item]) => {
                                const [y, m] = month.split('-');
                                const dateObj = new Date(parseInt(y), parseInt(m) - 1);
                                const displayDate = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                                const capitalizedDate = displayDate.charAt(0).toUpperCase() + displayDate.slice(1);

                                return (
                                    <tr key={month} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900 capitalize">{capitalizedDate}</td>
                                        <td className="px-4 py-3 text-right font-medium text-emerald-600">+{item.income.toFixed(2)}€</td>
                                        <td className="px-4 py-3 text-right font-medium text-red-600">-{item.expense.toFixed(2)}€</td>
                                        <td className={`px-4 py-3 text-right font-bold ${item.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                            {item.profit > 0 ? '+' : ''}{item.profit.toFixed(2)}€
                                        </td>
                                    </tr>
                                );
                            })}
                            {Object.keys(statsByMonth).length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">Aucune donnée pour cette année</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {user.is_premium && visibleSections.platforms && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Détail Revenus par Plateforme</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="px-4 py-3 font-semibold text-slate-500">Plateforme</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-right">CA Brut</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-right">Net Interm.</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-right">Net Final</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {Object.values(byPlatform).map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700 font-medium">{item.name}</span></td>
                                        <td className="px-4 py-3 text-right text-slate-600">{item.gross.toFixed(2)}€</td>
                                        <td className="px-4 py-3 text-right text-slate-500">{item.net1.toFixed(2)}€</td>
                                        <td className="px-4 py-3 text-right font-bold text-emerald-600">{item.final.toFixed(2)}€</td>
                                    </tr>
                                ))}
                                {Object.keys(byPlatform).length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">Aucune donnée</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {user.is_premium && visibleSections.annualHistory && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Bilan par Année</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="px-4 py-3 font-semibold text-slate-500">Année</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-right">Recettes (Net)</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-right">Dépenses</th>
                                    <th className="px-4 py-3 font-semibold text-slate-500 text-right">Bénéfice / Déficit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedYears.map(year => {
                                    const st = statsByYear[year];
                                    return (
                                        <tr key={year} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-bold text-slate-800">{year}</td>
                                            <td className="px-4 py-3 text-right font-medium text-emerald-600">+{st.income.toFixed(2)}€</td>
                                            <td className="px-4 py-3 text-right font-medium text-red-600">-{st.expense.toFixed(2)}€</td>
                                            <td className={`px-4 py-3 text-right font-bold ${st.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                                {st.profit > 0 ? '+' : ''}{st.profit.toFixed(2)}€
                                            </td>
                                        </tr>
                                    );
                                })}
                                {sortedYears.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">Aucune donnée</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
