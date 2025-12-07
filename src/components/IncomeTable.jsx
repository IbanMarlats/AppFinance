import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';

import ConfirmationModal from './ConfirmationModal';

export default function IncomeTable() {
    const { incomes, addIncome, deleteIncome, updateIncome, platforms } = useFinance();
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [platformId, setPlatformId] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [tjm, setTjm] = useState('');

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!desc || !amount || !platformId) return;
        addIncome({
            name: desc,
            amount: parseFloat(amount),
            date,
            platformId,
            is_recurring: isRecurring,
            tjm: tjm ? parseFloat(tjm) : null
        });
        setDesc('');
        setAmount('');
        setTjm('');
        setIsRecurring(false);
    };

    const handleDelete = (id) => {
        setDeleteId(id);
        setIsModalOpen(true);
    };

    const confirmDelete = () => {
        if (deleteId) {
            deleteIncome(deleteId);
            setIsModalOpen(false);
            setDeleteId(null);
        }
    };

    const startEdit = (inc) => {
        setEditingId(inc.id);
        setEditForm({ ...inc });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEdit = () => {
        updateIncome(editingId, {
            ...editForm,
            amount: parseFloat(editForm.amount),
            tjm: editForm.tjm ? parseFloat(editForm.tjm) : null
        });
        setEditingId(null);
    };

    const calculate = (inc) => {
        const p = platforms.find(pl => pl.id === inc.platformId) || { taxRate: 0, name: 'Unknown' };
        const gross = inc.amount;
        const fee = gross * (p.taxRate / 100);
        const net1 = gross - fee;
        const urssaf = net1 * 0.25;
        const final = net1 - urssaf;
        return { p, gross, fee, net1, urssaf, final };
    };

    const totals = incomes.reduce((acc, curr) => {
        const { gross, fee, net1, urssaf, final } = calculate(curr);
        return {
            gross: acc.gross + gross,
            fee: acc.fee + fee,
            net1: acc.net1 + net1,
            urssaf: acc.urssaf + urssaf,
            final: acc.final + final
        };
    }, { gross: 0, fee: 0, net1: 0, urssaf: 0, final: 0 });

    const TVA_THRESHOLD = 36800;
    const tvaProgress = Math.min((totals.gross / TVA_THRESHOLD) * 100, 100);
    const tvaColor = tvaProgress >= 100 ? 'var(--danger)' : tvaProgress >= 80 ? 'var(--warning)' : 'var(--success)';

    const MICRO_THRESHOLD = 77700;
    const microProgress = Math.min((totals.gross / MICRO_THRESHOLD) * 100, 100);
    const microColor = microProgress >= 100 ? 'var(--danger)' : microProgress >= 80 ? 'var(--warning)' : '#3b82f6';

    return (
        <div className="card">
            <div className="flex justify-between" style={{ marginBottom: '1rem', alignItems: 'center' }}>
                <h2>Revenus</h2>
                <div className="flex space-x-2">
                    <div className="badge" style={{ fontSize: '1em', color: 'var(--text-muted)' }}>
                        CA Brut: {totals.gross.toFixed(2)}€
                    </div>
                    <div className="badge" style={{ fontSize: '1.2em', padding: '0.5em 1em', backgroundColor: '#f0fdf4', color: 'var(--success)', border: '1px solid #bbf7d0' }}>
                        Net Final: {totals.final.toFixed(2)}€
                    </div>
                </div>
            </div>



            <form onSubmit={handleSubmit} className="grid" style={{ gridTemplateColumns: '150px 1fr 1fr 150px 100px auto auto', gap: '0.5rem', marginBottom: '2rem', alignItems: 'center' }}>
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                />
                <input
                    placeholder="Client / Projet"
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                />
                <select value={platformId} onChange={e => setPlatformId(e.target.value)}>
                    <option value="">Plateforme...</option>
                    {platforms.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.taxRate}%)</option>
                    ))}
                </select>
                <input
                    type="number"
                    step="0.01"
                    placeholder="Montant HT"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                />
                <input
                    type="number"
                    step="1"
                    placeholder="TJM (Opt.)"
                    value={tjm}
                    onChange={e => setTjm(e.target.value)}
                    style={{ width: '100px' }}
                />
                <label className="flex items-center space-x-2 cursor-pointer" title="Revenu Mensuel">
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
                            <th>Nom</th>
                            <th>Plateforme</th>
                            <th>Montant</th>
                            <th>TJM</th>
                            <th>Frais</th>
                            <th>Net Interm.</th>
                            <th>URSSAF (25%)</th>
                            <th>Net Final</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {incomes.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).map(inc => {
                            const isEditing = editingId === inc.id;
                            const { p, gross, fee, net1, urssaf, final } = calculate(isEditing ? { ...editForm, platformId: editForm.platformId || inc.platformId } : inc);

                            if (isEditing) {
                                return (
                                    <tr key={inc.id} style={{ backgroundColor: '#f8fafc' }}>
                                        <td><input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} /></td>
                                        <td>
                                            <div className="flex items-center space-x-2">
                                                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ width: '100%' }} />
                                                <label title="Récurrent">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.is_recurring}
                                                        onChange={e => setEditForm({ ...editForm, is_recurring: e.target.checked })}
                                                    />
                                                </label>
                                            </div>
                                        </td>
                                        <td>
                                            <select value={editForm.platformId} onChange={e => setEditForm({ ...editForm, platformId: e.target.value })}>
                                                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </td>
                                        <td><input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} /></td>
                                        <td><input type="number" step="1" value={editForm.tjm || ''} onChange={e => setEditForm({ ...editForm, tjm: e.target.value })} style={{ width: '80px' }} /></td>
                                        <td colSpan="4"></td>
                                        <td className="action-cell">
                                            <button className="primary btn-action btn-icon" onClick={saveEdit}>V</button>
                                            <button className="btn-action btn-icon" onClick={cancelEdit}>X</button>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={inc.id}>
                                    <td>{new Date(inc.date).toLocaleDateString()}</td>
                                    <td>
                                        {inc.name}
                                        {inc.is_recurring ? <span title="Récurrent" style={{ marginLeft: '5px' }}>🔄</span> : null}
                                    </td>
                                    <td>
                                        <span className="badge">{p.name}</span>
                                    </td>
                                    <td style={{ opacity: 0.7 }}>{gross.toFixed(2)}€</td>
                                    <td style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>{inc.tjm ? inc.tjm + '€' : '-'}</td>
                                    <td style={{ color: 'var(--danger)', fontSize: '0.9em' }}>-{fee.toFixed(2)}€</td>
                                    <td style={{ opacity: 0.7 }}>{net1.toFixed(2)}€</td>
                                    <td style={{ color: 'var(--accent)', fontSize: '0.9em' }}>-{urssaf.toFixed(2)}€</td>
                                    <td style={{ color: 'var(--success)', fontWeight: 'bold' }}>{final.toFixed(2)}€</td>
                                    <td className="action-cell">
                                        <button className="btn-action btn-icon" onClick={() => startEdit(inc)} title="Modifier">✎</button>
                                        <button className="danger btn-action btn-icon" onClick={() => handleDelete(inc.id)} title="Supprimer">X</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {incomes.length === 0 && (
                            <tr>
                                <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucun revenu enregistré</td>
                            </tr>
                        )}
                    </tbody>
                    {incomes.length > 0 && (
                        <tfoot>
                            <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb', borderTop: '2px solid #e2e8f0' }}>
                                <td colSpan="3" style={{ textAlign: 'right' }}>TOTAUX :</td>
                                <td>{totals.gross.toFixed(2)}€</td>
                                <td></td>
                                <td style={{ color: 'var(--danger)' }}>-{totals.fee.toFixed(2)}€</td>
                                <td>{totals.net1.toFixed(2)}€</td>
                                <td style={{ color: 'var(--accent)' }}>-{totals.urssaf.toFixed(2)}€</td>
                                <td style={{ color: 'var(--success)', fontSize: '1.1em' }}>{totals.final.toFixed(2)}€</td>
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
                message="Êtes-vous sûr de vouloir supprimer ce revenu ?"
            />
        </div>
    );
}
