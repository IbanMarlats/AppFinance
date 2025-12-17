import { useState, useEffect } from 'react';
import axios from 'axios';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import RevenueChart from './RevenueChart';

export default function AdminDashboard() {
    const { user } = useAuth();
    const { settings, updateSettings } = useFinance();

    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // User List State
    const [users, setUsers] = useState([]);
    const [userLoading, setUserLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState('all'); // all, premium, trial, standard
    const [sort, setSort] = useState('newest'); // newest, oldest, premium, login
    const [searchQuery, setSearchQuery] = useState('');

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

    const fetchUsers = async () => {
        setUserLoading(true);
        try {
            const res = await axios.post('http://localhost:3001/api/admin/users', {
                page,
                limit: 10,
                search: searchQuery,
                filter,
                sort
            });
            setUsers(res.data.users);
            setTotalPages(res.data.pages);
        } catch (err) {
            console.error(err);
        } finally {
            setUserLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, filter, sort]); // Fetch on change. Search is manual or debounced? Let's make search manual for now or debounced.

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

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

    const handleSubscriptionChange = async (userId, type) => {
        if (!confirm(`Passer cet utilisateur en ${type} ?`)) return;
        try {
            await axios.put(`http://localhost:3001/api/admin/user/${userId}/subscription`, { type });

            // Refresh users and stats
            fetchUsers();

            const res = await axios.get('http://localhost:3001/api/admin/stats');
            setStats(res.data);
            alert('Abonnement mis à jour !');
        } catch (err) {
            console.error('Error updating subscription:', err);
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

            {/* User Management Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-slate-800">Gestion Utilisateurs</h3>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Rechercher email..."
                                className="pl-9 input py-1.5 text-sm"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </form>
                        <select
                            className="input py-1.5 text-sm w-auto"
                            value={filter}
                            onChange={e => { setFilter(e.target.value); setPage(1); }}
                        >
                            <option value="all">Tous</option>
                            <option value="premium">Premium</option>
                            <option value="trial">Essai</option>
                            <option value="standard">Standard</option>
                        </select>
                        <select
                            className="input py-1.5 text-sm w-auto"
                            value={sort}
                            onChange={e => { setSort(e.target.value); setPage(1); }}
                        >
                            <option value="newest">Récents</option>
                            <option value="oldest">Anciens</option>
                            <option value="premium">Premium d'abord</option>
                            <option value="login">Dernière connexion</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                <th className="px-4 py-3 font-semibold">Email</th>
                                <th className="px-4 py-3 font-semibold">Rôle</th>
                                <th className="px-4 py-3 font-semibold">Statut</th>
                                <th className="px-4 py-3 font-semibold">Connexion</th>
                                <th className="px-4 py-3 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {userLoading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Chargement...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Aucun utilisateur trouvé</td></tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">{u.email}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 rounded text-xs border bg-white capitalize text-slate-600">
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {u.subscription_plan === 'lifetime' ? (
                                                    <span className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded flex items-center gap-1">
                                                        ∞ À Vie
                                                    </span>
                                                ) : u.is_gift ? (
                                                    <span className="text-xs font-bold text-pink-600 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded flex items-center gap-1">
                                                        🎁 Offert ({u.subscription_plan === 'monthly' ? '1M' : u.subscription_plan === 'annual' ? '1A' : 'Vie'})
                                                    </span>
                                                ) : u.subscription_plan === 'trial' ? (
                                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                                        Essai ({u.trial_until ? Math.ceil((new Date(u.trial_until) - new Date()) / (1000 * 60 * 60 * 24)) : 0}j)
                                                    </span>
                                                ) : u.is_premium ? (
                                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                                                        ★ {u.subscription_plan === 'annual' ? 'Annuel' : 'Mensuel'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Standard</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                            {u.last_login ? new Date(u.last_login).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <select
                                                className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-indigo-500"
                                                onChange={(e) => handleSubscriptionChange(u.id, e.target.value)}
                                                value="action"
                                            >
                                                <option value="action" disabled>Gérer...</option>
                                                <option value="trial">Essai 14j</option>
                                                <option value="monthly">1 Mois</option>
                                                <option value="annual">1 An</option>
                                                <option value="lifetime">À Vie</option>
                                                <optgroup label="Offert (Gratuit)">
                                                    <option value="gift_monthly">Offert - 1 Mois</option>
                                                    <option value="gift_annual">Offert - 1 An</option>
                                                    <option value="gift_lifetime">Offert - À Vie</option>
                                                </optgroup>
                                                <option value="none">Retirer</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Page {page} sur {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-1 rounded border hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-1 rounded border hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
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
                {/* Total Users */}
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
                    <div className="text-blue-800 font-bold text-lg mb-2">Utilisateurs Total</div>
                    <div className="text-4xl font-bold text-blue-900">{stats.totalUsers}</div>
                </div>

                {/* Premium */}
                <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 text-center">
                    <div className="text-amber-800 font-bold text-lg mb-2">Premium Total</div>
                    <div className="text-4xl font-bold text-amber-900">{stats.premiumUsers}</div>
                    <div className="flex justify-center gap-2 mt-2 text-xs font-semibold opacity-75 flex-wrap">
                        <span title="Mensuel" className="px-1 bg-amber-100 rounded">
                            M: {stats.premiumMonthly || 0} ({stats.premiumUsers ? Math.round((stats.premiumMonthly / stats.premiumUsers) * 100) : 0}%)
                        </span>
                        <span title="Annuel" className="px-1 bg-amber-100 rounded">
                            A: {stats.premiumAnnual || 0} ({stats.premiumUsers ? Math.round((stats.premiumAnnual / stats.premiumUsers) * 100) : 0}%)
                        </span>
                        {(stats.premiumLifetime > 0) && (
                            <span title="À Vie" className="px-1 bg-purple-100 text-purple-800 rounded">
                                V: {stats.premiumLifetime || 0} ({stats.premiumUsers ? Math.round((stats.premiumLifetime / stats.premiumUsers) * 100) : 0}%)
                            </span>
                        )}
                        {(stats.premiumGift > 0) && (
                            <span title="Offert (Cadeau)" className="px-1 bg-pink-100 text-pink-800 rounded">
                                O: {stats.premiumGift || 0} (
                                {stats.giftBreakdown ? (
                                    <>
                                        M:{stats.giftBreakdown.monthly} A:{stats.giftBreakdown.annual} V:{stats.giftBreakdown.lifetime}
                                    </>
                                ) : (
                                    <>100%</>
                                )}
                                )
                            </span>
                        )}
                        {(stats.premiumTrial > 0) && (
                            <span title="Essai" className="px-1 bg-blue-100 text-blue-800 rounded">
                                E: {stats.premiumTrial || 0} ({stats.premiumUsers ? Math.round((stats.premiumTrial / stats.premiumUsers) * 100) : 0}%)
                            </span>
                        )}
                    </div>
                </div>

                {/* Trial Strategy */}
                <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 text-center">
                    <div className="text-purple-800 font-bold text-lg mb-2">Essais & Avenir</div>
                    <div className="text-4xl font-bold text-purple-900">{stats.trialUsers} <span className="text-base text-purple-700 font-normal">actifs</span></div>
                    <div className="flex justify-center gap-3 mt-2 text-xs font-medium">
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                            Conv: {stats.trialConverted}
                            ({(stats.trialConverted + stats.trialChurn) > 0
                                ? Math.round((stats.trialConverted / (stats.trialConverted + stats.trialChurn)) * 100)
                                : 0}%)
                        </span>
                        <span className="text-red-700 bg-red-100 px-2 py-1 rounded">Perdus: {stats.trialChurn}</span>
                    </div>
                </div>

                {/* Active Users */}
                <div className="bg-teal-50 p-6 rounded-xl border border-teal-100 text-center">
                    <div className="text-teal-800 font-bold text-lg mb-2">Actifs (3 mois)</div>
                    <div className="text-4xl font-bold text-teal-900">{stats.activeUsers}</div>
                    <div className="text-xs text-teal-700 mt-1 font-medium">{stats.activePremiumUsers} Premium actifs</div>
                </div>

                {/* Revenue */}
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 text-center">
                    <div className="text-emerald-800 font-bold text-lg mb-2">Revenu Estimé (MRR)</div>
                    <div className="text-4xl font-bold text-emerald-900">{stats.projectedMRR ? stats.projectedMRR.toFixed(2) : '0.00'} €</div>
                    <div className="text-xs text-emerald-700 mt-1 font-medium">/ mois (hors essais/cadeaux)</div>
                    <div className="mt-2 text-[10px] text-emerald-600">
                        Croissance ce mois: {stats.mrrHistory && stats.mrrHistory.length >= 2 ? (() => {
                            const current = stats.mrrHistory[11].value;
                            const previous = stats.mrrHistory[10].value;
                            if (previous === 0 && current === 0) return '0%';
                            if (previous === 0) return 'inf.';
                            return (current > previous ? '+' : '') + (((current - previous) / previous) * 100).toFixed(0) + '%';
                        })() : '0%'}
                    </div>
                </div>

                {/* Unique Visitors */}
                <div className="bg-sky-50 p-6 rounded-xl border border-sky-100 text-center">
                    <div className="text-sky-800 font-bold text-lg mb-2">Visiteurs Uniques</div>
                    <div className="text-4xl font-bold text-sky-900">{stats.uniqueVisitors || 0}</div>
                </div>

                {/* Newsletter */}
                <div className="bg-fuchsia-50 p-6 rounded-xl border border-fuchsia-100 text-center">
                    <div className="text-fuchsia-800 font-bold text-lg mb-2">Abonnés Newsletter</div>
                    <div className="text-4xl font-bold text-fuchsia-900">{stats.newsletterUsers || 0}</div>
                </div>
            </div>

            {/* Admin Logs moved to separate tab */}

            {/* MRR Chart and History */}
            <h3 className="text-lg font-bold text-slate-800 mb-4 mt-8">Évolution du Revenu (MRR)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="md:col-span-2">
                    {/* Reuse RevenueChart but adapt data structure if necessary. 
                        RevenueChart expects { 'YYYY-MM': { income: X } } or we can modify it.
                        Actually, existing RevenueChart takes 'data' object. 
                        Let's transform mrrHistory array to that object format.
                    */}
                    <RevenueChart
                        customData={(stats.mrrHistory || []).map(h => h.value)}
                        customLabels={(stats.mrrHistory || []).map(h => new Date(h.month + '-01').toLocaleDateString('fr-FR', { month: 'short' }))}
                    />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-emerald-50 border-b border-emerald-100">
                                <th className="px-4 py-3 font-semibold text-emerald-800">Mois</th>
                                <th className="px-4 py-3 font-semibold text-emerald-800 text-right">MRR</th>
                                <th className="px-4 py-3 font-semibold text-emerald-800 text-right">Croissance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(!stats.mrrHistory || stats.mrrHistory.length === 0) ? (
                                <tr><td colSpan="3" className="px-4 py-3 text-center text-slate-500">Aucune donnée</td></tr>
                            ) : (
                                [...stats.mrrHistory].reverse().map((stat, index) => {
                                    // Calculate growth from previous month (logic tricky in reverse loop, better use original index)
                                    // previous month is actually index+1 in reversed array (older)
                                    // Wait, simple calculation:
                                    const prevVal = index < stats.mrrHistory.length - 1 ? stats.mrrHistory[stats.mrrHistory.length - 1 - (index + 1)].value : stat.value;
                                    const growth = stat.value - prevVal;
                                    const growthPct = prevVal > 0 ? (growth / prevVal) * 100 : 0;

                                    return (
                                        <tr key={stat.month} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-700 capitalize">
                                                {new Date(stat.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-800">{stat.value.toFixed(2)} €</td>
                                            <td className={`px-4 py-3 text-right font-medium ${growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {index < stats.mrrHistory.length - 1 ? (
                                                    <>{growth >= 0 ? '+' : ''}{growthPct.toFixed(0)}%</>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Trial Evolution Table */}
            <h3 className="text-lg font-bold text-slate-800 mb-4 mt-8">Évolution des Essais (12 derniers mois)</h3>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 font-semibold text-slate-500">Mois</th>
                            <th className="px-6 py-4 font-semibold text-slate-500 text-right">Essais Terminés</th>
                            <th className="px-6 py-4 font-semibold text-emerald-600 text-right">Convertis</th>
                            <th className="px-6 py-4 font-semibold text-red-600 text-right">Perdus</th>
                            <th className="px-6 py-4 font-semibold text-blue-600 text-right">Taux Conv.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(!stats.trialMonthlyStats || stats.trialMonthlyStats.length === 0) ? (
                            <tr><td colSpan="5" className="px-6 py-4 text-center text-slate-500">Aucune donnée historique</td></tr>
                        ) : (
                            stats.trialMonthlyStats.map((stat, index) => (
                                <tr key={index} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-700 capitalize">
                                        {new Date(stat.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800">{stat.count}</td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">{stat.converted}</td>
                                    <td className="px-6 py-4 text-right font-bold text-red-600">{stat.churn}</td>
                                    <td className="px-6 py-4 text-right font-bold text-blue-600">
                                        {stat.count > 0 ? Math.round((stat.converted / stat.count) * 100) : 0}%
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
