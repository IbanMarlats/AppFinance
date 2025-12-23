import { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, TrendingUp, PiggyBank, FileText } from 'lucide-react';

export default function VatDashboard({ year }) {
    const { incomes, expenses, settings } = useFinance();
    const { user } = useAuth();

    // Use prop if passed, else default to current
    const currentYear = year || new Date().getFullYear();
    const VAT_THRESHOLD = 37500;
    const MICRO_THRESHOLD = 77700;

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

    const vatToPay = Math.max(yearlyStats.totalVAT - yearlyStats.totalVATDeductible, 0); // Can be negative (credit), but for "to pay" usually 0 if credit
    const vatBalance = yearlyStats.totalVAT - yearlyStats.totalVATDeductible;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800">Suivi Fiscal {currentYear}</h3>
                </div>
                {yearlyStats.totalHT > VAT_THRESHOLD && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-700 uppercase">Assujetti TVA</span>
                    </div>
                )}
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: CA & Gauges */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-slate-600 text-sm uppercase tracking-wider">Chiffre d'Affaires HT</h4>
                        </div>
                        <div className="text-3xl font-black text-slate-800">
                            {yearlyStats.totalHT.toFixed(2)}€
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Jauge TVA */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-bold text-slate-700">Seuil Franchise TVA (37 500€)</span>
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{vatProgress.toFixed(1)}%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${yearlyStats.totalHT > VAT_THRESHOLD ? 'bg-amber-500' : 'bg-indigo-600'}`}
                                    style={{ width: `${Math.max(vatProgress, yearlyStats.totalHT > 0 ? 2 : 0)}%` }}
                                />
                            </div>
                            <div className="flex items-start gap-2 text-xs text-slate-500">
                                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                {yearlyStats.totalHT < VAT_THRESHOLD ? (
                                    <span>Encore <strong className="text-slate-700">{remainingVat.toFixed(2)}€</strong> avant de devoir facturer la TVA.</span>
                                ) : (
                                    <span className="text-amber-600 font-bold">Vous avez dépassé le seuil. Vous devez facturer la TVA.</span>
                                )}
                            </div>
                        </div>

                        {/* Jauge Micro */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-bold text-slate-700">Plafond Micro-Entreprise (77 700€)</span>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{microProgress.toFixed(1)}%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${yearlyStats.totalHT > MICRO_THRESHOLD ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.max(microProgress, yearlyStats.totalHT > 0 ? 2 : 0)}%` }}
                                />
                            </div>
                            <div className="flex items-start gap-2 text-xs text-slate-500">
                                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                {yearlyStats.totalHT < MICRO_THRESHOLD ? (
                                    <span>Encore <strong className="text-slate-700">{remainingMicro.toFixed(2)}€</strong> avant le changement de régime.</span>
                                ) : (
                                    <span className="text-red-600 font-bold">Plafond dépassé. Attention au changement de régime fiscal.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Treasury (Trésorerie TVA) */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <PiggyBank className="w-5 h-5 text-emerald-600" />
                            <h4 className="font-bold text-slate-800">Trésorerie TVA</h4>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-200 border-dashed">
                                <span className="text-sm text-slate-600">TVA Collectée</span>
                                <span className="font-bold text-slate-800">{yearlyStats.totalVAT.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-200 border-dashed">
                                <span className="text-sm text-slate-600">TVA Récupérable (sur achats)</span>
                                <span className="font-bold text-green-600">-{yearlyStats.totalVATDeductible.toFixed(2)}€</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-slate-700 uppercase">Estimation à reverser</span>
                            <span className={`text-xl font-black ${vatBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {vatBalance.toFixed(2)}€
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 italic leading-relaxed">
                            {vatBalance >= 0
                                ? "Cette somme ne vous appartient pas. Gardez-la de côté pour le reversement aux impôts."
                                : "Vous avez un crédit de TVA. L'État vous doit cette somme (ou reportable)."
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
