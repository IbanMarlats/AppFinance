import { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import ConfirmationModal from '../ui/ConfirmationModal';
import ColorPicker, { hexToRgba } from '../ui/ColorPicker';
import { Trash2, Edit2, Check, X, Plus, Layers, Percent, Euro, Receipt } from 'lucide-react';

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
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-500" />
                    Configuration des Plateformes
                </h2>
            </div>

            <div className="p-6 flex-1 overflow-auto">
                <form onSubmit={handleSubmit} className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col gap-6">
                        {/* Row 1: Identity */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nom de la Plateforme</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Layers className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        className="block w-full pl-11 h-12 rounded-xl border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base font-medium placeholder:text-slate-400"
                                        placeholder="Ex: Malt, Upwork..."
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Couleur</label>
                                <div className="h-12">
                                    <ColorPicker color={color} onChange={setColor} />
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Fees Configuration */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Frais Variable</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Percent className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="block w-full pl-11 h-12 rounded-xl border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base font-medium px-4"
                                        placeholder="0.00"
                                        value={taxRate}
                                        onChange={e => setTaxRate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Frais Fixe</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Euro className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="block w-full pl-11 h-12 rounded-xl border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base font-medium px-4"
                                        placeholder="0.00"
                                        value={fixedFee}
                                        onChange={e => setFixedFee(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">TVA sur Frais</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Receipt className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="block w-full pl-11 h-12 rounded-xl border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base font-medium px-4"
                                        value={feeVatRate}
                                        onChange={e => setFeeVatRate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex justify-end pt-2">
                            <button data-tour="add-platform-btn" type="submit" className="w-full md:w-auto px-8 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-base font-bold rounded-xl transition-all shadow hover:shadow-md">
                                <Plus className="w-6 h-6 mr-2" /> Ajouter la plateforme
                            </button>
                        </div>
                    </div>
                </form>

                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/80 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Plateforme</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Frais Var.</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Frais Fixe</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">TVA s/ Frais</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
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
                                        <tr key={p.id} className="bg-indigo-50/50">
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <div className="flex gap-2 items-center">
                                                    <input className="block w-full h-9 rounded-lg border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-2" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} autoFocus />
                                                    <div className="w-[100px]">
                                                        <ColorPicker color={editForm.color} onChange={c => setEditForm({ ...editForm, color: c })} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right align-middle">
                                                <div className="relative">
                                                    <input type="number" step="0.01" className="block w-20 h-9 ml-auto rounded-lg border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-right pr-6" value={editForm.taxRate} onChange={e => setEditForm({ ...editForm, taxRate: e.target.value })} />
                                                    <span className="absolute right-2 top-2 text-xs text-slate-400 font-bold">%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right align-middle">
                                                <div className="relative">
                                                    <input type="number" step="0.01" className="block w-20 h-9 ml-auto rounded-lg border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-right pr-6" value={editForm.fixed_fee} onChange={e => setEditForm({ ...editForm, fixed_fee: e.target.value })} />
                                                    <span className="absolute right-2 top-2 text-xs text-slate-400 font-bold">€</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right align-middle">
                                                <div className="relative">
                                                    <input type="number" step="0.1" className="block w-16 h-9 ml-auto rounded-lg border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-right pr-6" value={editForm.fee_vat_rate || 0} onChange={e => setEditForm({ ...editForm, fee_vat_rate: e.target.value })} />
                                                    <span className="absolute right-2 top-2 text-xs text-slate-400 font-bold">%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium align-middle">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={saveEdit} className="text-emerald-600 hover:text-white hover:bg-emerald-600 bg-emerald-100 p-2 rounded-lg transition-all shadow-sm"><Check className="w-4 h-4" /></button>
                                                    <button onClick={cancelEdit} className="text-red-600 hover:text-white hover:bg-red-600 bg-red-100 p-2 rounded-lg transition-all shadow-sm"><X className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }
                                return (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div
                                                    className="w-3 h-3 rounded-full mr-3 shadow-sm ring-1 ring-white"
                                                    style={{ backgroundColor: p.color || '#6366f1' }}
                                                />
                                                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">
                                                    {p.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600 text-right font-medium">{p.taxRate}%</td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600 text-right font-medium">{p.fixed_fee ? p.fixed_fee.toFixed(2) + '€' : '-'}</td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600 text-right font-medium">{p.fee_vat_rate ? p.fee_vat_rate + '%' : '0%'}</td>
                                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEdit(p)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-all" title="Modifier"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {platforms.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-sm text-slate-400 italic bg-slate-50/30">
                                        <div className="flex flex-col items-center gap-2">
                                            <Layers className="w-8 h-8 text-slate-200" />
                                            <span>Commencez par ajouter votre première plateforme (ex: Malt).</span>
                                        </div>
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
