import { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Trash2, Plus, Tag, Edit2, Check, X } from 'lucide-react';
import ColorPicker, { hexToRgba } from '../ui/ColorPicker';

export default function CategoryManager() {
    const { categories, addCategory, deleteCategory, updateCategory } = useFinance();
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('#3b82f6'); // Default blue

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newCatName) return;
        addCategory({ name: newCatName, color: newCatColor });
        setNewCatName('');
        setNewCatColor('#3b82f6');
    };

    const startEdit = (cat) => {
        setEditingId(cat.id);
        setEditForm({ ...cat });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEdit = () => {
        updateCategory(editingId, editForm);
        setEditingId(null);
    };

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200 h-full flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-indigo-500" />
                        Catégories de Dépenses
                    </h2>
                </div>
            </div>

            <div className="p-6 flex-1 overflow-auto">
                {/* Add Form */}
                <form onSubmit={handleAdd} className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nom de la Catégorie</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Tag className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        className="block w-full pl-11 h-12 rounded-xl border-slate-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base font-medium placeholder:text-slate-400"
                                        placeholder="Ex: Logiciels, Serveur..."
                                        value={newCatName}
                                        onChange={e => setNewCatName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-64">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Couleur associée</label>
                                <div className="h-12">
                                    <ColorPicker color={newCatColor} onChange={setNewCatColor} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={handleAdd}
                                data-tour="add-category-btn"
                                className="w-full md:w-auto px-8 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-base font-bold rounded-xl transition-all shadow hover:shadow-md"
                            >
                                <Plus className="w-6 h-6 mr-2" /> Ajouter la catégorie
                            </button>
                        </div>
                    </div>
                </form>

                {/* Categories List */}
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/80 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Catégorie</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {categories.map(cat => {
                                const isEditing = editingId === cat.id;
                                const badgeStyle = {
                                    backgroundColor: hexToRgba(cat.color || '#3b82f6', 0.1),
                                    color: cat.color || '#3b82f6',
                                    borderColor: hexToRgba(cat.color || '#3b82f6', 0.2)
                                };

                                if (isEditing) {
                                    return (
                                        <tr key={cat.id} className="bg-indigo-50/50">
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <div className="flex gap-3 items-center">
                                                    <div className="flex-1 max-w-xs">
                                                        <input
                                                            className="block w-full h-9 rounded-lg border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-3"
                                                            value={editForm.name}
                                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="w-40">
                                                        <ColorPicker color={editForm.color} onChange={c => setEditForm({ ...editForm, color: c })} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={saveEdit} className="text-emerald-600 hover:text-white hover:bg-emerald-600 bg-emerald-100 p-2 rounded-lg transition-all shadow-sm"><Check className="w-4 h-4" /></button>
                                                    <button onClick={cancelEdit} className="text-red-600 hover:text-white hover:bg-red-600 bg-red-100 p-2 rounded-lg transition-all shadow-sm"><X className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div
                                                    className="w-3 h-3 rounded-full mr-3 shadow-sm ring-1 ring-white"
                                                    style={{ backgroundColor: cat.color || '#3b82f6' }}
                                                />
                                                <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                                                    {cat.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-all"
                                                    onClick={() => startEdit(cat)}
                                                    title="Modifier"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                                                    onClick={() => deleteCategory(cat.id)}
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan="2" className="px-6 py-12 text-center text-sm text-slate-400 italic bg-slate-50/30">
                                        <div className="flex flex-col items-center gap-2">
                                            <Tag className="w-8 h-8 text-slate-200" />
                                            <span>Aucune catégorie personnalisée</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
