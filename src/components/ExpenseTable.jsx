import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import ConfirmationModal from './ConfirmationModal';

export default function ExpenseTable() {
    const { expenses, addExpense, deleteExpense, updateExpense } = useFinance();
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!desc || !amount) return;
        addExpense({ name: desc, amount: parseFloat(amount), date });
        setDesc('');
        setAmount('');
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

    const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="card">
            <div className="flex justify-between" style={{ marginBottom: '1.5rem' }}>
                <h2>Dépenses</h2>
                <div className="badge" style={{ fontSize: '1.2em', padding: '0.5em 1em', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                    Total: <span style={{ color: 'var(--danger)' }}>{total.toFixed(2)}€</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid" style={{ gridTemplateColumns: '150px 1fr 150px auto', marginBottom: '2rem' }}>
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                />
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
                <button type="submit" className="primary btn-action">Ajouter</button>
            </form>

            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Montant</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => {
                        const isEditing = editingId === e.id;

                        if (isEditing) {
                            return (
                                <tr key={e.id} style={{ backgroundColor: '#f8fafc' }}>
                                    <td><input type="date" value={editForm.date} onChange={ev => setEditForm({ ...editForm, date: ev.target.value })} /></td>
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
                                <td>{e.name}</td>
                                <td style={{ color: 'var(--text-main)' }}>{e.amount.toFixed(2)}€</td>
                                <td className="action-cell">
                                    <button className="btn-action btn-icon" onClick={() => startEdit(e)} title="Modifier">✎</button>
                                    <button className="danger btn-action btn-icon" onClick={() => handleDelete(e.id)} title="Supprimer">X</button>
                                </td>
                            </tr>
                        );
                    })}
                    {expenses.length === 0 && (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune dépense enregistrée</td>
                        </tr>
                    )}
                </tbody>
                {expenses.length > 0 && (
                    <tfoot>
                        <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
                            <td colSpan="2">Total</td>
                            <td style={{ color: 'var(--danger)' }}>{total.toFixed(2)}€</td>
                            <td></td>
                        </tr>
                    </tfoot>
                )}
            </table>

            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={confirmDelete}
                message="Êtes-vous sûr de vouloir supprimer cette dépense ?"
            />
        </div>
    );
}
