import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { SlidersHorizontal, Lightbulb, X, Send, Crown, Lock } from 'lucide-react';
import PremiumSubscriptionBlock from '../ui/PremiumSubscriptionBlock';
import ExpenseStats from './widgets/ExpenseStats';
import EcommerceStats from './widgets/EcommerceStats';
import ArtisanStats from './widgets/ArtisanStats';
import CreatorStats from './widgets/CreatorStats';

import ServiceStats from './widgets/ServiceStats';
import VatDashboard from './VatDashboard';
import FiscalSummary from './widgets/FiscalSummary';
import RevenueChart from './charts/RevenueChart';
import ExpenseChart from './charts/ExpenseChart';

export default function StatsDashboard() {
    const { incomes: realIncomes, expenses: realExpenses, platforms, settings } = useFinance();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Fake Data Logic for Free Users
    const incomes = user.is_premium ? realIncomes : Array.from({ length: 50 }, (_, i) => ({
        id: `fake-inc-${i}`,
        amount: 2000 + Math.random() * 3000,
        date: new Date(new Date().getFullYear(), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
        platformId: platforms[0]?.id,
        status: 'confirmed'
    }));

    const expenses = user.is_premium ? realExpenses : Array.from({ length: 30 }, (_, i) => ({
        id: `fake-exp-${i}`,
        amount: 100 + Math.random() * 500,
        date: new Date(new Date().getFullYear(), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
        category: 'Logiciel',
        is_recurring: Math.random() > 0.8
    }));

    // Year Filtering
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Visibility State
    const [showConfig, setShowConfig] = useState(false);
    const [visibleSections, setVisibleSections] = useState({
        monthlyBalance: true,
        monthlyFixed: false,
        expenses: false,
        platforms: false,
        annualHistory: false,
        revenueChart: true,
        expenseChart: true
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

    // Fetch Goals for the chart
    const [goals, setGoals] = useState([]);
    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const res = await axios.get('http://localhost:3001/api/goals', { withCredentials: true });
                setGoals(res.data);
            } catch (err) {
                console.error("Error fetching goals for stats:", err);
            }
        };
        fetchGoals();
    }, []);

    // Suggestion State
    const [showSuggestionModal, setShowSuggestionModal] = useState(false);
    const [suggestionText, setSuggestionText] = useState('');
    const [suggestionSending, setSuggestionSending] = useState(false);
    const [suggestionSuccess, setSuggestionSuccess] = useState(false);

    const handleSendSuggestion = async () => {
        if (!suggestionText.trim()) return;
        setSuggestionSending(true);
        try {
            await axios.post('http://localhost:3001/api/contact/suggest', {
                suggestion: suggestionText
            }, { withCredentials: true });

            setSuggestionSuccess(true);
            setSuggestionText('');
            // Auto close after 2s
            setTimeout(() => {
                setShowSuggestionModal(false);
                setSuggestionSuccess(false);
            }, 2000);
        } catch (error) {
            console.error("Failed to send suggestion", error);
            alert("Erreur lors de l'envoi. Veuillez réessayer.");
        } finally {
            setSuggestionSending(false);
        }
    };

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

    const currentYear = new Date().getFullYear();
    // Ensure we have current year and the next one (for planning/viewing future)
    if (!availableYears.includes(currentYear)) availableYears.push(currentYear);
    if (!availableYears.includes(currentYear + 1)) availableYears.push(currentYear + 1);

    availableYears.sort((a, b) => b - a);

    // ... (lines 130-598)

    {/* Vat Dashboard Integration */ }
    <div className="my-8">
        <VatDashboard year={selectedYear} />
    </div>

    {/* Fiscal Summary */ }
    <div className="mt-8">
        <FiscalSummary year={selectedYear} />
    </div>

    // Filter Data by Year
    const filteredIncomes = incomes.filter(i => new Date(i.date).getFullYear() === selectedYear);
    const filteredExpenses = expenses.filter(e => new Date(e.date).getFullYear() === selectedYear);

    // Generate all 12 months for the selected year (descending order for display)
    const allMonths = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(selectedYear, 11 - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        return `${y}-${String(m).padStart(2, '0')}`;
    });

    // Helper calculation
    // Helper calculation
    const calculate = (inc) => {
        const p = platforms.find(pl => pl.id === inc.platformId) || { taxRate: 0, fixed_fee: 0, fee_vat_rate: 0 };
        const gross = inc.amount;

        // Fee Props
        const feeHT = (gross * (p.taxRate / 100)) + (p.fixed_fee || 0);
        const feeVat = feeHT * ((p.fee_vat_rate || 0) / 100);
        const feeTotal = feeHT + feeVat;

        // Effective Fee
        const effectiveFee = user?.is_subject_vat ? feeHT : feeTotal;

        // URSSAF
        const uRate = user?.role === 'ecommerce' ? (settings.urssaf_ecommerce || 12.3) : (settings.urssaf_freelance || 23.1); // Default to 23.1 not 25
        // Ideally we check tax_category too like IncomeTable but this is a dashboard summary.
        // Let's copy basic logic or simplistic one? Simplistic for now or better, use inc.tax_category.

        let urssafRate = uRate / 100;
        if (!user?.role || user?.role === 'freelance') {
            const type = inc.tax_category || 'bnc';
            if (type === 'bic') urssafRate = (settings.urssaf_freelance_bic || 21.2) / 100;
            else if (type === 'vente') urssafRate = (settings.urssaf_ecommerce || 12.3) / 100;
            else urssafRate = (settings.urssaf_freelance_bnc || 23.1) / 100;
        }

        const urssaf = gross * urssafRate;

        // Final
        const final = gross - effectiveFee - urssaf;

        // Reuse net1 as intermediate if needed (Gross - Fee)
        const net1 = gross - effectiveFee;

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
        <div className="relative">
            {/* Global Premium Overlay */}
            {!user.is_premium && (
                <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
                    <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 relative overflow-hidden transform hover:scale-105 transition-transform duration-300 sticky top-20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                                <Lock size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Premium Requis</h2>
                                <p className="text-sm text-slate-500">Accédez aux statistiques avancées</p>
                            </div>
                        </div>
                        <PremiumSubscriptionBlock />
                    </div>
                </div>
            )}

            <div className={`p-6 ${!user.is_premium ? 'opacity-80 pointer-events-none select-none filter blur-[2px] overflow-hidden max-h-[1200px]' : ''}`}>
                <div className="flex flex-col md:flex-row justify-end items-center gap-4 mb-6">
                    <div className="relative">
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            Gérer l'affichage
                        </button>
                        {showConfig && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                    <h4 className="font-bold text-sm text-slate-800">Personnalisation</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">Choisissez les sections à afficher</p>
                                </div>
                                <div className="p-2 space-y-1">
                                    {[
                                        { key: 'revenueChart', label: 'Évolution Chiffre d\'Affaires' },
                                        { key: 'expenseChart', label: 'Évolution Dépenses' },
                                        { key: 'monthlyBalance', label: 'Bilan par Mois' },
                                        { key: 'monthlyFixed', label: 'Dépenses Mensuelles' },
                                        { key: 'expenses', label: 'Dépenses Catégories' },
                                        { key: 'platforms', label: 'Détail Plateformes' },
                                        { key: 'annualHistory', label: 'Bilan Annuel' },
                                    ].map(({ key, label }) => {
                                        const isRestricted = key !== 'monthlyBalance';
                                        const isChecked = isRestricted ? (user.is_premium && visibleSections[key]) : visibleSections[key];
                                        const isDisabled = isRestricted && !user.is_premium;

                                        return (
                                            <label
                                                key={key}
                                                onClick={(e) => {
                                                    if (isDisabled) {
                                                        e.preventDefault();
                                                        navigate('/premium');
                                                    }
                                                }}
                                                className={`flex items-center justify-between p-3 rounded-lg transition-colors group cursor-pointer ${isDisabled ? 'hover:bg-amber-50' : 'hover:bg-slate-50'
                                                    }`}
                                            >
                                                <span className={`text-sm font-medium transition-colors ${isChecked ? 'text-slate-900' : isDisabled ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {label}
                                                </span>

                                                <div className="flex items-center gap-3">
                                                    {isDisabled && (
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex items-center gap-1">
                                                            <Crown size={10} className="fill-amber-700" />
                                                            Premium
                                                        </span>
                                                    )}

                                                    <div className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!isChecked}
                                                            onChange={() => {
                                                                if (!isDisabled) toggleSection(key);
                                                            }}
                                                            disabled={false}
                                                            className="sr-only peer"
                                                            readOnly
                                                        />
                                                        <div className={`w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isChecked ? 'peer-checked:bg-indigo-600' : ''} ${isDisabled ? 'opacity-50' : ''}`}></div>
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
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

                {/* Revenue & Expense Charts (Premium Only) */}
                {user.is_premium && (
                    <>
                        {visibleSections.revenueChart && <RevenueChart data={statsByMonth} goals={goals} year={selectedYear} />}
                        {visibleSections.expenseChart && <ExpenseChart data={statsByMonth} goals={goals} year={selectedYear} />}
                    </>
                )}

                {
                    user.is_premium && visibleSections.annualHistory && (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
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
                    )
                }

                {/* Expense Stats by Category */}
                {user.is_premium && visibleSections.expenses && <ExpenseStats expenses={filteredExpenses} />}

                {visibleSections.monthlyBalance && (
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
                                    {allMonths.map(month => {
                                        const item = statsByMonth[month] || { income: 0, expense: 0, profit: 0 };
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
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {
                    user.is_premium && visibleSections.platforms && (
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
                    )
                }
                {/* Recurring Expenses Table */}
                {
                    user.is_premium && visibleSections.monthlyFixed && (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-slate-800">Dépenses Mensuelles (Fixes)</h2>
                                <div className="bg-red-50 border border-red-100 px-3 py-1 rounded-lg flex items-center gap-2">
                                    <span className="text-slate-600 font-medium text-sm">Total Annuel:</span>
                                    <span className="text-lg font-bold text-red-600">
                                        {expenses.filter(e => e.is_recurring && new Date(e.date).getFullYear() === selectedYear).reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}€
                                    </span>
                                </div>
                            </div>

                            {/* Active Recurring Summary */}
                            <div className="mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Charges Fixes Actives (Récapitulatif)</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="px-4 py-2 font-semibold text-slate-500">Nom</th>
                                                <th className="px-4 py-2 font-semibold text-slate-500">Catégorie</th>
                                                <th className="px-4 py-2 font-semibold text-slate-500 text-right">Coût Mensuel</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {(() => {
                                                const uniqueRecurring = Object.values(
                                                    expenses
                                                        .filter(e => e.is_recurring && new Date(e.date).getFullYear() === selectedYear)
                                                        .reduce((acc, curr) => {
                                                            if (!acc[curr.name] || new Date(curr.date) > new Date(acc[curr.name].date)) {
                                                                acc[curr.name] = curr;
                                                            }
                                                            return acc;
                                                        }, {})
                                                );

                                                if (uniqueRecurring.length === 0) {
                                                    return <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-400 italic">Aucune charge active détectée</td></tr>;
                                                }

                                                return uniqueRecurring.map(e => {
                                                    const isAnnual = e.frequency === 'annual';
                                                    const monthlyCost = isAnnual ? e.amount / 12 : e.amount;

                                                    return (
                                                        <tr key={e.id}>
                                                            <td className="px-4 py-2 font-medium text-slate-800">
                                                                {e.name}
                                                                {isAnnual && <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">Annuel</span>}
                                                            </td>
                                                            <td className="px-4 py-2"><span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-600">{e.category || 'Autre'}</span></td>
                                                            <td className="px-4 py-2 text-right font-bold text-red-600">
                                                                {monthlyCost.toFixed(2)}€
                                                                {isAnnual && <span className="block text-[10px] text-slate-400 font-normal">({e.amount.toFixed(2)}€/an)</span>}
                                                            </td>
                                                        </tr>
                                                    )
                                                });
                                            })()}
                                        </tbody>
                                        {/* Monthly Total Row */}
                                        <tfoot className="border-t border-slate-200 bg-slate-100/50">
                                            <tr>
                                                <td colSpan={2} className="px-4 py-2 text-right font-bold text-slate-600">Total Mensuel Estimé:</td>
                                                <td className="px-4 py-2 text-right font-bold text-red-700">
                                                    {Object.values(
                                                        expenses
                                                            .filter(e => e.is_recurring && new Date(e.date).getFullYear() === selectedYear)
                                                            .reduce((acc, curr) => {
                                                                if (!acc[curr.name] || new Date(curr.date) > new Date(acc[curr.name].date)) {
                                                                    acc[curr.name] = curr;
                                                                }
                                                                return acc;
                                                            }, {})
                                                    ).reduce((sum, e) => sum + (e.frequency === 'annual' ? e.amount / 12 : e.amount), 0).toFixed(2)}€
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                        </div>
                    )
                }
                {/* VAT Dashboard Integration */}
                <div className="my-8">
                    <VatDashboard />
                </div>

                {/* Fiscal Summary */}
                <div className="mt-8">
                    <FiscalSummary />
                </div>

                {/* Show More Tables Button if any are hidden */}
                {
                    (!visibleSections.monthlyFixed || !visibleSections.expenses || !visibleSections.platforms || !visibleSections.annualHistory) && (
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={() => {
                                    setShowConfig(true);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-6 py-3 bg-white border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-bold shadow-sm"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Afficher plus de tableaux
                            </button>
                        </div>
                    )
                }



                {/* Suggestion Button - Always visible at bottom */}
                <div className="mt-12 flex justify-center pb-8 border-t border-slate-100 pt-8">
                    <button
                        onClick={() => setShowSuggestionModal(true)}
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium"
                    >
                        <Lightbulb className="w-4 h-4" />
                        Suggérer un nouveau tableau
                    </button>
                </div>

                {/* Suggestion Modal */}
                {
                    showSuggestionModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Lightbulb className="w-5 h-5 text-indigo-600" />
                                        Idée de Tableau
                                    </h3>
                                    <button
                                        onClick={() => setShowSuggestionModal(false)}
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-6">
                                    {suggestionSuccess ? (
                                        <div className="text-center py-8">
                                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
                                                <Send className="w-8 h-8" />
                                            </div>
                                            <h4 className="text-xl font-bold text-slate-800 mb-2">Envoyé !</h4>
                                            <p className="text-slate-500">Merci pour votre suggestion. Nous allons l'étudier avec attention.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm text-slate-600 mb-4">
                                                Décrivez le tableau ou la fonctionnalité qui vous manque. Votre idée sera envoyée directement à l'équipe.
                                            </p>
                                            <textarea
                                                value={suggestionText}
                                                onChange={(e) => setSuggestionText(e.target.value)}
                                                placeholder="Ex: J'aimerais un tableau qui compare mes dépenses fixes par rapport..."
                                                className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-slate-700 text-sm mb-4"
                                            ></textarea>
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => setShowSuggestionModal(false)}
                                                    className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-50 rounded-lg transition-colors"
                                                >
                                                    Annuler
                                                </button>
                                                <button
                                                    onClick={handleSendSuggestion}
                                                    disabled={!suggestionText.trim() || suggestionSending}
                                                    className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {suggestionSending ? 'Envoi...' : (
                                                        <>
                                                            <span>Envoyer</span>
                                                            <Send className="w-3 h-3" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div>
    );
}
