import { useState, useEffect } from 'react';
import axios from 'axios';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
    const { user } = useAuth();
    const { settings, updateSettings } = useFinance();

    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Search State
    const [searchEmail, setSearchEmail] = useState('');
    const [searchedUser, setSearchedUser] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    // Settings State
    const [localSettings, setLocalSettings] = useState({});
    const [settingsLoading, setSettingsLoading] = useState(false);

    // Newsletter State
    const [newsletterSubject, setNewsletterSubject] = useState('');
    const [newsletterMessage, setNewsletterMessage] = useState('');
    const [newsletterSending, setNewsletterSending] = useState(false);
    const [newsletterStatus, setNewsletterStatus] = useState(null);

    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get('http://localhost:3001/api/admin/stats');
                setStats(res.data);
            } catch (err) {
                console.error('Error fetching admin stats:', err);
                setError('Accès refusé ou erreur serveur');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const handleSettingsChange = (key, value) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const saveSettings = async () => {
        setSettingsLoading(true);
        try {
            await updateSettings(localSettings);
            alert('Paramètres mis à jour !');
        } catch (err) {
            alert('Erreur lors de la mise à jour des paramètres');
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setSearchLoading(true);
        setSearchError('');
        setSearchedUser(null);
        try {
            const res = await axios.post('http://localhost:3001/api/admin/search', { email: searchEmail });
            setSearchedUser(res.data);
        } catch (err) {
            setSearchError(err.response?.data?.error || 'Utilisateur introuvable');
        } finally {
            setSearchLoading(false);
        }
    };

    const togglePremium = async () => {
        if (!searchedUser) return;
        try {
            const newStatus = !searchedUser.is_premium;
            await axios.put(`http://localhost:3001/api/admin/user/${searchedUser.id}/premium`, { is_premium: newStatus });
            setSearchedUser(prev => ({ ...prev, is_premium: newStatus }));
            // Refresh stats to reflect change
            const res = await axios.get('http://localhost:3001/api/admin/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Error toggling premium:', err);
            alert('Erreur lors de la mise à jour');
        }
    };

    const sendNewsletter = async () => {
        setNewsletterSending(true);
        setNewsletterStatus({ type: 'info', msg: 'Envoi en cours...' });
        try {
            const res = await axios.post('http://localhost:3001/api/admin/newsletter/send', {
                subject: newsletterSubject,
                message: newsletterMessage
            });
            setNewsletterStatus({
                type: 'success',
                msg: `Newsletter envoyée avec succès ! (Envoyé: ${res.data.sent}, Erreurs: ${res.data.errors})`
            });
            setNewsletterSubject('');
            setNewsletterMessage('');
        } catch (err) {
            setNewsletterStatus({ type: 'error', msg: 'Erreur lors de l\'envoi : ' + (err.response?.data?.error || err.message) });
        } finally {
            setNewsletterSending(false);
        }
    };

    const calculateConversionRate = () => {
        if (!stats || !stats.activeUsers) return 0;
        return ((stats.activePremiumUsers / stats.activeUsers) * 100).toFixed(1);
    };

    const getConversionColor = (rate) => {
        if (rate > 5) return '#16a34a'; // Green
        if (rate >= 2) return '#ca8a04'; // Yellow
        return '#dc2626'; // Red
    };

    if (loading) return <div>Chargement...</div>;
    if (error) return <div style={{ color: 'var(--danger)' }}>{error}</div>;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Tableau de Bord Admin</h2>

            {/* User Search Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Gestion Utilisateur</h3>
                <form onSubmit={handleSearch} className="flex gap-4 mb-4">
                    <input
                        type="email"
                        placeholder="Rechercher par email..."
                        value={searchEmail}
                        onChange={e => setSearchEmail(e.target.value)}
                        className="flex-1 input"
                    />
                    <button type="submit" disabled={searchLoading} className="btn-primary whitespace-nowrap">
                        {searchLoading ? '...' : 'Chercher'}
                    </button>
                </form>

                {searchError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4">{searchError}</div>}

                {searchedUser && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-800 text-lg">{searchedUser.email}</h4>
                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium uppercase tracking-wide text-slate-600">
                                {searchedUser.role}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Inscrit le:</span>
                                <span>{searchedUser.created_at ? new Date(searchedUser.created_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Dernière connexion:</span>
                                <span>{searchedUser.last_login ? new Date(searchedUser.last_login).toLocaleDateString() : 'Jamais'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Statut:</span>
                                {searchedUser.is_premium ? (
                                    <span className="text-emerald-600 font-bold flex items-center gap-1">Premium ★</span>
                                ) : (
                                    <span className="text-slate-500">Standard</span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={togglePremium}
                            className={`w-full py-2 rounded-lg font-bold transition-colors ${searchedUser.is_premium
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                        >
                            {searchedUser.is_premium ? 'Retirer Premium' : 'Passer Premium'}
                        </button>
                    </div>
                )}
            </div>

            {/* Global Settings Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Configuration Globale</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="label">Seuil TVA (€)</label>
                        <input
                            type="number"
                            value={localSettings.tva_threshold || ''}
                            onChange={e => handleSettingsChange('tva_threshold', e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="label">Seuil Micro-Entreprise (€)</label>
                        <input
                            type="number"
                            value={localSettings.micro_threshold || ''}
                            onChange={e => handleSettingsChange('micro_threshold', e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="label">% URSSAF (Freelance)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={localSettings.urssaf_freelance || ''}
                            onChange={e => handleSettingsChange('urssaf_freelance', e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="label">% URSSAF (E-commerce)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={localSettings.urssaf_ecommerce || ''}
                            onChange={e => handleSettingsChange('urssaf_ecommerce', e.target.value)}
                            className="input"
                        />
                    </div>
                </div>
                <button onClick={saveSettings} disabled={settingsLoading} className="btn-primary">
                    {settingsLoading ? 'Sauvegarde...' : 'Sauvegarder les Paliers'}
                </button>
            </div>

            {/* Newsletter Sending Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Envoyer une Newsletter</h3>
                <div className="space-y-4">
                    <div>
                        <label className="label">Sujet</label>
                        <input
                            type="text"
                            placeholder="Sujet de la newsletter"
                            value={newsletterSubject}
                            onChange={e => setNewsletterSubject(e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="label">Message</label>
                        <textarea
                            placeholder="Contenu du message..."
                            value={newsletterMessage}
                            onChange={e => setNewsletterMessage(e.target.value)}
                            rows={6}
                            className="textarea w-full"
                        />
                    </div>
                    {newsletterStatus && (
                        <div className={`p-3 rounded-lg text-sm border ${newsletterStatus.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                            newsletterStatus.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                            {newsletterStatus.msg}
                        </div>
                    )}
                    <button
                        onClick={sendNewsletter}
                        disabled={newsletterSending || !newsletterSubject || !newsletterMessage}
                        className="btn-primary"
                    >
                        {newsletterSending ? 'Envoi en cours...' : 'Envoyer la Newsletter'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
                    <div className="text-blue-800 font-bold text-lg mb-2">Utilisateurs Total</div>
                    <div className="text-4xl font-bold text-blue-900">{stats.totalUsers}</div>
                </div>
                <div className="bg-sky-50 p-6 rounded-xl border border-sky-100 text-center">
                    <div className="text-sky-800 font-bold text-lg mb-2">Visiteurs Uniques</div>
                    <div className="text-4xl font-bold text-sky-900">{stats.uniqueVisitors || 0}</div>
                </div>
                <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 text-center">
                    <div className="text-orange-800 font-bold text-lg mb-2">Utilisateurs Premium</div>
                    <div className="text-4xl font-bold text-orange-900">{stats.premiumUsers}</div>
                </div>
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 text-center">
                    <div className="text-emerald-800 font-bold text-lg mb-2">Utilisateurs Actifs <small className="text-sm font-normal">(3 mois)</small></div>
                    <div className="text-4xl font-bold text-emerald-900">{stats.activeUsers}</div>
                </div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                    <div className="text-slate-800 font-bold text-lg mb-2">Taux Conversion Premium</div>
                    <div className="text-4xl font-bold" style={{ color: getConversionColor(calculateConversionRate()) }}>
                        {calculateConversionRate()}%
                    </div>
                </div>
                <div className="bg-fuchsia-50 p-6 rounded-xl border border-fuchsia-100 text-center">
                    <div className="text-fuchsia-800 font-bold text-lg mb-2">Abonnés Newsletter</div>
                    <div className="text-4xl font-bold text-fuchsia-900">{stats.newsletterUsers || 0}</div>
                </div>
            </div>

            {/* Admin Logs moved to separate tab */}

            <h3 className="text-lg font-bold text-slate-800 mb-4 mt-8">Répartition par Rôle</h3>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 font-semibold text-slate-500">Rôle</th>
                            <th className="px-6 py-4 font-semibold text-slate-500 text-right">Nombre d'utilisateurs</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {Object.entries(stats.usersByRole || {}).map(([role, count]) => (
                            <tr key={role} className="hover:bg-slate-50">
                                <td className="px-6 py-4 capitalize">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' :
                                            role === 'ecommerce' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                        {role === 'admin' ? 'Administrateur' :
                                            role === 'freelance' ? 'Freelance' :
                                                role === 'artisan' ? 'Artisan / Créateur' :
                                                    role === 'creator' ? 'Créateur de Contenu' :
                                                        role === 'field_service' ? 'Prestataire Terrain' :
                                                            role === 'ecommerce' ? 'E-commerce' :
                                                                role === 'perso' ? 'Personnel' : role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-700">{count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
