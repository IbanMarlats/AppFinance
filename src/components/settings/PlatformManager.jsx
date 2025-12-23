import { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import ConfirmationModal from '../ui/ConfirmationModal';
import ColorPicker, { hexToRgba } from '../ui/ColorPicker';
import { Trash2, Edit2, Check, X, Plus } from 'lucide-react';

export default function PlatformManager() {
    const { platforms, addPlatform, deletePlatform, updatePlatform } = useFinance();
    const [name, setName] = useState('');
    const [taxRate, setTaxRate] = useState('');
    const [fixedFee, setFixedFee] = useState('');
    const [feeVatRate, setFeeVatRate] = useState('20');
    const [color, setColor] = useState('#6366f1');

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
            fee_vat_rate: feeVatRate ? parseFloat(feeVatRate) : 0,
            color
        });
        setName('');
        setTaxRate('');
        setFixedFee('');
        setFeeVatRate('20');
        setColor('#6366f1');
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
        setEditForm({ ...p, color: p.color || '#6366f1' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEdit = () => {
        updatePlatform(editingId, {
            ...editForm,
            taxRate: parseFloat(editForm.taxRate),
            fixed_fee: editForm.fixed_fee ? parseFloat(editForm.fixed_fee) : 0,
            fee_vat_rate: editForm.fee_vat_rate ? parseFloat(editForm.fee_vat_rate) : 0
        });
        setEditingId(null);
    };

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200 h-full flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold text-slate-800">Configuration des Plateformes</h2>
            </div>

            <div className="p-6 flex-1 overflow-auto">
                <form onSubmit={handleSubmit} className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Nom de la Plateforme</label>
                                <input
                                    className="block w-full h-10 rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-3"
                                    placeholder="Ex: Malt, Upwork..."
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div className="md:w-1/3">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Identification</label>
                                <ColorPicker color={color} onChange={setColor} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Frais Variable</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="block w-full h-10 rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-3 pr-8"
                                        placeholder="0.00"
                                        value={taxRate}
                                        onChange={e => setTaxRate(e.target.value)}
                                    />
                                    <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold">%</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Frais Fixe</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="block w-full h-10 rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-3 pr-8"
                                        placeholder="0.00"
                                        value={fixedFee}
                                        onChange={e => setFixedFee(e.target.value)}
                                    />
                                    <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold">€</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">TVA Sur Frais</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="block w-full h-10 rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-3 pr-8"
                                        value={feeVatRate}
                                        onChange={e => setFeeVatRate(e.target.value)}
                                    />
                                    <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold">%</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button type="submit" className="w-full h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow hover:shadow-md text-sm">
                                <Plus className="w-5 h-5 mr-1.5" /> Ajouter
                            </button>
                        </div>
                    </div>
                </form>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Plateforme</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Frais Variable</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Frais Fixe</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">TVA s/ Frais</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {platforms.map(p => {
                                const isEditing = editingId === p.id;
                                const badgeStyle = isEditing ? {} : {
                                    backgroundColor: hexToRgba(p.color || '#6366f1', 0.1),
                                    color: p.color || '#6366f1',
                                    borderColor: hexToRgba(p.color || '#6366f1', 0.2)
                                };

                                if (isEditing) {
                                    return (
                                        <tr key={p.id} className="bg-indigo-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-2">
                                                    <input className="block w-full h-9 rounded-md border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-2" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                                    <div className="w-full">
                                                        <ColorPicker color={editForm.color} onChange={c => setEditForm({ ...editForm, color: c })} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                                                <input type="number" step="0.01" className="block w-20 h-9 ml-auto rounded-md border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-right px-2" value={editForm.taxRate} onChange={e => setEditForm({ ...editForm, taxRate: e.target.value })} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                                                <input type="number" step="0.01" className="block w-20 h-9 ml-auto rounded-md border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-right px-2" value={editForm.fixed_fee} onChange={e => setEditForm({ ...editForm, fixed_fee: e.target.value })} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                                                <input type="number" step="0.1" className="block w-16 h-9 ml-auto rounded-md border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-right px-2" value={editForm.fee_vat_rate || 0} onChange={e => setEditForm({ ...editForm, fee_vat_rate: e.target.value })} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-900 bg-emerald-100 p-1.5 rounded-full"><Check className="w-4 h-4" /></button>
                                                    <button onClick={cancelEdit} className="text-red-600 hover:text-red-900 bg-red-100 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }
                                return (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border" style={badgeStyle}>
                                                {p.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{p.taxRate}%</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{p.fixed_fee ? p.fixed_fee.toFixed(2) + '€' : '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{p.fee_vat_rate ? p.fee_vat_rate + '%' : '0%'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={() => startEdit(p)} className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 p-2 rounded-full transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {platforms.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-sm text-slate-400 italic bg-slate-50/50">
                                        Commencez par ajouter votre première plateforme (ex: Malt).
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
