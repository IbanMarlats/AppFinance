import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Mail, Calendar, CreditCard, Shield, User, ExternalLink, Crown } from 'lucide-react';
import PremiumSubscriptionBlock from '../ui/PremiumSubscriptionBlock';

// Force refresh

export default function UserProfile() {
    const { user, login } = useAuth(); // Need login to update user state if context supports it, or reload.
    // Actually useAuth login usually sets state. 
    // If useAuth doesn't expose a 'refreshUser' or 'updateUser', we might need to reload window or manually update.
    // Let's assume we can just reload for now or use login to refresh.
    // Looking at useAuth in previous context, it has 'user', 'logout', 'loading'. No 'updateUser'.
    // So simple reload is safest.

    if (!user) return null;

    const [loading, setLoading] = useState(null);



    const handleManageSubscription = async () => {
        setLoading('manage');
        try {
            const res = await axios.post('http://localhost:3001/api/stripe/create-portal-session', {}, { withCredentials: true });
            if (res.data.url) {
                window.location.href = res.data.url;
            }
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'accès au portail de facturation.");
        } finally {
            setLoading(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Inconnue';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg ring-4 ring-white">
                            {user.email.charAt(0).toUpperCase()}
                        </div>
                        {user.is_premium && (
                            <div className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-2 ring-4 ring-white shadow-md flex items-center justify-center">
                                <Crown size={20} fill="currentColor" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.email}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            {/* Role Badge with Edit */}
                            {loading === 'role' ? (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                    Mise à jour...
                                </span>
                            ) : (
                                <div className="relative group">
                                    <select
                                        className={`appearance-none pl-8 pr-8 py-1 rounded-full text-sm font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${user.role === 'admin'
                                            ? 'bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-200'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 focus:ring-slate-200 hover:bg-slate-100'
                                            }`}
                                        value={user.role}
                                        onChange={async (e) => {
                                            const newRole = e.target.value;
                                            if (newRole === user.role) return;

                                            if (!confirm(`Confirmez-vous le changement de rôle vers ${e.target.options[e.target.selectedIndex].text} ?`)) {
                                                e.target.value = user.role; // Reset
                                                return;
                                            }

                                            setLoading('role');
                                            try {
                                                await axios.put('http://localhost:3001/api/auth/me', { role: newRole }, { withCredentials: true });
                                                window.location.reload(); // Simple reload to refresh all context/UI
                                            } catch (err) {
                                                console.error(err);
                                                alert("Erreur lors de la mise à jour du rôle");
                                                setLoading(null);
                                            }
                                        }}
                                        disabled={user.role === 'admin'} // Admin role locked or special handling? Let's allow change if not admin, or just show text for admin.
                                    >
                                        <option value="freelance">Freelance</option>
                                        <option value="artisan">Artisan / Créateur</option>
                                        <option value="creator">Créateur de Contenu</option>
                                        <option value="field_service">Prestataire Terrain</option>
                                        <option value="ecommerce">E-commerce</option>
                                        <option value="perso">Personnel</option>
                                        {user.role === 'admin' && <option value="admin">Administrateur</option>}
                                    </select>
                                    <Shield size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${user.role === 'admin' ? 'text-purple-700' : 'text-slate-500'
                                        }`} />
                                    {/* Edit Icon hint on hover if not mobile */}
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    </div>
                                </div>
                            )}

                            <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${user.is_verified
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                <User size={14} />
                                {user.is_verified ? 'Vérifié' : 'Non vérifié'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subscription Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                            <CreditCard size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Abonnement</h2>
                    </div>

                    {user.is_premium ? (
                        <>
                            <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 mb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-sm text-amber-600 font-medium mb-1">Plan actuel</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-lg font-bold text-amber-900">
                                                {user.trial_until && new Date(user.trial_until) > new Date() ? 'Essai Gratuit' : 'Premium'} {
                                                    user.subscription_plan === 'lifetime' ? 'À Vie' :
                                                        user.subscription_plan === 'annual' ? 'Annuel' :
                                                            'Mensuel'
                                                }
                                            </p>
                                            {user.trial_until && new Date(user.trial_until) > new Date() ? (
                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-200 text-blue-800 border border-blue-300 uppercase tracking-wide">ESSAI</span>
                                            ) : user.is_gift ? (
                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-pink-200 text-pink-800 border border-pink-300 uppercase tracking-wide">OFFERT</span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-200 text-amber-800 border border-amber-300 uppercase tracking-wide">PRO</span>
                                            )}
                                        </div>
                                    </div>
                                    {user.trial_until && new Date(user.trial_until) > new Date() ? (
                                        <div className="text-right">
                                            <p className="text-sm text-blue-600 font-medium mb-1">Fin de l'essai le</p>
                                            <p className="text-sm font-semibold text-blue-900">
                                                {formatDate(user.trial_until)}
                                            </p>
                                        </div>
                                    ) : user.premium_until && (
                                        <div className="text-right">
                                            <p className="text-sm text-amber-600 font-medium mb-1">Renouvellement le</p>
                                            <p className="text-sm font-semibold text-amber-900">
                                                {formatDate(user.premium_until)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline disabled:opacity-50"
                                        onClick={handleManageSubscription}
                                        disabled={loading === 'manage'}
                                    >
                                        {loading === 'manage' ? 'Chargement...' : 'Gérer mon abonnement'}
                                    </button>
                                </div>
                            </div>

                            {/* Detailed Benefits List for Active Subscribers */}
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-100">
                                <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                    <Crown size={16} className="text-amber-500 fill-amber-500" />
                                    Avantages Premium Actifs
                                </h3>
                                <ul className="space-y-3">
                                    {[
                                        'Tableau de bord avancé & KPI illimités',
                                        'Objectifs mensuels & Suivi de budget',
                                        'Export PDF & CSV comptable',
                                        'Support prioritaire & Accès VIP',
                                        'Badge Premium exclusif'
                                    ].map((feat, i) => (
                                        <li key={i} className="flex items-center gap-3 text-indigo-800 text-sm">
                                            <div className="p-0.5 bg-indigo-200 rounded-full shrink-0">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-700">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            </div>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    ) : (
                        <PremiumSubscriptionBlock />
                    )}
                </div>

                {/* Account Details & Contact */}
                <div className="space-y-6">
                    {/* Account Info */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                                <User size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Détails du compte</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors group">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Membre depuis</p>
                                    <p className="text-sm font-semibold text-slate-900">{formatDate(user.created_at)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Support */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-lg shadow-indigo-200 p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Mail size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <Mail size={20} />
                                Besoin d'aide ?
                            </h3>
                            <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                                Un problème ou une suggestion ? Contactez directement l'administrateur.
                            </p>
                            <a
                                href="mailto:iban.marlats@gmail.com"
                                className="inline-flex items-center gap-2 bg-white text-indigo-600 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm"
                            >
                                iban.marlats@gmail.com
                                <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
