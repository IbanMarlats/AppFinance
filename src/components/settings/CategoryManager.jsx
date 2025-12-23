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
                    <h2 className="text-lg font-bold text-slate-800">Catégories de Dépenses</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Pour organiser vos coûts personnalisés.</p>
                </div>
            </div>

            <div className="p-6 flex-1 overflow-auto">
                <form onSubmit={handleAdd} className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Nom de la Catégorie</label>
                                <div className="flex rounded-md shadow-sm h-10">
                                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-gray-50 text-gray-500">
                                        <Tag className="h-5 w-5" />
                                    </span>
                                    <input
                                        type="text"
                                        className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-r-lg text-sm border-slate-300 px-3"
                                        placeholder="Ex: Logiciels, Serveur..."
                                        value={newCatName}
                                        onChange={e => setNewCatName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="md:w-1/3">
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Couleur</label>
                                <ColorPicker color={newCatColor} onChange={setNewCatColor} />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button type="submit" className="w-full h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow hover:shadow-md text-sm">
                                <Plus className="w-5 h-5 mr-1.5" /> Ajouter
                            </button>
                        </div>
                    </div>
                </form>

                <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-96">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Catégorie</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
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
                                        <tr key={cat.id} className="bg-indigo-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-2">
                                                    <input
                                                        className="block w-full h-9 rounded-md border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-2"
                                                        value={editForm.name}
                                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                    />
                                                    <div className="w-full">
                                                        <ColorPicker color={editForm.color} onChange={c => setEditForm({ ...editForm, color: c })} />
                                                    </div>
                                                </div>
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
                                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border" style={badgeStyle}>
                                                {cat.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 p-2 rounded-full transition-colors"
                                                    onClick={() => startEdit(cat)}
                                                    title="Modifier"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors"
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
                                <tr><td colSpan="3" className="px-6 py-8 text-center text-sm text-slate-400 italic">Aucune catégorie personnalisée</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
