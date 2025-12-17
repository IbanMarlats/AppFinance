
import { useState } from 'react';
import axios from 'axios';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PremiumPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(null);

    const handleSubscribe = async (planType) => {
        setLoading(planType);
        try {
            // Need to expose Price IDs or just send 'monthly'/'lifetime' and let backend decide
            // Backend stored them in env, so let's send priceId directly if we exposed it ? 
            // Or better, let's just send the plan alias and let backend map it.
            // But for now, backend expects priceId. 
            // We can create an endpoint to get config or hardcode them here (but they are secrets... no price IDs are public).
            // Actually Price IDs are public. Secret key is secret.

            // However, hardcoding them here is brittle if env changes.
            // Let's modify backend to accept 'monthly' or 'lifetime' alias OR fetch config.
            // For now, I will hardcode them based on what I verified to make it work immediately.
            // Ideally, we fetch /api/stripe/config which returns public keys and price ids.

            // Re-verified IDs:
            // Annual: price_1SfMUBCHELpndPIwEp9X7vXI (User said 70.80)
            // Monthly: price_1SfMTkCHELpndPIwMCCvS6bF (8.90)

            const priceId = planType === 'monthly'
                ? 'price_1SfMTkCHELpndPIwMCCvS6bF'
                : 'price_1SfMUBCHELpndPIwEp9X7vXI';

            const mode = planType === 'monthly' ? 'subscription' : 'payment';

            const res = await axios.post('http://localhost:3001/api/stripe/create-checkout-session', {
                priceId,
                mode
            }, { withCredentials: true });

            if (res.data.url) {
                window.location.href = res.data.url;
            }
        } catch (err) {
            console.error("Payment Error:", err);
            alert("Erreur lors de l'initialisation du paiement.");
            setLoading(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12 py-10 animate-in fade-in duration-700">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                    Passez au niveau supérieur
                </h1>
                <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                    Débloquez tout le potentiel de votre gestion financière avec nos outils Premium exclusifs.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Monthly Plan */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 relative flex flex-col hover:scale-105 transition-transform duration-300">
                    <div className="mb-6">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg whitespace-nowrap">
                            14 Jours Gratuits
                        </div>
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
                            <Zap size={24} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800">Mensuel</h3>
                        <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-sm font-bold text-slate-400 line-through">8.90€</span>
                            <span className="text-4xl font-extrabold text-slate-900">0€</span>
                            <span className="text-slate-500 text-sm">pendant 14j</span>
                        </div>
                        <p className="text-indigo-600 font-medium text-sm mt-2">Puis 8.90€/mois. Sans engagement.</p>
                        <p className="text-slate-400 text-xs mt-1">Aucun débit aujourd'hui.</p>
                    </div>

                    <ul className="space-y-4 mb-8 flex-1">
                        {[
                            'Tableau de bord avancé',
                            'Objectifs mensuels détaillés',
                            'Export PDF & CSV illimité',
                            'Support prioritaire',
                            'Badge Premium exclusif'
                        ].map((feat, i) => (
                            <li key={i} className="flex items-center gap-3 text-slate-600">
                                <Check size={18} className="text-emerald-500" />
                                {feat}
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={() => handleSubscribe('monthly')}
                        disabled={loading !== null}
                        className="w-full py-3 px-6 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 transition-colors"
                    >
                        {loading === 'monthly' ? 'Chargement...' : 'Commencer l\'essai gratuit'}
                    </button>
                </div>

                {/* Lifetime Plan */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl shadow-xl border border-indigo-500 p-8 relative flex flex-col text-white transform hover:scale-105 transition-transform duration-300">
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wider">
                        Populaire
                    </div>

                    <div className="mb-6">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-amber-300 mb-4">
                            <Crown size={24} />
                        </div>
                        <h3 className="text-2xl font-bold">À Vie</h3>
                        <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold text-white">70.80€</span>
                            <span className="text-indigo-200">paiement unique</span>
                        </div>
                        <p className="text-indigo-100 mt-2">Payez une fois, profitez pour toujours.</p>
                    </div>

                    <ul className="space-y-4 mb-8 flex-1">
                        {[
                            'Accès à vie à toutes les fonctionnalités',
                            'Toutes les mises à jour futures incluses',
                            'Tableau de bord avancé & Objectifs',
                            'Support VIP dédié',
                            'Badge Premium Or'
                        ].map((feat, i) => (
                            <li key={i} className="flex items-center gap-3 text-indigo-50">
                                <div className="p-0.5 bg-amber-400 rounded-full">
                                    <Check size={12} className="text-indigo-900" />
                                </div>
                                {feat}
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={() => handleSubscribe('lifetime')}
                        disabled={loading !== null}
                        className="w-full py-3 px-6 rounded-xl bg-white text-indigo-600 font-bold hover:bg-indigo-50 transition-colors shadow-lg"
                    >
                        {loading === 'lifetime' ? 'Chargement...' : 'Obtenir l\'accès à vie'}
                    </button>
                </div>
            </div>

            <div className="text-center text-slate-400 text-sm mt-8">
                Paiement sécurisé par Stripe. Vos informations sont chiffrées.
            </div>
        </div>
    );
}
