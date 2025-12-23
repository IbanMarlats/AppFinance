import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Target, TrendingUp, AlertCircle, ChevronLeft, ChevronRight, Save, CheckCircle2, Lock, Calculator, ArrowDown } from 'lucide-react';
import PremiumSubscriptionBlock from '../ui/PremiumSubscriptionBlock';
import { useAuth } from '../../context/AuthContext';

export default function GoalsDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [year, setYear] = useState(new Date().getFullYear());
    const [goals, setGoals] = useState([]);
    const [stats, setStats] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        monthlyIncome: {},
        monthlyExpenses: {}
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null); // 'revenue-year', 'expense-year', 'month-idx-type'

    // Form states
    const [yearRevenueGoal, setYearRevenueGoal] = useState('');
    const [yearExpenseLimit, setYearExpenseLimit] = useState('');
    const [monthlyGoals, setMonthlyGoals] = useState({});


    useEffect(() => {
        fetchData();
    }, [year, user]);

    const fetchData = async () => {
        setLoading(true);

        // FREE VERSION: FAKE DATA + BLUR
        if (!user.is_premium) {
            // Fake Goals
            const fakeGoals = [
                { type: 'revenue', period: 'year', target_amount: 150000, period_key: String(year) },
                { type: 'expense', period: 'year', target_amount: 50000, period_key: String(year) }
            ];

            // Fake Stats
            const fakeStats = {
                totalIncome: 124500.50,
                totalExpenses: 42300.20,
                monthlyIncome: {},
                monthlyExpenses: {}
            };

            // Populate monthly fake data
            for (let i = 1; i <= 12; i++) {
                const k = `${year}-${String(i).padStart(2, '0')}`;
                fakeStats.monthlyIncome[k] = 10000 + (Math.random() * 5000);
                fakeStats.monthlyExpenses[k] = 3000 + (Math.random() * 2000);

                // Add fake monthly goals
                fakeGoals.push({ type: 'revenue', period: 'month', target_amount: 12500, period_key: k });
                fakeGoals.push({ type: 'expense', period: 'month', target_amount: 4000, period_key: k });
            }

            setGoals(fakeGoals);
            setStats(fakeStats);
            initializeInputs(fakeGoals);
            setLoading(false);
            return;
        }

        try {
            // Fetch Goals
            const goalsRes = await axios.get('http://localhost:3001/api/goals', { withCredentials: true });
            setGoals(goalsRes.data);

            // Fetch Actual Data (Incomes & Expenses) for the year
            // Note: In a real app we might want a specific endpoint for 'yearly summary' to avoid heavy payload
            // Reusing existing valid endpoints
            const [incomesRes, expensesRes] = await Promise.all([
                axios.get('http://localhost:3001/api/incomes', { withCredentials: true }),
                axios.get('http://localhost:3001/api/expenses', { withCredentials: true })
            ]);

            processStats(incomesRes.data, expensesRes.data);
            initializeInputs(goalsRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const processStats = (incomes, expenses) => {
        let yIncome = 0;
        let yExpenses = 0;
        const mIncome = {};
        const mExpenses = {};

        incomes.forEach(inc => {
            const d = new Date(inc.date);
            if (d.getFullYear() === year) {
                yIncome += inc.amount;
                const mKey = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                mIncome[mKey] = (mIncome[mKey] || 0) + inc.amount;
            }
        });

        expenses.forEach(exp => {
            const d = new Date(exp.date);
            if (d.getFullYear() === year) {
                yExpenses += exp.amount;
                const mKey = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                mExpenses[mKey] = (mExpenses[mKey] || 0) + exp.amount;
            }
        });

        setStats({
            totalIncome: yIncome,
            totalExpenses: yExpenses,
            monthlyIncome: mIncome,
            monthlyExpenses: mExpenses
        });
    };

    const initializeInputs = (fetchedGoals) => {
        const yRev = fetchedGoals.find(g => g.type === 'revenue' && g.period === 'year' && g.period_key === String(year));
        if (yRev) setYearRevenueGoal(yRev.target_amount);

        const yExp = fetchedGoals.find(g => g.type === 'expense' && g.period === 'year' && g.period_key === String(year));
        if (yExp) setYearExpenseLimit(yExp.target_amount);

        const mGoalsObj = {};
        fetchedGoals.forEach(g => {
            if (g.period === 'month' && g.period_key.startsWith(String(year))) {
                mGoalsObj[`${g.period_key}-${g.type}`] = g.target_amount;
            }
        });
        setMonthlyGoals(mGoalsObj);
    };

    const saveGoal = async (type, period, amount, periodKey, saveId) => {
        setSaving(saveId);
        try {
            await axios.post('http://localhost:3001/api/goals', {
                type,
                period,
                target_amount: parseFloat(amount),
                period_key: periodKey
            }, { withCredentials: true });

            // Refresh local goals state without full reload
            const newGoal = { type, period, target_amount: parseFloat(amount), period_key: periodKey };
            setGoals(prev => {
                const filtered = prev.filter(g => !(g.type === type && g.period === period && g.period_key === periodKey));
                return [...filtered, newGoal];
            });

            setTimeout(() => setSaving(null), 1000);
        } catch (error) {
            console.error("Save failed", error);
            setSaving(null);
            alert("Erreur de sauvegarde");
        }
    };

    const handleMonthlyChange = (monthIdx, type, value) => {
        const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
        setMonthlyGoals(prev => ({
            ...prev,
            [`${monthKey}-${type}`]: value
        }));
    };

    const months = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const getGoalValue = (type, period, key) => {
        return goals.find(g => g.type === type && g.period === period && g.period_key === key)?.target_amount || 0;
    };

    // Calculate annual / 12 and distribute to months
    const distributeAnnual = async (type) => {
        if (!user.is_premium) return alert("Fonctionnalité Premium requise pour gérer les mois.");

        const annualAmount = type === 'revenue' ? parseFloat(yearRevenueGoal) : parseFloat(yearExpenseLimit);
        if (!annualAmount || isNaN(annualAmount)) return;

        const monthlyAmount = (annualAmount / 12).toFixed(2);

        if (!confirm(`Voulez-vous définir ${monthlyAmount}€ pour chaque mois (basé sur l'objectif annuel) ?`)) return;

        // Optimistic update
        const newMonthlyGoals = { ...monthlyGoals };
        const promises = [];

        months.forEach((_, idx) => {
            const mKey = `${year}-${String(idx + 1).padStart(2, '0')}`;
            newMonthlyGoals[`${mKey}-${type}`] = monthlyAmount;

            // Prepare API call
            promises.push(axios.post('http://localhost:3001/api/goals', {
                type,
                period: 'month',
                target_amount: parseFloat(monthlyAmount),
                period_key: mKey
            }, { withCredentials: true }));
        });

        setMonthlyGoals(newMonthlyGoals);
        setSaving(`distribute-${type}`);

        try {
            await Promise.all(promises);
            // Refresh goals from server to be sure
            const goalsRes = await axios.get('http://localhost:3001/api/goals', { withCredentials: true });
            setGoals(goalsRes.data);
            setSaving(null);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la distribution");
            setSaving(null);
        }
    };

    // Sum all monthly goals to annual
    const sumMonthly = async (type) => {
        if (!user.is_premium) return alert("Fonctionnalité Premium requise.");

        let total = 0;
        months.forEach((_, idx) => {
            const mKey = `${year}-${String(idx + 1).padStart(2, '0')}`;
            const val = parseFloat(monthlyGoals[`${mKey}-${type}`]);
            if (!isNaN(val)) total += val;
        });

        if (!confirm(`Voulez-vous définir l'objectif annuel à ${total.toFixed(2)}€ (somme des mois) ?`)) return;

        if (type === 'revenue') setYearRevenueGoal(total.toFixed(2));
        else setYearExpenseLimit(total.toFixed(2));

        setSaving(`sum-${type}`);

        try {
            await axios.post('http://localhost:3001/api/goals', {
                type,
                period: 'year',
                target_amount: total,
                period_key: String(year)
            }, { withCredentials: true });

            // Refresh goals
            const goalsRes = await axios.get('http://localhost:3001/api/goals', { withCredentials: true });
            setGoals(goalsRes.data);
            setSaving(null);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la mise à jour annuelle");
            setSaving(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative">
            {/* Global Premium Overlay */}
            {!user.is_premium && (
                <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
                    <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 relative overflow-hidden transform hover:scale-105 transition-transform duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                                <Lock size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Premium Requis</h2>
                                <p className="text-sm text-slate-500">Débloquez vos objectifs financiers</p>
                            </div>
                        </div>
                        <PremiumSubscriptionBlock />
                    </div>
                </div>
            )}

            {/* Main Content (Blurred/Disabled if not premium) */}
            <div className={`space-y-8 ${!user.is_premium ? 'opacity-80 pointer-events-none select-none filter blur-[2px]' : ''}`}>
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Target className="text-indigo-600" />
                            Objectifs Financiers
                        </h1>
                        <p className="text-slate-500">Définissez et suivez vos cibles annuelles et mensuelles.</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                        <button onClick={() => setYear(year - 1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-bold text-lg text-slate-800 w-16 text-center">{year}</span>
                        <button onClick={() => setYear(year + 1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Annual Goals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Revenue Goal */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Objectif CA Annuel</h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-slate-500">Chiffre d'Affaires Cible</p>
                                        {user.is_premium && (
                                            <button
                                                onClick={() => distributeAnnual('revenue')}
                                                className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 border border-slate-200 flex items-center gap-1"
                                                title="Répartir ce montant sur les 12 mois"
                                            >
                                                <ArrowDown size={12} />
                                                Répartir sur les mois
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 relative">
                                <input
                                    type="number"
                                    value={yearRevenueGoal}
                                    onChange={e => setYearRevenueGoal(e.target.value)}
                                    onBlur={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                            const formatted = val.toFixed(2);
                                            setYearRevenueGoal(formatted);
                                            saveGoal('revenue', 'year', formatted, String(year), 'revenue-year');
                                        }
                                    }}
                                    placeholder="0.00"
                                    className="w-32 text-right font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none pr-8"
                                />
                                {saving === 'revenue-year' && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-2 flex justify-between text-sm font-medium">
                            <span className="text-slate-600">Réalisé: {stats.totalIncome.toFixed(2)}€</span>
                            <span className="text-slate-600">Cible: {parseFloat(yearRevenueGoal || 0).toFixed(2)}€</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${(stats.totalIncome >= (parseFloat(yearRevenueGoal) || 1)) ? 'bg-emerald-500' : 'bg-indigo-500'
                                    }`}
                                style={{ width: `${Math.min(((stats.totalIncome / (parseFloat(yearRevenueGoal) || 1)) * 100), 100)}%` }}
                            ></div>
                        </div>
                        <div className="mt-2 text-right text-xs font-bold text-slate-500">
                            {((stats.totalIncome / (parseFloat(yearRevenueGoal) || 1)) * 100).toFixed(1)}% atteint
                        </div>
                    </div>

                    {/* Expense Limit */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Limite Dépenses</h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-slate-500">Budget Maximum Annuel</p>
                                        {user.is_premium && (
                                            <button
                                                onClick={() => distributeAnnual('expense')}
                                                className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 border border-slate-200 flex items-center gap-1"
                                                title="Répartir ce montant sur les 12 mois"
                                            >
                                                <ArrowDown size={12} />
                                                Répartir sur les mois
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 relative">
                                <input
                                    type="number"
                                    value={yearExpenseLimit}
                                    onChange={e => setYearExpenseLimit(e.target.value)}
                                    onBlur={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) {
                                            const formatted = val.toFixed(2);
                                            setYearExpenseLimit(formatted);
                                            saveGoal('expense', 'year', formatted, String(year), 'expense-year');
                                        }
                                    }}
                                    placeholder="0.00"
                                    className="w-32 text-right font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none pr-8"
                                />
                                {saving === 'expense-year' && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-2 flex justify-between text-sm font-medium">
                            <span className="text-slate-600">Dépensé: {stats.totalExpenses.toFixed(2)}€</span>
                            <span className="text-slate-600">Limite: {parseFloat(yearExpenseLimit || 0).toFixed(2)}€</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${(stats.totalExpenses > (parseFloat(yearExpenseLimit) || Infinity)) ? 'bg-red-500' : 'bg-emerald-500'
                                    }`}
                                style={{ width: `${Math.min(((stats.totalExpenses / (parseFloat(yearExpenseLimit) || 1)) * 100), 100)}%` }}
                            ></div>
                        </div>
                        <div className="mt-2 text-right text-xs font-bold text-slate-500">
                            {((stats.totalExpenses / (parseFloat(yearExpenseLimit) || 1)) * 100).toFixed(1)}% utilisé
                        </div>
                    </div>
                </div>

                {/* Monthly Goals Grid */}
                <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative`}>

                    <div className={`p-6 border-b border-slate-100 flex justify-between items-center`}>
                        <h2 className="font-bold text-lg text-gray-900">Objectifs Mensuels</h2>
                        {user.is_premium && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => sumMonthly('revenue')}
                                    className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-100 flex items-center gap-1.5"
                                >
                                    <Calculator size={14} />
                                    Totaliser CA vers Annuel
                                </button>
                                <button
                                    onClick={() => sumMonthly('expense')}
                                    className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-medium hover:bg-red-100 flex items-center gap-1.5"
                                >
                                    <Calculator size={14} />
                                    Totaliser Dép. vers Annuel
                                </button>
                            </div>
                        )}
                    </div>
                    <div className={`overflow-x-auto`}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                    <th className="p-4 font-semibold border-r border-slate-200 w-32 bg-slate-100">Période</th>
                                    <th colSpan={2} className="p-2 font-bold text-center border-r-4 border-slate-200 bg-emerald-50/50 text-emerald-800">
                                        Revenus (CA)
                                    </th>
                                    <th colSpan={2} className="p-2 font-bold text-center bg-red-50/50 text-red-800">
                                        Dépenses
                                    </th>
                                </tr>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 text-center">
                                    <th className="p-3 font-semibold border-r border-slate-200 bg-slate-100">Mois</th>
                                    <th className="p-3 font-semibold border-r border-slate-100 bg-emerald-50/20">Objectif</th>
                                    <th className="p-3 font-semibold border-r-4 border-slate-200 bg-emerald-50/20">Réalisé</th>
                                    <th className="p-3 font-semibold border-r border-slate-100 bg-red-50/20">Limite</th>
                                    <th className="p-3 font-semibold bg-red-50/20">Dépensé</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {months.map((monthName, idx) => {
                                    const mKey = `${year}-${String(idx + 1).padStart(2, '0')}`;
                                    const revGoal = monthlyGoals[`${mKey}-revenue`] || '';
                                    const expLimit = monthlyGoals[`${mKey}-expense`] || '';
                                    const actualRev = stats.monthlyIncome[mKey] || 0;
                                    const actualExp = stats.monthlyExpenses[mKey] || 0;

                                    // Revenue Progress Color
                                    const revProgress = revGoal ? (actualRev / parseFloat(revGoal)) : 0;
                                    const revColor = revProgress >= 1 ? 'text-emerald-700 bg-emerald-100 font-bold' : 'text-slate-600';

                                    // Expense Alert Color
                                    const expAlert = expLimit && actualExp > parseFloat(expLimit);
                                    const expColor = expAlert ? 'text-red-700 bg-red-100 font-bold' : 'text-slate-600';

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-4 font-bold text-slate-700 border-r border-slate-200 bg-slate-50/30">{monthName}</td>

                                            {/* REVENUE COLUMN GROUP */}
                                            <td className="p-4 text-center border-r border-slate-100 bg-emerald-50/5">
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        value={revGoal}
                                                        onChange={e => handleMonthlyChange(idx, 'revenue', e.target.value)}
                                                        onBlur={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            const formatted = isNaN(val) ? '' : val.toFixed(2);
                                                            handleMonthlyChange(idx, 'revenue', formatted);
                                                            if (formatted) saveGoal('revenue', 'month', formatted, mKey, `rev-${idx}`);
                                                        }}
                                                        placeholder="0.00"
                                                        className="w-24 text-center bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-emerald-900 placeholder-slate-300"
                                                    />
                                                    {saving === `rev-${idx}` && (
                                                        <div className="absolute -right-3 top-1/2 -translate-y-1/2">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center border-r-4 border-slate-200 bg-emerald-50/5">
                                                <span className={`px-2 py-1 rounded ${revColor}`}>
                                                    {actualRev.toFixed(2)}€
                                                </span>
                                            </td>

                                            {/* EXPENSE COLUMN GROUP */}
                                            <td className="p-4 text-center border-r border-slate-100 bg-red-50/5">
                                                <div className="relative group">
                                                    <input
                                                        type="number"
                                                        value={expLimit}
                                                        onChange={e => handleMonthlyChange(idx, 'expense', e.target.value)}
                                                        onBlur={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            const formatted = isNaN(val) ? '' : val.toFixed(2);
                                                            handleMonthlyChange(idx, 'expense', formatted);
                                                            if (formatted) saveGoal('expense', 'month', formatted, mKey, `exp-${idx}`);
                                                        }}
                                                        placeholder="0.00"
                                                        className="w-24 text-center bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-red-500 outline-none font-medium text-red-900 placeholder-slate-300"
                                                    />
                                                    {saving === `exp-${idx}` && (
                                                        <div className="absolute -right-3 top-1/2 -translate-y-1/2">
                                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center bg-red-50/5">
                                                <span className={`px-2 py-1 rounded ${expColor}`}>
                                                    {actualExp.toFixed(2)}€
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
