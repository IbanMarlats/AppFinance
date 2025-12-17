import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Mail, Calendar, CreditCard, Shield, User, ExternalLink } from 'lucide-react';

export default function UserProfile() {
    const { user, login } = useAuth(); // Need login to update user state if context supports it, or reload.
    // Actually useAuth login usually sets state. 
    // If useAuth doesn't expose a 'refreshUser' or 'updateUser', we might need to reload window or manually update.
    // Let's assume we can just reload for now or use login to refresh.
    // Looking at useAuth in previous context, it has 'user', 'logout', 'loading'. No 'updateUser'.
    // So simple reload is safest.

    if (!user) return null;

    const handleSubscribe = async (plan) => {
        if (!confirm(`Confirmer l'abonnement ${plan === 'annual' ? 'Annuel (70.80€)' : 'Mensuel (8.90€)'} ?`)) return;

        try {
            const res = await axios.post('http://localhost:3001/api/auth/subscribe', { plan }, { withCredentials: true });
            alert('Abonnement activé avec succès !');
            window.location.reload(); // Simple refresh to fetch new user state
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'abonnement");
        }
    };

    const handleManageSubscription = async () => {
        if (!confirm("Voulez-vous résilier votre abonnement Premium ?\n(Action immédiate pour cette démo)")) return;

        try {
            await axios.post('http://localhost:3001/api/auth/cancel-subscription', {}, { withCredentials: true });
            alert('Abonnement résilié.');
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la résiliation");
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
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg ring-4 ring-white">
                        {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.email}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${user.role === 'admin'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                <Shield size={14} />
                                {user.role === 'admin' ? 'Administrateur' :
                                    user.role === 'freelance' ? 'Freelance' :
                                        user.role === 'artisan' ? 'Artisan / Créateur' :
                                            user.role === 'creator' ? 'Créateur de Contenu' :
                                                user.role === 'field_service' ? 'Prestataire Terrain' :
                                                    user.role === 'ecommerce' ? 'E-commerce' :
                                                        user.role === 'perso' ? 'Personnel' : 'Utilisateur'}
                            </span>
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
                                            <p className="text-lg font-bold text-amber-900">Premium {user.subscription_plan === 'annual' ? 'Annuel' : 'Mensuel'}</p>
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-200 text-amber-800 border border-amber-300 uppercase tracking-wide">PRO</span>
                                        </div>
                                    </div>
                                    {user.premium_until && (
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
                                        className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline"
                                        onClick={handleManageSubscription}
                                    >
                                        Gérer mon abonnement
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Vous profitez de toutes les fonctionnalités : Stats illimitées, Support prioritaire, et plus encore.
                            </p>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500 mb-4">
                                Choisissez votre plan pour débloquer toutes les fonctionnalités.
                            </p>

                            <div className="grid grid-cols-1 gap-3">
                                {/* Monthly Plan */}
                                <div className="border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer relative group"
                                    onClick={() => handleSubscribe('monthly')}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-slate-900">Mensuel</h3>
                                            <p className="text-sm text-slate-500">Sans engagement</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-slate-900">8.90€</span>
                                            <span className="text-xs text-slate-500">/mois</span>
                                        </div>
                                    </div>
                                    <button className="mt-3 w-full py-2 rounded-lg bg-slate-100 text-slate-700 font-medium text-sm group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                        Choisir ce plan
                                    </button>
                                </div>

                                {/* Annual Plan */}
                                <div className="border-2 border-amber-400 bg-amber-50/10 rounded-xl p-4 relative cursor-pointer hover:shadow-lg transition-all"
                                    onClick={() => handleSubscribe('annual')}
                                >
                                    <div className="absolute -top-3 right-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                        -33% d'économie
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-slate-900">Annuel</h3>
                                            <p className="text-sm text-slate-500">Paiement unique</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-slate-900">70.80€</span>
                                            <span className="text-xs text-slate-500">/an</span>
                                            <div className="text-[10px] text-green-600 font-bold">soit 5.90€ / mois</div>
                                        </div>
                                    </div>
                                    <button className="mt-3 w-full py-2 rounded-lg bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors shadow-sm">
                                        Choisir ce plan
                                    </button>
                                </div>
                            </div>
                        </div>
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

                            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors group">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <Shield size={18} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">ID Utilisateur</p>
                                    <p className="text-xs font-mono text-slate-600 truncate select-all bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                        {user.id}
                                    </p>
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
        </div>
    );
}
