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
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Tableau de Bord Admin</h2>

            {/* User Search Section */}
            <div className="card" style={{ marginBottom: '2rem', border: '1px solid #e5e7eb', boxShadow: 'none' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Gestion Utilisateur</h3>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                        type="email"
                        placeholder="Rechercher par email..."
                        value={searchEmail}
                        onChange={e => setSearchEmail(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" disabled={searchLoading} className="primary btn-action">
                        {searchLoading ? '...' : 'Chercher'}
                    </button>
                </form>

                {searchError && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{searchError}</div>}

                {searchedUser && (
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{searchedUser.email}</h4>
                            <span className="badge" style={{ textTransform: 'capitalize' }}>{searchedUser.role}</span>
                        </div>
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>
                            <div>Inscrit le: {searchedUser.created_at ? new Date(searchedUser.created_at).toLocaleDateString() : 'N/A'}</div>
                            <div>Dernière connexion: {searchedUser.last_login ? new Date(searchedUser.last_login).toLocaleDateString() : 'Jamais'}</div>
                            <div>Statut: {searchedUser.is_premium ?
                                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Premium ★</span> :
                                <span style={{ color: '#64748b' }}>Standard</span>}
                            </div>
                        </div>
                        <button
                            onClick={togglePremium}
                            className={searchedUser.is_premium ? 'danger btn-action' : 'primary btn-action'}
                            style={{ width: '100%' }}
                        >
                            {searchedUser.is_premium ? 'Retirer Premium' : 'Passer Premium'}
                        </button>
                    </div>
                )}
            </div>

            {/* Global Settings Section */}
            <div className="card" style={{ marginBottom: '2rem', border: '1px solid #e5e7eb', boxShadow: 'none' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Configuration Globale</h3>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: '#64748b' }}>Seuil TVA (€)</label>
                        <input
                            type="number"
                            value={localSettings.tva_threshold || ''}
                            onChange={e => handleSettingsChange('tva_threshold', e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: '#64748b' }}>Seuil Micro-Entreprise (€)</label>
                        <input
                            type="number"
                            value={localSettings.micro_threshold || ''}
                            onChange={e => handleSettingsChange('micro_threshold', e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: '#64748b' }}>% URSSAF (Freelance)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={localSettings.urssaf_freelance || ''}
                            onChange={e => handleSettingsChange('urssaf_freelance', e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: '#64748b' }}>% URSSAF (E-commerce)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={localSettings.urssaf_ecommerce || ''}
                            onChange={e => handleSettingsChange('urssaf_ecommerce', e.target.value)}
                        />
                    </div>
                </div>
                <button onClick={saveSettings} disabled={settingsLoading} className="primary btn-action" style={{ width: 'auto' }}>
                    {settingsLoading ? 'Sauvegarde...' : 'Sauvegarder les Paliers'}
                </button>
            </div>

            {/* Newsletter Sending Section */}
            <div className="card" style={{ marginBottom: '2rem', border: '1px solid #e5e7eb', boxShadow: 'none' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Envoyer une Newsletter</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: '#64748b' }}>Sujet</label>
                        <input
                            type="text"
                            placeholder="Sujet de la newsletter"
                            value={newsletterSubject}
                            onChange={e => setNewsletterSubject(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: '#64748b' }}>Message</label>
                        <textarea
                            placeholder="Contenu du message..."
                            value={newsletterMessage}
                            onChange={e => setNewsletterMessage(e.target.value)}
                            rows={6}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #d1d5db',
                                resize: 'vertical'
                            }}
                        />
                    </div>
                    {newsletterStatus && (
                        <div style={{
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            backgroundColor: newsletterStatus.type === 'success' ? '#f0fdf4' : newsletterStatus.type === 'error' ? '#fef2f2' : '#eff6ff',
                            color: newsletterStatus.type === 'success' ? '#166534' : newsletterStatus.type === 'error' ? '#991b1b' : '#1e40af',
                            fontSize: '0.9rem'
                        }}>
                            {newsletterStatus.msg}
                        </div>
                    )}
                    <button
                        onClick={sendNewsletter}
                        disabled={newsletterSending || !newsletterSubject || !newsletterMessage}
                        className="primary btn-action"
                        style={{ width: 'auto' }}
                    >
                        {newsletterSending ? 'Envoi en cours...' : 'Envoyer la Newsletter'}
                    </button>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1.5rem', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe', textAlign: 'center' }}>
                    <div style={{ color: '#1e40af', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Utilisateurs Total</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1e3a8a' }}>{stats.totalUsers}</div>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5', textAlign: 'center' }}>
                    <div style={{ color: '#9a3412', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Utilisateurs Premium</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#c2410c' }}>{stats.premiumUsers}</div>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7', textAlign: 'center' }}>
                    <div style={{ color: '#166534', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Utilisateurs Actifs <small>(3 mois)</small></div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#15803d' }}>{stats.activeUsers}</div>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #e5e5e5', textAlign: 'center' }}>
                    <div style={{ color: '#404040', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Taux Conversion Premium</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getConversionColor(calculateConversionRate()) }}>
                        {calculateConversionRate()}%
                    </div>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: '#fdf4ff', borderRadius: '8px', border: '1px solid #f0abfc', textAlign: 'center' }}>
                    <div style={{ color: '#86198f', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Abonnés Newsletter</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#a21caf' }}>{stats.newsletterUsers || 0}</div>
                </div>
            </div>

            <h3 style={{ marginBottom: '1rem' }}>Répartition par Rôle</h3>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Rôle</th>
                            <th>Nombre d'utilisateurs</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(stats.usersByRole || {}).map(([role, count]) => (
                            <tr key={role}>
                                <td style={{ textTransform: 'capitalize' }}>
                                    <span className="badge" style={{
                                        backgroundColor: role === 'admin' ? '#fef2f2' : role === 'ecommerce' ? '#f0fdf4' : '#eff6ff',
                                        color: role === 'admin' ? '#991b1b' : role === 'ecommerce' ? '#166534' : '#1e40af'
                                    }}>
                                        {role}
                                    </span>
                                </td>
                                <td style={{ fontWeight: 'bold' }}>{count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
