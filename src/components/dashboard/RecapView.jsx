import React from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Award, PieChart, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function RecapView({ recap, onBack }) {
    if (!recap) return null;

    const { stats, goal } = recap.data;
    const monthName = new Date(recap.year, recap.month - 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`Bilan Mensuel - ${monthName}`, 14, 20);

        doc.setFontSize(12);
        doc.text(`Chiffre d'Affaires: ${stats.totalIncome.toFixed(2)}€`, 14, 40);
        doc.text(`Dépenses: ${stats.totalExpenses.toFixed(2)}€`, 14, 50);
        doc.text(`Bénéfice Net: ${stats.netIncome.toFixed(2)}€`, 14, 60);
        doc.text(`URSSAF Estimé: ${stats.estimatedUrssaf.toFixed(2)}€`, 14, 70);

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
                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3 mb-2 text-slate-500">
                                <TrendingUp size={20} className="text-emerald-500" />
                                <span className="font-medium">Chiffre d'Affaires</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900">{stats.totalIncome.toFixed(2)} €</p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3 mb-2 text-slate-500">
                                <TrendingDown size={20} className="text-red-500" />
                                <span className="font-medium">Dépenses</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900">{stats.totalExpenses.toFixed(2)} €</p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3 mb-2 text-slate-500">
                                <Award size={20} className="text-indigo-500" />
                                <span className="font-medium">Bénéfice Net</span>
                            </div>
                            <p className="text-3xl font-bold text-indigo-600">{stats.netIncome.toFixed(2)} €</p>
                        </div>
                    </div>

                    {/* Detailed Analysis */}
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Analyse Détaillée</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <table className="w-full">
                                <tbody>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-4 text-slate-500">URSSAF Estimé</td>
                                        <td className="py-4 text-right font-medium text-slate-900">{stats.estimatedUrssaf.toFixed(2)} €</td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-4 text-slate-500">Nombre de transactions</td>
                                        <td className="py-4 text-right font-medium text-slate-900">{stats.transactionCount}</td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-4 text-slate-500">Source principale</td>
                                        <td className="py-4 text-right font-medium text-emerald-600">{stats.topSource}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <table className="w-full">
                                <tbody>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-4 text-slate-500">Reste pour vivre (ap. URSSAF)</td>
                                        <td className="py-4 text-right font-medium text-slate-900">{(stats.netIncome - stats.estimatedUrssaf).toFixed(2)} €</td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-4 text-slate-500">Dépenses totales</td>
                                        <td className="py-4 text-right font-medium text-red-500">{stats.transactionCount}</td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                        <td className="py-4 text-slate-500">Poste de dépense principal</td>
                                        <td className="py-4 text-right font-medium text-red-600">{stats.topExpense}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Goal Progress */}
                    {goal.target > 0 && (
                        <div className="mt-10 p-6 bg-indigo-50 rounded-xl border border-indigo-100">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-indigo-900">Objectif Mensuel</h4>
                                <span className="text-indigo-700 font-medium">{goal.progress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-indigo-200 rounded-full h-2.5">
                                <div
                                    className="bg-indigo-600 h-2.5 rounded-full"
                                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-indigo-600 mt-2">Target: {goal.target}€</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
