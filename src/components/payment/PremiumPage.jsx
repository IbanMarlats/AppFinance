
import PremiumSubscriptionBlock from './PremiumSubscriptionBlock';

export default function PremiumPage() {

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

            <PremiumSubscriptionBlock />

            <div className="text-center text-slate-400 text-sm mt-8">
                Paiement sécurisé par Stripe. Vos informations sont chiffrées.
            </div>
        </div>
    );
}
