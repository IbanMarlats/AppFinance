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
        <div className="card">
            <div className="flex justify-between" style={{ marginBottom: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2>Dépenses</h2>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                        style={{
                            fontSize: '1rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#fff',
                            cursor: 'pointer'
                        }}
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div className="badge" style={{ fontSize: '1.2em', padding: '0.5em 1em', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                    Total: <span style={{ color: 'var(--danger)' }}>{total.toFixed(2)}€</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid" style={{ gridTemplateColumns: '130px 140px 1fr 100px auto auto', gap: '0.5rem', marginBottom: '2rem', alignItems: 'center' }}>
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                />
                <select value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="">Catégorie...</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <input
                    placeholder="Description"
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                />
                <input
                    type="number"
                    step="0.01"
                    placeholder="Montant €"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                />
                <label className="flex items-center space-x-2 cursor-pointer" title="Dépense Récurrente">
                    <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={e => setIsRecurring(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>Mensuel</span>
                </label>
                <button type="submit" className="primary btn-action">Ajouter</button>
            </form>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Catégorie</th>
                            <th>Description</th>
                            <th>Montant</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).map(e => {
                            const isEditing = editingId === e.id;

                            if (isEditing) {
                                return (
                                    <tr key={e.id} style={{ backgroundColor: '#f8fafc' }}>
                                        <td><input type="date" value={editForm.date} onChange={ev => setEditForm({ ...editForm, date: ev.target.value })} /></td>
                                        <td>
                                            <select value={editForm.category || ''} onChange={ev => setEditForm({ ...editForm, category: ev.target.value })}>
                                                <option value="">-</option>
                                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </td>
                                        <td><input value={editForm.name} onChange={ev => setEditForm({ ...editForm, name: ev.target.value })} /></td>
                                        <td><input type="number" step="0.01" value={editForm.amount} onChange={ev => setEditForm({ ...editForm, amount: ev.target.value })} /></td>
                                        <td className="action-cell">
                                            <button className="primary btn-action btn-icon" onClick={saveEdit}>V</button>
                                            <button className="btn-action btn-icon" onClick={cancelEdit}>X</button>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={e.id}>
                                    <td>{new Date(e.date).toLocaleDateString()}</td>
                                    <td>
                                        <span className="badge" style={{
                                            fontSize: '0.8em',
                                            backgroundColor: categories.find(c => c.name === e.category)?.color || '#f3f4f6',
                                            color: categories.find(c => c.name === e.category) ? '#fff' : '#374151'
                                        }}>
                                            {e.category || 'Autre'}
                                        </span>
                                        {e.is_recurring ? <span title="Récurrent" style={{ marginLeft: '5px' }}>🔄</span> : null}
                                    </td>
                                    <td>{e.name}</td>
                                    <td style={{ color: 'var(--text-main)' }}>{e.amount.toFixed(2)}€</td>
                                    <td className="action-cell">
                                        <button className="btn-action btn-icon" onClick={() => startEdit(e)} title="Modifier">✎</button>
                                        <button className="danger btn-action btn-icon" onClick={() => handleDelete(e.id)} title="Supprimer">X</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredExpenses.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune dépense enregistrée</td>
                            </tr>
                        )}
                    </tbody>
                    {filteredExpenses.length > 0 && (
                        <tfoot>
                            <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
                                <td colSpan="3">Total</td>
                                <td style={{ color: 'var(--danger)' }}>{total.toFixed(2)}€</td>
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
