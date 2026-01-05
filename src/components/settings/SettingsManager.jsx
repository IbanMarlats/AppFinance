import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Percent, Euro, Save, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function SettingsManager() {
    const { user } = useAuth();
    const [settings, setSettings] = useState({
        tva_threshold: '',
        tva_threshold_sell: '',
        micro_threshold: '',
        micro_threshold_sell: '',
        urssaf_freelance: '',
        urssaf_freelance_bnc: '',
        urssaf_freelance_bic: '',
        urssaf_ecommerce: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                // Initial fetch
                const res = await fetch('http://localhost:3001/api/settings', {
                    credentials: 'include'
                });

                if (res.ok) {
                    const data = await res.json();
                    setSettings({
                        tva_threshold: data.tva_threshold || '',
                        tva_threshold_sell: data.tva_threshold_sell || '',
                        micro_threshold: data.micro_threshold || '',
                        micro_threshold_sell: data.micro_threshold_sell || '',
                        urssaf_freelance: data.urssaf_freelance || '',
                        urssaf_freelance_bnc: data.urssaf_freelance_bnc || '',
                        urssaf_freelance_bic: data.urssaf_freelance_bic || '',
                        urssaf_ecommerce: data.urssaf_ecommerce || ''
                    });
                }
            } catch (err) {
                console.error("Failed to load settings", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const res = await fetch('http://localhost:3001/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                setMessage('Paramètres sauvegardés avec succès !');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Erreur lors de la sauvegarde');
            }
        } catch (err) {
            console.error(err);
            setMessage('Erreur réseau');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Configuration Fiscale</h2>
                <p className="text-slate-500 mt-1">
                    Les valeurs ci-dessous surchargent les taux par défaut du système. Laissez les champs vides pour utiliser les valeurs automatiques.
                </p>
            </div>

            {message && (
                <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-200 flex items-center gap-2 animate-in slide-in-from-top-2">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-medium">{message}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* SECTION 1: TVA (Amber) */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-amber-50/50 px-6 py-4 border-b border-amber-100 flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Franchise TVA</h3>
                            <p className="text-xs text-amber-700 font-medium">Seuils d'assujettissement</p>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Prestations de Services</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="tva_threshold"
                                    value={settings.tva_threshold}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                    placeholder="Ex: 37500"
                                />
                                <Euro className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5 ml-1">Pour BNC et BIC Services</p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Vente de Marchandises</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="tva_threshold_sell"
                                    value={settings.tva_threshold_sell}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                    placeholder="Ex: 91900"
                                />
                                <Euro className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5 ml-1">Pour Achat/Revente et Logement</p>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: MICRO (Blue) */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-blue-50/50 px-6 py-4 border-b border-blue-100 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Régime Micro-Entreprise</h3>
                            <p className="text-xs text-blue-700 font-medium">Plafonds de chiffre d'affaires</p>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Plafond Services</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="micro_threshold"
                                    value={settings.micro_threshold}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                    placeholder="Ex: 77700"
                                />
                                <Euro className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Plafond Vente</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="micro_threshold_sell"
                                    value={settings.micro_threshold_sell}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                    placeholder="Ex: 188700"
                                />
                                <Euro className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 3: URSSAF (Emerald) */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-emerald-50/50 px-6 py-4 border-b border-emerald-100 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Percent className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Cotisations URSSAF</h3>
                            <p className="text-xs text-emerald-700 font-medium">Taux de charges sociales</p>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Services BNC</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    name="urssaf_freelance_bnc"
                                    value={settings.urssaf_freelance_bnc}
                                    onChange={handleChange}
                                    className="block w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                    placeholder="Ex: 23.1"
                                />
                                <div className="absolute right-3.5 top-3 text-slate-400 text-xs font-bold">%</div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Libéral (CIPAV/SSI)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Services BIC</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    name="urssaf_freelance_bic"
                                    value={settings.urssaf_freelance_bic}
                                    onChange={handleChange}
                                    className="block w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                    placeholder="Ex: 21.2"
                                />
                                <div className="absolute right-3.5 top-3 text-slate-400 text-xs font-bold">%</div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Artisan / Commercial</p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Vente (Ecommerce)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    name="urssaf_ecommerce"
                                    value={settings.urssaf_ecommerce}
                                    onChange={handleChange}
                                    className="block w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                    placeholder="Ex: 12.3"
                                />
                                <div className="absolute right-3.5 top-3 text-slate-400 text-xs font-bold">%</div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-4 pb-8">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                <span>Sauvegarde...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                <span>Sauvegarder la configuration</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
