import { useFinance } from '../context/FinanceContext';

export default function ExpenseStats({ expenses }) {
    const { categories } = useFinance();

    const stats = expenses.reduce((acc, curr) => {
        const cat = curr.category || 'Autre';
        if (!acc[cat]) acc[cat] = 0;
        acc[cat] += curr.amount;
        return acc;
    }, {});

    const total = Object.values(stats).reduce((a, b) => a + b, 0);

    const sortedStats = Object.entries(stats).sort((a, b) => b[1] - a[1]); // Sort by amount desc

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Répartition par Catégorie</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="px-4 py-3 font-semibold text-slate-500">Catégorie</th>
                            <th className="px-4 py-3 font-semibold text-slate-500 text-right">Montant</th>
                            <th className="px-4 py-3 font-semibold text-slate-500 text-right">%</th>
                            <th className="px-4 py-3 font-semibold text-slate-500 w-1/3">Barre</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedStats.map(([catName, amount]) => {
                            const percent = total > 0 ? (amount / total) * 100 : 0;
                            const catColor = categories.find(c => c.name === catName)?.color || '#6366f1'; // Default Indigo

                            return (
                                <tr key={catName} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-900">{catName}</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700">{amount.toFixed(2)}€</td>
                                    <td className="px-4 py-3 text-right text-slate-500">{percent.toFixed(1)}%</td>
                                    <td className="px-4 py-3">
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${percent}%`,
                                                    backgroundColor: catColor
                                                }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {sortedStats.length === 0 && (
                            <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-400 italic">Pas de données pour cette période</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
