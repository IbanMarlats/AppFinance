import React, { useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Award, PieChart, Download, Activity, Banknote } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import confetti from 'canvas-confetti';

export default function RecapView({ recap, onBack }) {
    if (!recap) return null;

    const { stats, goal } = recap.data;
    const monthName = new Date(recap.year, recap.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

    useEffect(() => {
        if (goal && goal.target > 0 && goal.progress >= 100) {
            // Petite explosion de confetti rapide
            const count = 200;
            const defaults = {
                origin: { y: 0.7 }
            };

            function fire(particleRatio, opts) {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(count * particleRatio)
                });
            }

            fire(0.25, {
                spread: 26,
                startVelocity: 55,
            });
            fire(0.2, {
                spread: 60,
            });
            fire(0.35, {
                spread: 100,
                decay: 0.91,
                scalar: 0.8
            });
            fire(0.1, {
                spread: 120,
                startVelocity: 25,
                decay: 0.92,
                scalar: 1.2
            });
            fire(0.1, {
                spread: 120,
                startVelocity: 45,
            });
        }
    }, [goal]);

    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`Bilan Mensuel - ${monthName}`, 14, 20);

        doc.setFontSize(12);
        const urssafLabel = stats.declarationFrequency === 'quarterly' ? 'URSSAF due (Provision Trim.)' : 'URSSAF Estimé';

        doc.text(`Chiffre d'Affaires: ${stats.totalIncome.toFixed(2)}€`, 14, 40);
        doc.text(`Dépenses: ${stats.totalExpenses.toFixed(2)}€`, 14, 50);
        doc.text(`Bénéfice Net: ${stats.netIncome.toFixed(2)}€`, 14, 60);
        doc.text(`${urssafLabel}: ${stats.estimatedUrssaf.toFixed(2)}€`, 14, 70);

        // More details could be added
        doc.save(`bilan_${recap.month}_${recap.year}.pdf`);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Retour aux archives
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={downloadPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Download size={18} />
                        Télécharger PDF
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
                    <h1 className="text-3xl font-bold capitalize mb-2">{monthName}</h1>
                    <p className="opacity-90">Votre récapitulatif financier complet</p>
                </div>

                <div className="p-8">
                    {/* Top Line + Growth */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                        {/* CA */}
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <TrendingUp size={20} className="text-emerald-500" />
                                    <span className="font-medium">Chiffre d'Affaires</span>
                                </div>
                                {stats.growthPercentage !== null && (
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${stats.growthPercentage >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {stats.growthPercentage >= 0 ? '+' : ''}{stats.growthPercentage.toFixed(1)}% vs M-1
                                    </span>
                                )}
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{stats.totalIncome.toFixed(2)} €</p>
                        </div>
                        {/* Net */}
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3 mb-2 text-slate-500">
                                <Award size={20} className="text-indigo-500" />
                                <span className="font-medium">Reste à vivre</span>
                            </div>
                            <p className="text-2xl font-bold text-indigo-600">{(stats.netIncome - stats.estimatedUrssaf).toFixed(2)} €</p>
                            <p className="text-xs text-slate-400 mt-1">Après URSSAF & frais</p>
                        </div>
                        {/* TVA */}
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3 mb-2 text-slate-500">
                                <Banknote size={20} className="text-amber-500" />
                                <span className="font-medium">TVA à reverser</span>
                            </div>
                            <p className="text-2xl font-bold text-amber-600">{(stats.totalVatCollected || 0).toFixed(2)} €</p>
                            <p className="text-xs text-slate-400 mt-1">Ne pas toucher !</p>
                        </div>
                        {/* Dépenses */}
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3 mb-2 text-slate-500">
                                <TrendingDown size={20} className="text-red-500" />
                                <span className="font-medium">Frais & Charges</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{stats.totalExpenses.toFixed(2)} €</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        {/* Detailed Analysis Table */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Analyse des Flux</h3>
                            <table className="w-full">
                                <tbody>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-3 text-slate-500">URSSAF Estimé</td>
                                        <td className="py-3 text-right font-medium text-slate-900">{stats.estimatedUrssaf.toFixed(2)} €</td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-3 text-slate-500">Top Source</td>
                                        <td className="py-3 text-right font-medium text-emerald-600">{stats.topSource}</td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-3 text-slate-500">Top Dépense</td>
                                        <td className="py-3 text-right font-medium text-red-600">{stats.topExpense}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Thresholds & Health */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Santé Fiscale (Annuel)</h3>

                            {/* TVA Threshold */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">Seuil Franchise TVA (39 100€)</span>
                                    <span className="font-bold text-slate-800">{Math.min(((stats.ytdRevenue || 0) / 39100) * 100, 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${(stats.ytdRevenue || 0) > 39100 ? 'bg-red-500' : 'bg-amber-400'}`}
                                        style={{ width: `${Math.min(((stats.ytdRevenue || 0) / 39100) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Micro Threshold */}
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">Plafond Micro-Entreprise (77 700€)</span>
                                    <span className="font-bold text-slate-800">{Math.min(((stats.ytdRevenue || 0) / 77700) * 100, 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${(stats.ytdRevenue || 0) > 77700 ? 'bg-red-600' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min(((stats.ytdRevenue || 0) / 77700) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fiscal To-Do List */}
                    <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 mb-8">
                        <h3 className="text-lg font-bold text-indigo-900 mb-4">✅ Actions à venir</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                                <span className="text-indigo-800">Déclarer mon CA à l'URSSAF (avant le 31 du mois prochain)</span>
                            </div>
                            {(stats.totalVatCollected || 0) > 0 && (
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                                    <span className="text-indigo-800">Déclarer et reverser la TVA ({stats.totalVatCollected.toFixed(2)}€)</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                                <span className="text-indigo-800">Mettre de côté {stats.estimatedUrssaf.toFixed(2)}€ pour les cotisations</span>
                            </div>
                        </div>
                    </div>

                    {/* Special Quarterly Callout */}
                    {stats.isQuarterlyRecap && (
                        <div className="col-span-1 md:col-span-2 mt-4 bg-indigo-50 border border-indigo-200 rounded-xl p-6 relative overflow-hidden mb-8">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Award size={120} className="text-indigo-600" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-indigo-600 text-white rounded-lg">
                                        <Award size={20} />
                                    </div>
                                    <h3 className="text-xl font-bold text-indigo-900">Déclaration Trimestrielle à venir</h3>
                                </div>
                                <p className="text-indigo-700 mb-4 max-w-lg">
                                    C'est la fin du trimestre ! Vous devrez bientôt déclarer vos revenus pour les 3 derniers mois.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/60 p-3 rounded-lg">
                                        <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">CA Trimestre</p>
                                        <p className="text-2xl font-bold text-indigo-900">{stats.quarterlyTotalIncome.toFixed(2)} €</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-sm">
                                        <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Total Cotisations à Payer</p>
                                        <p className="text-2xl font-bold text-indigo-600">{stats.quarterlyTotalUrssaf.toFixed(2)} €</p>
                                    </div>
                                </div>
                                <p className="text-xs text-indigo-500 mt-3 italic">
                                    *Montant estimé selon votre taux. Déclaration à faire le mois prochain.
                                </p>
                            </div>
                        </div>
                    )}


                    {/* Goal Progress */}
                    {goal && goal.target > 0 && (
                        <div className="mt-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Objectif Mensuel</h3>
                                    <p className="text-slate-500 text-sm">Progression vers votre objectif de CA</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-indigo-600">{goal.progress.toFixed(1)}%</div>
                                    <div className="text-xs text-slate-400">du but</div>
                                </div>
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-4 mb-2 overflow-hidden relative z-10">
                                <div
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 relative z-10">
                                <span>{stats.totalIncome.toFixed(0)} €</span>
                                <span>Objectif : {goal.target.toLocaleString()} €</span>
                            </div>
                            {/* Background Icon */}
                            <div className="absolute -right-4 -bottom-4 opacity-5">
                                <Activity size={120} className="text-indigo-600" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
