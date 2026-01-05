import React from 'react';
import { ArrowLeft, Download, TrendingUp, TrendingDown, CheckCircle, Activity, Banknote, Calendar, Award, Star } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import confetti from 'canvas-confetti';

export default function YearlyRecapView({ recap, onBack }) {
    const stats = recap.data.stats;
    const year = recap.year;

    // Confetti on load
    React.useEffect(() => {
        const duration = 2000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) {
                return clearInterval(interval);
            }
            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);

        return () => clearInterval(interval);
    }, []);

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFillColor(79, 70, 229); // Indigo 600
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text(`Bilan Annuel ${year}`, 20, 25);

        doc.setFontSize(10);
        doc.text(`Généré le ${new Date().toLocaleDateString()}`, 150, 25);

        // Stats Box
        let yPos = 60;
        doc.setTextColor(0, 0, 0);

        const data = [
            ['Chiffre d\'Affaires Annuel', `${stats.totalIncome.toFixed(2)} €`],
            ['Bénéfice Net', `${stats.netIncome.toFixed(2)} €`],
            ['Total Dépenses', `${stats.totalExpenses.toFixed(2)} €`],
            ['Total URSSAF (Estimé)', `${stats.totalUrssaf.toFixed(2)} €`],
            ['Meilleur Mois', `${stats.bestMonth} (${stats.bestMonthAmount?.toFixed(2)} €)`],
            ['Top Source', `${stats.topSource}`]
        ];

        doc.autoTable({
            startY: yPos,
            head: [['Intitulé', 'Montant / Valeur']],
            body: data,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 12, cellPadding: 5 }
        });

        doc.save(`bilan_annuel_${year}.pdf`);
    };

    return (
        <div className="space-y-6">
            {/* Header Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Retour aux bilans
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Download size={18} />
                        PDF
                    </button>
                </div>
            </div>

            {/* Main Year Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Calendar size={200} />
                </div>

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div className="text-indigo-200 font-medium mb-1 flex items-center gap-2">
                            <TrendingUp size={18} />
                            Chiffre d'Affaires {year}
                        </div>
                        <div className="text-5xl font-bold mb-6">{stats.totalIncome.toFixed(2)} €</div>

                        <div className="flex gap-4">
                            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                <div className="text-xs text-indigo-200 mb-1">Dépenses</div>
                                <div className="text-xl font-semibold">{stats.totalExpenses.toFixed(2)} €</div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                <div className="text-xs text-indigo-200 mb-1">Bénéfice Net</div>
                                <div className="text-xl font-semibold text-emerald-300">+{stats.netIncome.toFixed(2)} €</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-center space-y-4 md:border-l md:border-white/20 md:pl-8">
                        <div>
                            <div className="text-sm text-indigo-200 mb-1">URSSAF / Cotisations (Estimé)</div>
                            <div className="text-2xl font-bold">{stats.totalUrssaf.toFixed(2)} €</div>
                        </div>
                        <div>
                            <div className="text-sm text-indigo-200 mb-1">Reste dans ma poche</div>
                            <div className="text-2xl font-bold text-emerald-300">{stats.remainder.toFixed(2)} €</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                            <Award size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-slate-500">Meilleur Mois</div>
                            <div className="font-bold text-slate-800">{stats.bestMonth}</div>
                        </div>
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">{stats.bestMonthAmount?.toFixed(2)} €</div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Star size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-slate-500">Meilleure Source</div>
                            <div className="font-bold text-slate-800">{stats.topSource}</div>
                        </div>
                    </div>
                    <div className="text-sm text-slate-500">Principal client ou plateforme</div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Activity size={24} />
                        </div>
                        <div>
                            <div className="text-sm text-slate-500">Transactions</div>
                            <div className="font-bold text-slate-800">{stats.transactionCount} encaissements</div>
                        </div>
                    </div>
                    {stats.expenseCount > 0 && (
                        <div className="text-sm text-slate-500">{stats.expenseCount} dépenses enregistrées</div>
                    )}
                </div>
            </div>

            {/* Annual Goal */}
            {stats.goal && stats.goal.target > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Objectif Annuel</h3>
                            <p className="text-slate-500 text-sm">Progression vers votre objectif de CA</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-indigo-600">{stats.goal.progress.toFixed(1)}%</div>
                            <div className="text-xs text-slate-400">du but</div>
                        </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-4 mb-2 overflow-hidden relative z-10">
                        <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(stats.goal.progress, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 relative z-10">
                        <span>{stats.totalIncome.toFixed(0)} €</span>
                        <span>Objectif : {stats.goal.target.toLocaleString()} €</span>
                    </div>

                    {/* Background Icon */}
                    <div className="absolute -right-4 -bottom-4 opacity-5">
                        <Activity size={120} className="text-indigo-600" />
                    </div>
                </div>
            )}

            {/* Advice / Note */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-slate-600 text-sm">
                <p><strong>Note :</strong> Ce bilan est généré sur la base de vos encaissements réels (comptabilité de trésorerie).
                    Le montant d'URSSAF est une estimation basée sur votre statut ({recap.role}). Pensez à vérifier vos déclarations officielles.</p>
            </div>
        </div>
    );
}
