import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

import ConfirmationModal from './ConfirmationModal';

export default function IncomeTable() {
    const { incomes, addIncome, deleteIncome, updateIncome, platforms, settings } = useFinance();
    const { user } = useAuth();
    const isEcommerce = user?.role === 'ecommerce';

    // Year Filtering
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const availableYears = [...new Set(incomes.map(i => new Date(i.date).getFullYear()))];
    if (!availableYears.includes(new Date().getFullYear())) {
        availableYears.push(new Date().getFullYear());
    }
    availableYears.sort((a, b) => b - a);

    const filteredIncomes = incomes.filter(i => new Date(i.date).getFullYear() === selectedYear);
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [platformId, setPlatformId] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [tjm, setTjm] = useState('');
    const [addFormEcommerce, setAddFormEcommerce] = useState({ cogs: '', shipping_cost: '' });
    const [addFormRole, setAddFormRole] = useState({
        material_cost: '', hours_spent: '',
        channel_source: '', income_type: 'active', invoice_date: '',
        distance_km: '', status: 'confirmed'
    });

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
            tjm: tjm ? parseFloat(tjm) : null,
            cogs: addFormEcommerce.cogs ? parseFloat(addFormEcommerce.cogs) : 0,
            shipping_cost: addFormEcommerce.shipping_cost ? parseFloat(addFormEcommerce.shipping_cost) : 0,

            // Role specific fields
            material_cost: addFormRole.material_cost ? parseFloat(addFormRole.material_cost) : 0,
            hours_spent: addFormRole.hours_spent ? parseFloat(addFormRole.hours_spent) : 0,
            channel_source: addFormRole.channel_source,
            income_type: addFormRole.income_type,
            invoice_date: addFormRole.invoice_date,
            distance_km: addFormRole.distance_km ? parseFloat(addFormRole.distance_km) : 0,
            status: addFormRole.status
        });
        setDesc('');
        setAmount('');
        setTjm('');
        setAddFormEcommerce({ cogs: '', shipping_cost: '' });
        setAddFormRole({
            material_cost: '', hours_spent: '',
            channel_source: '', income_type: 'active', invoice_date: '',
            distance_km: '', status: 'confirmed'
        });
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
        const p = platforms.find(pl => pl.id === inc.platformId) || { taxRate: 0, fixed_fee: 0, name: 'Unknown' };
        const gross = inc.amount;
        // Fee = % + fixed
        const fee = (gross * (p.taxRate / 100)) + (p.fixed_fee || 0);
        const net1 = gross - fee;

        // URSSAF: Dynamic from settings
        const uRate = isEcommerce ? (settings.urssaf_ecommerce || 12.3) : (settings.urssaf_freelance || 25);
        const urssafRate = uRate / 100;
        const urssaf = net1 * urssafRate;

        const final = net1 - urssaf;
        return { p, gross, fee, net1, urssaf, final };
    };

    const totals = filteredIncomes.reduce((acc, curr) => {
        // Exclude Quotes from Totals
        if (curr.status === 'quote_sent' || curr.status === 'quote_signed') {
            return acc;
        }

        const { gross, fee, net1, urssaf, final } = calculate(curr);
        return {
            gross: acc.gross + gross,
            fee: acc.fee + fee,
            net1: acc.net1 + net1,
            urssaf: acc.urssaf + urssaf,
            final: acc.final + final
        };
    }, { gross: 0, fee: 0, net1: 0, urssaf: 0, final: 0 });

    const TVA_THRESHOLD = settings.tva_threshold || 36800;
    const tvaProgress = Math.min((totals.gross / TVA_THRESHOLD) * 100, 100);
    const tvaColor = tvaProgress >= 100 ? 'var(--danger)' : tvaProgress >= 80 ? 'var(--warning)' : 'var(--success)';

    const MICRO_THRESHOLD = settings.micro_threshold || 77700;
    const microProgress = Math.min((totals.gross / MICRO_THRESHOLD) * 100, 100);
    const microColor = microProgress >= 100 ? 'var(--danger)' : microProgress >= 80 ? 'var(--warning)' : '#3b82f6';

    return (
        <div className="card">
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={confirmDelete}
                title="Supprimer le revenu ?"
                message="Cette action est irréversible."
            />

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800">Revenus</h2>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                        className="input w-32"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-wrap gap-4 justify-end">
                    <div className="px-3 py-1 bg-slate-100 rounded-lg text-slate-600 font-medium text-sm">
                        CA Brut: <span className="font-bold text-slate-900">{totals.gross.toFixed(2)}€</span>
                    </div>
                    <div className="px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-bold shadow-sm">
                        Net Final: {totals.final.toFixed(2)}€
                    </div>
                </div>
            </div>



            {/* FORM */}
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
                    <div className="lg:col-span-2">
                        <label className="label">Nom / Produit</label>
                        <input
                            placeholder="Description..."
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="label">Plateforme</label>
                        <select
                            value={platformId}
                            onChange={e => setPlatformId(e.target.value)}
                            className="input"
                        >
                            <option value="">Choisir...</option>
                            {platforms.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
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

                    {/* Role Specific Inputs */}
                    {user.role === 'artisan' && (
                        <>
                            <div>
                                <label className="label">Coût Matière</label>
                                <input
                                    type="number" step="0.01"
                                    value={addFormRole.material_cost}
                                    onChange={e => setAddFormRole({ ...addFormRole, material_cost: e.target.value })}
                                    className="input" placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="label">Heures</label>
                                <input
                                    type="number" step="0.5"
                                    value={addFormRole.hours_spent}
                                    onChange={e => setAddFormRole({ ...addFormRole, hours_spent: e.target.value })}
                                    className="input" placeholder="0 h"
                                />
                            </div>
                        </>
                    )}

                    {user.role === 'creator' && (
                        <>
                            <div>
                                <label className="label">Canal</label>
                                <select
                                    value={addFormRole.channel_source}
                                    onChange={e => setAddFormRole({ ...addFormRole, channel_source: e.target.value })}
                                    className="input"
                                >
                                    <option value="">Choisir...</option>
                                    <option value="Youtube">Youtube</option>
                                    <option value="Twitch">Twitch</option>
                                    <option value="Sponsor">Sponsor</option>
                                    <option value="Affiliation">Affiliation</option>
                                    <option value="Tipeee">Tipeee / Dons</option>
                                    <option value="Coaching">Coaching</option>
                                    <option value="Autre">Autre</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Type</label>
                                <select
                                    value={addFormRole.income_type}
                                    onChange={e => setAddFormRole({ ...addFormRole, income_type: e.target.value })}
                                    className="input"
                                >
                                    <option value="active">Actif</option>
                                    <option value="passive">Passif</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Date Fac.</label>
                                <input
                                    type="date"
                                    value={addFormRole.invoice_date}
                                    onChange={e => setAddFormRole({ ...addFormRole, invoice_date: e.target.value })}
                                    className="input"
                                />
                            </div>
                        </>
                    )}

                    {user.role === 'field_service' && (
                        <>
                            <div>
                                <label className="label">Statut</label>
                                <select
                                    value={addFormRole.status}
                                    onChange={e => setAddFormRole({ ...addFormRole, status: e.target.value })}
                                    className="input"
                                >
                                    <option value="confirmed">Payé</option>
                                    <option value="quote_sent">Devis Envoyé</option>
                                    <option value="quote_signed">Devis Signé</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Distance (km)</label>
                                <input
                                    type="number" step="1"
                                    value={addFormRole.distance_km}
                                    onChange={e => setAddFormRole({ ...addFormRole, distance_km: e.target.value })}
                                    className="input" placeholder="0 km"
                                />
                            </div>
                        </>
                    )}

                    {isEcommerce && (
                        <>
                            <div>
                                <label className="label">Coût Achat</label>
                                <input
                                    type="number" step="0.01"
                                    value={addFormEcommerce.cogs}
                                    onChange={e => setAddFormEcommerce({ ...addFormEcommerce, cogs: e.target.value })}
                                    className="input" placeholder="COGS"
                                />
                            </div>
                            <div>
                                <label className="label">Livraison</label>
                                <input
                                    type="number" step="0.01"
                                    value={addFormEcommerce.shipping_cost}
                                    onChange={e => setAddFormEcommerce({ ...addFormEcommerce, shipping_cost: e.target.value })}
                                    className="input" placeholder="Frais"
                                />
                            </div>
                        </>
                    )}

                    {!isEcommerce && user.role !== 'artisan' && user.role !== 'creator' && user.role !== 'field_service' && (
                        <div>
                            <label className="label">TJM</label>
                            <input
                                type="number"
                                step="1"
                                value={tjm}
                                onChange={e => setTjm(e.target.value)}
                                className="input" placeholder="Optionnel"
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={isRecurring}
                            onChange={e => setIsRecurring(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        Récurrent (tous les mois)
                    </label>
                    <button type="submit" className="btn-primary">
                        Ajouter
                    </button>
                </div>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="px-4 py-3 font-semibold text-slate-500">Date</th>
                            <th className="px-4 py-3 font-semibold text-slate-500">Nom</th>
                            <th className="px-4 py-3 font-semibold text-slate-500">Plateforme</th>
                            <th className="px-4 py-3 font-semibold text-slate-500 text-right">Montant</th>
                            {!isEcommerce && <th className="px-4 py-3 font-semibold text-slate-500 text-right">TJM</th>}
                            <th className="px-4 py-3 font-semibold text-slate-500 text-right text-red-500">Frais</th>
                            <th className="px-4 py-3 font-semibold text-slate-500 text-right">Net 1</th>
                            <th className="px-4 py-3 font-semibold text-slate-500 text-right text-indigo-500">URSSAF ({isEcommerce ? (settings.urssaf_ecommerce || 12.3) + '%' : (settings.urssaf_freelance || 25) + '%'})</th>
                            <th className="px-4 py-3 font-semibold text-slate-500 text-right text-emerald-600">Net Final</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredIncomes.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).map(inc => {
                            const isEditing = editingId === inc.id;
                            const { p, gross, fee, net1, urssaf, final } = calculate(isEditing ? { ...editForm, platformId: editForm.platformId || inc.platformId } : inc);

                            if (isEditing) {
                                return (
                                    <tr key={inc.id} className="bg-indigo-50">
                                        <td className="px-4 py-3"><input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="input text-xs" /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="input text-xs" />
                                                <label className="flex items-center gap-1 text-xs text-slate-500">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.is_recurring}
                                                        onChange={e => setEditForm({ ...editForm, is_recurring: e.target.checked })}
                                                    /> Recurrent
                                                </label>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select value={editForm.platformId} onChange={e => setEditForm({ ...editForm, platformId: e.target.value })} className="input text-xs">
                                                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3"><input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} className="input text-xs text-right" /></td>
                                        {!isEcommerce && (
                                            <td className="px-4 py-3"><input type="number" step="1" value={editForm.tjm || ''} onChange={e => setEditForm({ ...editForm, tjm: e.target.value })} className="input text-xs w-16 text-right" placeholder="-" /></td>
                                        )}
                                        <td colSpan="4" className="text-center text-xs text-slate-400 italic py-3">En édition...</td>
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
                                <tr key={inc.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-4 py-3 text-slate-600">{new Date(inc.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 font-medium text-slate-900">
                                        {inc.name}
                                        {inc.is_recurring && <span className="ml-2 text-[10px] uppercase font-bold text-blue-500 bg-blue-50 px-1 py-0.5 rounded">RECUR</span>}
                                        {inc.status === 'quote_sent' && <span className="ml-2 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs">DEVIS</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-600 border border-slate-200">
                                            {p ? p.name : 'Autre'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">{inc.amount.toFixed(2)}€</td>
                                    {!isEcommerce && (
                                        <td className="px-4 py-3 text-right text-slate-500 text-xs">{inc.tjm ? inc.tjm + '€' : '-'}</td>
                                    )}
                                    <td className="px-4 py-3 text-right text-red-500">-{fee.toFixed(2)}€</td>
                                    <td className="px-4 py-3 text-right text-slate-600">{net1.toFixed(2)}€</td>
                                    <td className="px-4 py-3 text-right text-indigo-600">-{urssaf.toFixed(2)}€</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{final.toFixed(2)}€</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEdit(inc)} className="p-1 hover:bg-indigo-50 text-indigo-600 rounded">
                                                ✎
                                            </button>
                                            <button onClick={() => handleDelete(inc.id)} className="p-1 hover:bg-red-50 text-red-600 rounded">
                                                ×
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredIncomes.length === 0 && (
                            <tr>
                                <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">
                                    Aucun revenu pour cette période
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {filteredIncomes.length > 0 && (
                        <tfoot className="bg-slate-50 font-semibold border-t border-slate-200">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-right text-slate-500 uppercase text-xs tracking-wider">Totaux</td>
                                <td className="px-4 py-3 text-right">{totals.gross.toFixed(2)}€</td>
                                {!isEcommerce && <td></td>}
                                <td className="px-4 py-3 text-right text-red-500">-{totals.fee.toFixed(2)}€</td>
                                <td className="px-4 py-3 text-right">{totals.net1.toFixed(2)}€</td>
                                <td className="px-4 py-3 text-right text-indigo-600">-{totals.urssaf.toFixed(2)}€</td>
                                <td className="px-4 py-3 text-right text-emerald-600 text-lg">{totals.final.toFixed(2)}€</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Jauges Seuils */}
            {/* Jauges Seuils */}
            <div className="grid gap-6 mb-8">
                {/* Jauge Franchise TVA */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between mb-2 text-sm text-slate-600">
                        <span>Franchise TVA (Seuil: {TVA_THRESHOLD.toLocaleString()}€)</span>
                        <span className="font-bold flex items-center gap-2" style={{ color: tvaColor }}>
                            {totals.gross.toFixed(2)}€
                            <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                {((totals.gross / TVA_THRESHOLD) * 100).toFixed(1)}%
                            </span>
                        </span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${tvaProgress}%`, backgroundColor: tvaColor }}
                        />
                    </div>
                    {tvaProgress >= 100 && (
                        <div className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1">
                            ⚠️ Seuil TVA dépassé
                        </div>
                    )}
                </div>

                {/* Jauge Plafond Micro */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between mb-2 text-sm text-slate-600">
                        <span>Plafond Micro-Entreprise (Seuil: {MICRO_THRESHOLD.toLocaleString()}€)</span>
                        <span className="font-bold flex items-center gap-2" style={{ color: microColor }}>
                            {totals.gross.toFixed(2)}€
                            <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                {((totals.gross / MICRO_THRESHOLD) * 100).toFixed(1)}%
                            </span>
                        </span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${microProgress}%`, backgroundColor: microColor }}
                        />
                    </div>
                    {microProgress >= 100 && (
                        <div className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1">
                            ⚠️ Seuil Micro dépassé : Passage en Société requis (si 2 ans consécutifs)
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={confirmDelete}
                message="Êtes-vous sûr de vouloir supprimer ce revenu ?"
            />
        </div >
    );
}
