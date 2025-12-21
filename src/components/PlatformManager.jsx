import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import ConfirmationModal from './ConfirmationModal';

export default function PlatformManager() {
    const { platforms, addPlatform, deletePlatform, updatePlatform } = useFinance();
    const [name, setName] = useState('');
    const [taxRate, setTaxRate] = useState('');
    const [fixedFee, setFixedFee] = useState('');
    const [feeVatRate, setFeeVatRate] = useState('20');

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !taxRate) return;
        addPlatform({
            name,
            taxRate: parseFloat(taxRate),
            fixed_fee: fixedFee ? parseFloat(fixedFee) : 0,
            fee_vat_rate: feeVatRate ? parseFloat(feeVatRate) : 0
        });
        setName('');
        setTaxRate('');
        setFixedFee('');
        setFeeVatRate('20');
    };

    const handleDelete = (id) => {
        setDeleteId(id);
        setIsModalOpen(true);
    };

    const confirmDelete = () => {
        if (deleteId) {
            deletePlatform(deleteId);
            setIsModalOpen(false);
            setDeleteId(null);
        }
    };

    const startEdit = (p) => {
        setEditingId(p.id);
        setEditForm({ ...p });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEdit = () => {
        updatePlatform(editingId, {
            ...editForm,
            ...editForm,
            taxRate: parseFloat(editForm.taxRate),
            fixed_fee: editForm.fixed_fee ? parseFloat(editForm.fixed_fee) : 0,
            fee_vat_rate: editForm.fee_vat_rate ? parseFloat(editForm.fee_vat_rate) : 0
        });
        setEditingId(null);
    };

    return (
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Configuration des Plateformes</h2>

            <form onSubmit={handleSubmit} className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr auto', marginBottom: '2rem', gap: '1rem' }}>
                <input
                    placeholder="Nom (ex: Malt, Upwork...)"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                <input
                    type="number"
                    step="0.01"
                    placeholder="Taux de frais (%)"
                    value={taxRate}
                    onChange={e => setTaxRate(e.target.value)}
                />
                <input
                    type="number"
                    step="0.01"
                    placeholder="Frais Fixe (€)"
                    value={fixedFee}
                    onChange={e => setFixedFee(e.target.value)}
                />
                <input
                    type="number"
                    step="0.1"
                    placeholder="TVA sur Frais (%)"
                    value={feeVatRate}
                    onChange={e => setFeeVatRate(e.target.value)}
                />
                <button type="submit" className="primary btn-action">Ajouter</button>
            </form>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Frais Variable (%)</th>
                            <th>Frais Fixe (€)</th>
                            <th>TVA Frais (%)</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {platforms.map(p => {
                            const isEditing = editingId === p.id;

                            if (isEditing) {
                                return (
                                    <tr key={p.id} style={{ backgroundColor: '#f8fafc' }}>
                                        <td><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></td>
                                        <td><input type="number" step="0.01" value={editForm.taxRate} onChange={e => setEditForm({ ...editForm, taxRate: e.target.value })} /></td>
                                        <td><input type="number" step="0.01" value={editForm.fixed_fee} onChange={e => setEditForm({ ...editForm, fixed_fee: e.target.value })} /></td>
                                        <td><input type="number" step="0.1" value={editForm.fee_vat_rate || 0} onChange={e => setEditForm({ ...editForm, fee_vat_rate: e.target.value })} /></td>
                                        <td className="action-cell">
                                            <button className="primary btn-action btn-icon" onClick={saveEdit}>V</button>
                                            <button className="btn-action btn-icon" onClick={cancelEdit}>X</button>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={p.id}>
                                    <td>{p.name}</td>
                                    <td>{p.taxRate}%</td>
                                    <td>{p.fixed_fee ? p.fixed_fee.toFixed(2) + '€' : '-'}</td>
                                    <td>{p.fee_vat_rate ? p.fee_vat_rate + '%' : '0%'}</td>
                                    <td className="action-cell">
                                        <button className="btn-action btn-icon" onClick={() => startEdit(p)} title="Modifier">✎</button>
                                        <button className="danger btn-action btn-icon" onClick={() => handleDelete(p.id)} title="Supprimer">X</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {platforms.length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune plateforme configurée</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={confirmDelete}
                message="Êtes-vous sûr de vouloir supprimer cette plateforme ?"
            />
        </div>
    );
}
