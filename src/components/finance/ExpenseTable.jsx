import { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import ConfirmationModal from '../ui/ConfirmationModal';
import Select from '../ui/Select';
import DatePicker from '../ui/DatePicker';

export default function ExpenseTable(props) {
    const { expenses, addExpense, deleteExpense, updateExpense, categories } = useFinance();

    // Year Filtering
    const [selectedYears, setSelectedYears] = useState([new Date().getFullYear()]);
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

    const availableYears = [...new Set(expenses.map(e => new Date(e.date).getFullYear()))];
    const currentYearNum = new Date().getFullYear();
    if (!availableYears.includes(currentYearNum)) {
        availableYears.push(currentYearNum);
    }
    // Also ensure previous year is available for selection
    if (!availableYears.includes(currentYearNum - 1)) {
        availableYears.push(currentYearNum - 1);
    }
    availableYears.sort((a, b) => b - a);

    const filteredExpenses = expenses.filter(e => selectedYears.includes(new Date(e.date).getFullYear()));

    // Form State
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringEndDate, setRecurringEndDate] = useState('');
    const [frequency, setFrequency] = useState('monthly');
    const [taxMethod, setTaxMethod] = useState('ht'); // 'ht' or 'ttc'
    const [vatRate, setVatRate] = useState('0'); // '0', '0.055', '0.10', '0.20'
    const [errors, setErrors] = useState({});

    // Edit State
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Pagination State
    const [visibleLimit, setVisibleLimit] = useState(10);
    const [sortOrder, setSortOrder] = useState('desc');
    const [visibleColumns, setVisibleColumns] = useState({
        date: true,
        category: true,
        name: true,
        amount: true
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    // Reset pagination when filter changes
    useEffect(() => {
        setVisibleLimit(10);
    }, [selectedYears]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!desc.trim()) newErrors.desc = true;
        if (!amount) newErrors.amount = true;
        if (!category) newErrors.category = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});

        // Calculate HT and VAT
        const rate = parseFloat(vatRate);
        const inputAmount = parseFloat(amount);
        let finalAmountHT = inputAmount;
        let finalVatAmount = 0;

        if (taxMethod === 'ttc') {
            finalAmountHT = inputAmount / (1 + rate);
            finalVatAmount = inputAmount - finalAmountHT;
        } else {
            finalVatAmount = inputAmount * rate;
        }

        addExpense({
            name: desc,
            amount: finalAmountHT,
            date,
            category,
            is_recurring: isRecurring,
            recurring_end_date: isRecurring ? recurringEndDate : null,
            vat_rate: rate,
            vat_amount: finalVatAmount,
            frequency: isRecurring ? frequency : null
        });

        // Reset Form
        setDesc('');
        setAmount('');
        setCategory('');
        setIsRecurring(false);
        setRecurringEndDate('');
        setFrequency('monthly');
        setTaxMethod('ht');
        setVatRate('0');
        setErrors({});
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
        setEditForm({ ...e, taxMethod: 'ht' }); // Default edit view to HT for simplicity, or we could derive it
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
        <div className="card">
            {/* ... modals ... */}
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={confirmDelete}
                title="Supprimer la dépense ?"
                message="Cette action est irréversible."
            />

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-900">Dépenses</h2>

                    {/* Multi-Year Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                            className="input w-auto min-w-[140px] border-slate-600 font-medium text-slate-700 bg-white flex items-center justify-between px-3 py-2 cursor-pointer"
                        >
                            <span className="truncate">
                                {selectedYears.length === 0 ? 'Aucune année' :
                                    selectedYears.length === availableYears.length ? 'Toutes les années' :
                                        selectedYears.length === 1 ? selectedYears[0] :
                                            `${selectedYears.length} années`}
                            </span>
                            <span className="text-slate-500 text-xs ml-2">▼</span>
                        </button>

                        {isYearDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-lg z-50 p-2 overflow-hidden animate-fadeIn">
                                <div className="max-h-60 overflow-y-auto">
                                    {availableYears.map(year => (
                                        <label key={year} className="flex items-center gap-2 p-2 hover:bg-indigo-50 rounded cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedYears.includes(year)}
                                                onChange={() => {
                                                    if (selectedYears.includes(year)) {
                                                        setSelectedYears(selectedYears.filter(y => y !== year));
                                                    } else {
                                                        setSelectedYears([...selectedYears, year]);
                                                    }
                                                }}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-400"
                                            />
                                            <span className={`text-sm ${selectedYears.includes(year) ? 'font-bold text-indigo-900' : 'text-slate-700'}`}>
                                                {year}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between px-2">
                                    <button
                                        onClick={() => setSelectedYears([...availableYears])}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                                    >
                                        Tout
                                    </button>
                                    <button
                                        onClick={() => setSelectedYears([])}
                                        className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
                                    >
                                        Aucun
                                    </button>
                                </div>
                            </div>
                        )}
                        {isYearDropdownOpen && (
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsYearDropdownOpen(false)}
                            />
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 justify-end items-center">
                    <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-800 font-bold shadow-sm flex items-center h-10">
                        Total: <span className="ml-1">{total.toFixed(2)}€</span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 mb-8 shadow-xl shadow-slate-200/60 relative">
                {/* Decorative Background Layer - Clipped */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <span className="text-8xl font-black text-red-900 leading-none">€</span>
                    </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3 relative z-10">
                    <div className="p-2 bg-red-600 rounded-lg text-white shadow-md shadow-red-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    Ajouter une dépense
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-5">
                    <div className="lg:col-span-1">
                        <DatePicker
                            label="Date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <Select
                            label="Catégorie"
                            value={category}
                            onChange={e => {
                                const val = e.target.value;
                                if (val === 'ADD_NEW') {
                                    if (props.onNavigateToConfig) props.onNavigateToConfig();
                                    return;
                                }
                                setCategory(val);
                                if (errors.category) setErrors({ ...errors, category: false });
                            }}
                            options={[
                                ...categories.map(c => ({ value: c.name, label: c.name })),
                                { value: 'Autre', label: 'Autre' },
                                { value: 'ADD_NEW', label: '+ Ajouter une catégorie...' }
                            ]}
                            error={errors.category}
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <label className="label text-slate-700">Description</label>
                        <input
                            placeholder="Achat..."
                            value={desc}
                            onChange={e => {
                                setDesc(e.target.value);
                                if (errors.desc) setErrors({ ...errors, desc: false });
                            }}
                            className={`input bg-white text-slate-900 placeholder-slate-400 ${errors.desc ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-600'}`}
                        />
                    </div>

                    {/* Tax Settings */}
                    <div className="lg:col-span-1">
                        <label className="label text-slate-700">TVA</label>
                        <div className="flex gap-2">
                            <select
                                value={vatRate}
                                onChange={e => setVatRate(e.target.value)}
                                className="input flex-1 bg-white border-slate-600 text-slate-900 text-sm p-2"
                            >
                                <option value="0">0%</option>
                                <option value="0.055">5.5%</option>
                                <option value="0.10">10%</option>
                                <option value="0.20">20%</option>
                            </select>
                            <select
                                value={taxMethod}
                                onChange={e => setTaxMethod(e.target.value)}
                                className="input w-20 bg-slate-100 border-slate-400 text-slate-700 text-sm p-2"
                            >
                                <option value="ht">HT</option>
                                <option value="ttc">TTC</option>
                            </select>
                        </div>
                    </div>

                    <div className="lg:col-span-1 relative">
                        <label className="label text-slate-700">
                            Montant {taxMethod.toUpperCase()}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={e => {
                                setAmount(e.target.value);
                                if (errors.amount) setErrors({ ...errors, amount: false });
                            }}
                            className={`input font-bold bg-white text-slate-900 pl-8 ${errors.amount ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-600'}`}
                            placeholder="0.00"
                        />
                        <span className="absolute left-2.5 top-[2.4rem] text-slate-400">€</span>
                        {vatRate > 0 && amount && (
                            <div className="absolute -bottom-5 right-0 text-xs text-slate-500">
                                {taxMethod === 'ht'
                                    ? `TTC: ${(parseFloat(amount) * (1 + parseFloat(vatRate))).toFixed(2)}€`
                                    : `HT: ${(parseFloat(amount) / (1 + parseFloat(vatRate))).toFixed(2)}€`
                                }
                            </div>
                        )}
                    </div>
                </div>

                {/* RECURRING SECTION */}
                <div className={`p-4 rounded-xl border transition-all duration-300 mb-5 ${isRecurring ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex flex-wrap items-center gap-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${isRecurring ? 'bg-indigo-600' : ''}`}>
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${isRecurring ? 'translate-x-6' : ''}`}></div>
                            </div>
                            <span className="text-slate-700 font-bold group-hover:text-indigo-700 transition-colors">Récurrent</span>
                            <input
                                type="checkbox"
                                checked={isRecurring}
                                onChange={e => setIsRecurring(e.target.checked)}
                                className="hidden"
                            />
                        </label>

                        {isRecurring && (
                            <div className="flex items-center gap-4 animate-fadeIn">
                                <select
                                    value={frequency}
                                    onChange={e => setFrequency(e.target.value)}
                                    className="input py-1 px-3 text-sm border-indigo-200 text-indigo-800 bg-white font-bold"
                                >
                                    <option value="monthly">Mensuel</option>
                                    <option value="annual">Annuel</option>
                                </select>
                            </div>
                        )}

                        {isRecurring && (
                            <div className="flex items-center gap-3 animate-fadeIn">
                                <span className="text-indigo-300 mx-2">|</span>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-indigo-700 uppercase">Date Limite (Optionnel)</label>
                                    <input
                                        type="date"
                                        value={recurringEndDate}
                                        onChange={e => setRecurringEndDate(e.target.value)}
                                        className="input-xs bg-white border-indigo-300 text-indigo-900 focus:ring-indigo-500"
                                        min={date}
                                    />
                                    <span className="text-xs text-indigo-500 italic ml-1">
                                        (Laisser vide pour indéfini)
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    {isRecurring && (
                        <div className="mt-2 text-xs text-indigo-600 pl-16">
                            ℹ️ Si la date de début est passée, les dépenses manquantes seront automatiquement créées jusqu'à aujourd'hui.
                        </div>
                    )}
                </div>

                <div className="flex justify-end items-center pt-2">
                    <button type="submit" className="btn-primary shadow-md">
                        Ajouter
                    </button>
                </div>
            </form>

            <div className="flex justify-end relative gap-2 mb-4">
                {/* Sort Toggle */}
                <button
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                    title={sortOrder === 'desc' ? "Trier du plus ancien au plus récent" : "Trier du plus récent au plus ancien"}
                >
                    {sortOrder === 'desc' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4 4m-4-4v12" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4-4m-4-4v12" transform="scale(1, -1) translate(0, -24)" />
                        </svg>
                    )}
                </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">
                            <th className="px-4 py-4 font-bold text-slate-700">Date</th>
                            <th className="px-4 py-4 font-bold text-slate-700">Catégorie</th>
                            <th className="px-4 py-4 font-bold text-slate-700">Description</th>
                            <th className="px-4 py-4 font-bold text-slate-700 text-right">Montant HT</th>
                            <th className="px-4 py-4 font-bold text-slate-700 text-right">TVA</th>
                            <th className="px-4 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredExpenses.slice().sort((a, b) => {
                            return sortOrder === 'desc'
                                ? new Date(b.date) - new Date(a.date)
                                : new Date(a.date) - new Date(b.date);
                        }).slice(0, visibleLimit).map(e => {
                            const isEditing = editingId === e.id;

                            if (isEditing) {
                                return (
                                    <tr key={e.id} className="bg-indigo-50">
                                        <td className="px-4 py-3"><input type="date" value={editForm.date} onChange={ev => setEditForm({ ...editForm, date: ev.target.value })} className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1 px-2" /></td>
                                        <td className="px-4 py-3">
                                            <select value={editForm.category || ''} onChange={ev => setEditForm({ ...editForm, category: ev.target.value })} className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1 px-2">
                                                <option value="">-</option>
                                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3"><input value={editForm.name} onChange={ev => setEditForm({ ...editForm, name: ev.target.value })} className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1 px-2" /></td>
                                        <td className="px-4 py-3"><input type="number" step="0.01" value={editForm.amount} onChange={ev => setEditForm({ ...editForm, amount: ev.target.value })} className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1 px-2 text-right" /></td>
                                        <td className="px-4 py-3 text-right text-xs text-slate-500">
                                            {/* VAT is auto-calculated on save, or allow edit? For now read-only or derived */}
                                            {editForm.vat_amount ? editForm.vat_amount.toFixed(2) + '€' : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button className="p-1 w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors" onClick={saveEdit}>
                                                    <span className="font-bold text-sm">✓</span>
                                                </button>
                                                <button className="p-1 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors" onClick={cancelEdit}>
                                                    <span className="font-bold text-sm">✕</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={e.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-4 py-3 text-slate-800 font-medium">{new Date(e.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded-md text-xs font-semibold border shadow-sm" style={{
                                            backgroundColor: categories.find(c => c.name === e.category)?.color + '20' || '#f3f4f6',
                                            borderColor: categories.find(c => c.name === e.category)?.color + '40' || '#e5e7eb',
                                            color: categories.find(c => c.name === e.category)?.color || '#374151'
                                        }}>
                                            {e.category || 'Autre'}
                                        </span>
                                        {!!e.is_recurring && (
                                            <span className="ml-2 text-blue-600 bg-blue-50 border border-blue-200 p-0.5 rounded-full inline-flex items-center justify-center" title="Dépense Mensuelle">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-900">{e.name}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-700">{e.amount.toFixed(2)}€</td>
                                    <td className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                                        {e.vat_amount > 0 ? e.vat_amount.toFixed(2) + '€' : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <button onClick={() => startEdit(e)} className="p-1 w-9 h-9 flex items-center justify-center hover:bg-indigo-100 text-indigo-700 rounded-full transition-colors font-bold">
                                                <span className="text-lg">✎</span>
                                            </button>
                                            <button onClick={() => handleDelete(e.id)} className="p-1 w-9 h-9 flex items-center justify-center hover:bg-red-100 text-red-600 rounded-full transition-colors text-xl font-bold">
                                                ×
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredExpenses.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-500 font-medium italic">
                                    Aucune dépense pour cette période
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {filteredExpenses.length > 0 && (
                        <tfoot className="bg-slate-50 font-extrabold border-t border-slate-600 text-slate-900">
                            <tr>
                                <td colSpan={3} className="px-4 py-4 text-right text-slate-900 uppercase text-sm tracking-widest font-black">Total</td>
                                <td className="px-4 py-4 text-right text-red-600 text-lg">{total.toFixed(2)}€</td>
                                <td className="px-4 py-4 text-right text-slate-500 text-sm">
                                    {(filteredExpenses.reduce((sum, e) => sum + (e.vat_amount || 0), 0)).toFixed(2)}€
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Pagination Controls */}
            {filteredExpenses.length > 10 && (
                <div className="flex justify-center mt-4">
                    {visibleLimit < filteredExpenses.length ? (
                        <button
                            onClick={() => setVisibleLimit(prev => prev + 10)}
                            className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-full shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <span>Voir plus</span>
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">
                                {Math.min(filteredExpenses.length - visibleLimit, 10)} restants
                            </span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setVisibleLimit(10)}
                            className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-full hover:bg-slate-200 transition-colors"
                        >
                            Réduire la liste
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
