import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import ConfirmationModal from './ConfirmationModal';

export default function ExpenseTable() {
    const { expenses, addExpense, deleteExpense, updateExpense, categories } = useFinance();

    // Year Filtering
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const availableYears = [...new Set(expenses.map(e => new Date(e.date).getFullYear()))];
    if (!availableYears.includes(new Date().getFullYear())) {
        availableYears.push(new Date().getFullYear());
    }
    availableYears.sort((a, b) => b - a);

    const filteredExpenses = expenses.filter(e => new Date(e.date).getFullYear() === selectedYear);
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!desc || !amount) return;
        addExpense({ name: desc, amount: parseFloat(amount), date, category, is_recurring: isRecurring });
        setDesc('');
        setAmount('');
        setCategory('');
        setIsRecurring(false);
    };

    const handleDelete = (id) => {
        setDeleteId(id);
        setIsModalOpen(true);
    };

    const confirmDelete = () => {
        if (deleteId) {
            deleteExpense(deleteId);
            setIsModalOpen(false);
            setDeleteId(null);
        }
    };

    const startEdit = (e) => {
        setEditingId(e.id);
        setEditForm({ ...e });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEdit = () => {
        updateExpense(editingId, {
            ...editForm,
            amount: parseFloat(editForm.amount)
        });
        setEditingId(null);
    };

    const total = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-800">Dépenses</h2>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                        className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-xl flex items-center gap-2">
                    <span className="text-slate-600 font-medium">Total:</span>
                    <span className="text-xl font-bold text-red-600">{total.toFixed(2)}€</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="label">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="label">Catégorie</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                            <option value="">Sélectionner...</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="lg:col-span-2">
                        <label className="label">Description</label>
                        <input
                            placeholder="Achat..."
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="label">Montant (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="input font-bold"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={isRecurring}
                            onChange={e => setIsRecurring(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span>Mensuel (Récurrent)</span>
                    </label>
                    <button type="submit" className="btn-primary">Ajouter</button>
                </div>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="px-4 py-3 font-semibold text-slate-500">Date</th>
                            <th className="px-4 py-3 font-semibold text-slate-500">Catégorie</th>
                            <th className="px-4 py-3 font-semibold text-slate-500">Description</th>
                            <th className="px-4 py-3 font-semibold text-slate-500 text-right">Montant</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).map(e => {
                            const isEditing = editingId === e.id;

                            if (isEditing) {
                                return (
                                    <tr key={e.id} className="bg-indigo-50">
                                        <td className="px-4 py-3"><input type="date" value={editForm.date} onChange={ev => setEditForm({ ...editForm, date: ev.target.value })} className="input text-xs" /></td>
                                        <td className="px-4 py-3">
                                            <select value={editForm.category || ''} onChange={ev => setEditForm({ ...editForm, category: ev.target.value })} className="input text-xs">
                                                <option value="">-</option>
                                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3"><input value={editForm.name} onChange={ev => setEditForm({ ...editForm, name: ev.target.value })} className="input text-xs" /></td>
                                        <td className="px-4 py-3"><input type="number" step="0.01" value={editForm.amount} onChange={ev => setEditForm({ ...editForm, amount: ev.target.value })} className="input text-xs text-right" /></td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200" onClick={saveEdit}>V</button>
                                                <button className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200" onClick={cancelEdit}>X</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={e.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-4 py-3 text-slate-600">{new Date(e.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded-md text-xs font-medium border" style={{
                                            backgroundColor: categories.find(c => c.name === e.category)?.color + '20' || '#f3f4f6',
                                            borderColor: categories.find(c => c.name === e.category)?.color + '40' || '#e5e7eb',
                                            color: categories.find(c => c.name === e.category)?.color || '#374151'
                                        }}>
                                            {e.category || 'Autre'}
                                        </span>
                                        {e.is_recurring && <span className="ml-2 text-[10px] uppercase font-bold text-blue-500 bg-blue-50 px-1 py-0.5 rounded">RECUR</span>}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-900">{e.name}</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-900">{e.amount.toFixed(2)}€</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEdit(e)} className="p-1 hover:bg-indigo-50 text-indigo-600 rounded">
                                                ✎
                                            </button>
                                            <button onClick={() => handleDelete(e.id)} className="p-1 hover:bg-red-50 text-red-600 rounded">
                                                ×
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredExpenses.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">
                                    Aucune dépense pour cette période
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {filteredExpenses.length > 0 && (
                        <tfoot className="bg-slate-50 font-semibold border-t border-slate-200">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-right text-slate-500 uppercase text-xs tracking-wider">Total</td>
                                <td className="px-4 py-3 text-right text-red-600 text-lg">{total.toFixed(2)}€</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={confirmDelete}
                message="Êtes-vous sûr de vouloir supprimer cette dépense ?"
            />
        </div>
    );
}
