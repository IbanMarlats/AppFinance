import { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, TrendingUp, PiggyBank, FileText } from 'lucide-react';

export default function VatDashboard() {
    const { incomes, settings } = useFinance();
    const { user } = useAuth();

    const currentYear = new Date().getFullYear();
    const threshold = settings.tva_threshold || 36800; // Default threshold

    // Filter incomes for current year
    const yearlyStats = useMemo(() => {
        return incomes
            .filter(inc => new Date(inc.date).getFullYear() === currentYear)
            .reduce((acc, curr) => {
                acc.totalHT += curr.amount; // amount is HT
                acc.totalVAT += (curr.vat_amount || 0);
                return acc;
            }, { totalHT: 0, totalVAT: 0 });
    }, [incomes, currentYear]);

    const isThresholdExceeded = yearlyStats.totalHT > threshold;
    const progress = Math.min((yearlyStats.totalHT / threshold) * 100, 100);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Threshold Alert Banner */}
            {isThresholdExceeded && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h3 className="font-bold text-amber-800">Seuil de franchise TVA dépassé !</h3>
                        <p className="text-sm text-amber-700 mt-1">
                            Votre chiffre d'affaires annuel ({yearlyStats.totalHT.toFixed(2)}€) a dépassé le seuil de {threshold}€.
                            Vous devez désormais facturer la TVA sur vos prochaines prestations.
                        </p>
                    </div>
                </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CA HT vs Threshold */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Chiffre d'Affaires HT ({currentYear})</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{yearlyStats.totalHT.toFixed(2)}€</h3>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <TrendingUp size={24} />
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                            <span>Progression seuil</span>
                            <span>{Math.round(progress)}% ({threshold}€)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${isThresholdExceeded ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Collected VAT */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500">TVA Collectée (À reverser)</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">{yearlyStats.totalVAT.toFixed(2)}€</h3>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <PiggyBank size={24} />
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Cette somme ne vous appartient pas. Gardez-la de côté pour le reversement aux impôts.
                    </p>
                </div>

                {/* Info Card */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText size={18} className="text-slate-400" />
                        <h4 className="font-bold text-slate-700">Versements</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                            <span>Déclarez votre TVA mensuellement ou trimestriellement selon votre option.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                            <span>Le seuil de tolérance (majoration) est de 39 100€ (Prestations) ou 101 000€ (Vente).</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
