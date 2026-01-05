import { useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, TrendingUp, Wallet, ArrowRight } from 'lucide-react';

export default function VatDashboard({ year }) {
    const { incomes, expenses } = useFinance();
    const { user } = useAuth();

    // Use prop if passed, else default to current
    const currentYear = year || new Date().getFullYear();

    // Determine thresholds based on role (defaulting to BNC/Services)
    const isBIC = user?.role === 'freelance_bic' || user?.role === 'ecommerce';

    // 2025/2026 Thresholds (approx.)
    // User requested 37500 for VAT BNC.
    const VAT_THRESHOLD = isBIC ? 91900 : 37500;  // Franchise en base
    const MICRO_THRESHOLD = isBIC ? 188700 : 77700; // Plafond Micro

    const roleLabel = isBIC ? 'Vente / BIC' : 'Services / BNC';

    // Filter incomes and expenses for current year
    const yearlyStats = useMemo(() => {
        const incomeStats = incomes
            .filter(inc => new Date(inc.date).getFullYear() === currentYear)
            .reduce((acc, curr) => {
                acc.totalHT += curr.amount; // amount is HT
                acc.totalVAT += (curr.vat_amount || 0);
                return acc;
            }, { totalHT: 0, totalVAT: 0 });

        const expenseStats = expenses
            .filter(exp => new Date(exp.date).getFullYear() === currentYear)
            .reduce((acc, curr) => {
                acc.totalVATDeductible += (curr.vat_amount || 0);
                return acc;
            }, { totalVATDeductible: 0 });

        return { ...incomeStats, ...expenseStats };
    }, [incomes, expenses, currentYear]);

    const vatProgress = Math.min((yearlyStats.totalHT / VAT_THRESHOLD) * 100, 100);
    const microProgress = Math.min((yearlyStats.totalHT / MICRO_THRESHOLD) * 100, 100);

    const remainingVat = Math.max(VAT_THRESHOLD - yearlyStats.totalHT, 0);
    const remainingMicro = Math.max(MICRO_THRESHOLD - yearlyStats.totalHT, 0);

    const vatBalance = yearlyStats.totalVAT - yearlyStats.totalVATDeductible;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* Header Simplified */}
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Suivi Fiscal {currentYear}</h3>
                        <p className="text-xs text-slate-400 font-medium">{roleLabel}</p>
                    </div>
                </div>
                {yearlyStats.totalHT > VAT_THRESHOLD && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-full">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Assujetti TVA</span>
                    </div>
                )}
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">

                {/* 1. CA HT Main Focus */}
                <div className="col-span-1 border-r border-slate-100 pr-6 hidden lg:block">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Chiffre d'Affaires HT</p>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">
                        {yearlyStats.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€
                    </div>
                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                        <span>Plafond: {MICRO_THRESHOLD.toLocaleString()}€</span>
                        <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                        <span>{(microProgress).toFixed(1)}%</span>
                    </div>
                </div>

                {/* Mobile version of CA (if needed) or merged */}
                <div className="lg:hidden">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Chiffre d'Affaires HT</p>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">
                        {yearlyStats.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€
                    </div>
                </div>

                {/* 2. Compact Gauges */}
                <div className="col-span-1 space-y-5">

                    {/* TVA Threshold */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-bold text-slate-700">Seuil TVA</span>
                            <span className="text-xs font-medium text-slate-500">{yearlyStats.totalHT.toFixed(0)} / {VAT_THRESHOLD.toLocaleString()}€</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${yearlyStats.totalHT > VAT_THRESHOLD ? 'bg-amber-500' : 'bg-indigo-600'}`}
                                style={{ width: `${Math.max(vatProgress, 2)}%` }}
                            />
                        </div>
                        {remainingVat > 0 && (
                            <p className="text-[10px] text-slate-400 mt-1 text-right">encore {remainingVat.toLocaleString()}€</p>
                        )}
                    </div>

                    {/* Micro Threshold */}
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-bold text-slate-700">Plafond Micro</span>
                            <span className="text-xs font-medium text-slate-500">{yearlyStats.totalHT.toFixed(0)} / {MICRO_THRESHOLD.toLocaleString()}€</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${yearlyStats.totalHT > MICRO_THRESHOLD ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.max(microProgress, 2)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Minimalist TVA Treasury */}
                <div className="col-span-1 bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Wallet className="w-4 h-4 text-slate-400" />
                        <h4 className="font-bold text-slate-700 text-sm">TVA à reverser</h4>
                    </div>

                    <div className={`text-2xl font-black mb-2 ${vatBalance > 0 ? 'text-slate-800' : 'text-emerald-600'}`}>
                        {vatBalance > 0 ? vatBalance.toFixed(2) : 0}€
                    </div>

                    {/* Collapsed details */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-200">
                        <div className="flex flex-col">
                            <span>Collectée</span>
                            <span className="font-medium text-slate-600">{yearlyStats.totalVAT.toFixed(0)}€</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span>Déductible</span>
                            <span className="font-medium text-slate-600">-{yearlyStats.totalVATDeductible.toFixed(0)}€</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
