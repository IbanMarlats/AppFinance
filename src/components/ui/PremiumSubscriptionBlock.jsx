import React, { useState } from 'react';
import axios from 'axios';

export default function PremiumSubscriptionBlock() {
    const [loading, setLoading] = useState(null);

    const handleSubscribe = async (planType) => {
        setLoading(planType);
        try {
            // Hardcoded Price IDs matching PremiumPage.jsx
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
        <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-4">
                Choisissez votre plan pour débloquer toutes les fonctionnalités.
            </p>

            <ul className="space-y-2 mb-6 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-green-100 text-green-600">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span>Objectifs financiers & Plafonds</span>
                </li>
                <li className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-green-100 text-green-600">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span>Statistiques illimitées</span>
                </li>
                <li className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-green-100 text-green-600">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span>Récapitulatif mensuel & Bilan</span>
                </li>
                <li className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-green-100 text-green-600">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span>Aide à la déclaration URSSAF</span>
                </li>
                <li className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-green-100 text-green-600">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span>Pilotage complet de la micro-entreprise</span>
                </li>
            </ul>

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
                    <button
                        onClick={(e) => { e.stopPropagation(); handleSubscribe('monthly'); }}
                        disabled={loading !== null}
                        className="mt-3 w-full py-2 rounded-lg bg-slate-100 text-slate-700 font-medium text-sm group-hover:bg-amber-500 group-hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading === 'monthly' ? 'Chargement...' : 'Choisir ce plan'}
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
                    <button
                        onClick={(e) => { e.stopPropagation(); handleSubscribe('annual'); }}
                        disabled={loading !== null}
                        className="mt-3 w-full py-2 rounded-lg bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading === 'annual' ? 'Chargement...' : 'Choisir ce plan'}
                    </button>
                </div>
            </div>
        </div>
    );
}
