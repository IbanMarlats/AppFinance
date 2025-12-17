import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { Building2, Landmark, Calculator, AlertTriangle, Calendar } from 'lucide-react';

export default function FiscalSummary() {
    const { settings, incomes } = useFinance();
    const { user } = useAuth();

    // Calculate annual revenue (HT) to determine VAT status
    const currentYear = new Date().getFullYear();
    const annualRevenueHT = incomes
        .filter(i => new Date(i.date).getFullYear() === currentYear)
        .reduce((sum, inc) => sum + inc.amount, 0);

    const vatThreshold = settings?.tva_threshold || 36800;
    const isVatApplicable = annualRevenueHT > vatThreshold;

    // Determine URSSAF rate
    const urssafRate = user?.role === 'ecommerce'
        ? (settings?.urssaf_ecommerce || 12.3)
        : (settings?.urssaf_freelance || 23.1); // Updated 2024/2025 default

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <Landmark className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800">Récapitulatif Fiscal & Charges</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">

                {/* URSSAF Section */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Calculator className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-semibold text-slate-700">Cotisations URSSAF</h4>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                        Taux actuel appliqué à votre activité :
                    </p>
                    <div className="text-2xl font-bold text-slate-800 mb-1">
                        {urssafRate}%
                    </div>
                    <p className="text-xs text-slate-400">
                        Calculé sur le chiffre d'affaires encaissé.
                        Déclaration mensuelle ou trimestrielle selon votre choix.
                    </p>
                </div>

                {/* Impôts Section */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <h4 className="font-semibold text-slate-700">Impôt sur le Revenu</h4>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                        Régime Micro-Fiscal
                    </p>
                    <div className="bg-blue-50 text-blue-800 rounded-lg p-3 text-xs font-medium">
                        <p className="mb-1">Option Prélèvement Libératoire ?</p>
                        <p>• Vente marchandises : 1%</p>
                        <p>• Prestations BIC : 1.7%</p>
                        <p>• Prestations BNC : 2.2%</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Sans option, abattement forfaitaire appliqué sur la déclaration annuelle 2042-C-PRO.
                    </p>
                </div>

                {/* TVA Section */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className={`w-4 h-4 ${isVatApplicable ? 'text-amber-500' : 'text-slate-400'}`} />
                        <h4 className="font-semibold text-slate-700">TVA (Taxe Valeur Ajoutée)</h4>
                    </div>
                    <div className="mb-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide border ${isVatApplicable
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-green-50 text-green-700 border-green-200'
                            }`}>
                            {isVatApplicable ? 'Assujetti à la TVA' : 'Franchise en base'}
                        </span>
                    </div>
                    <p className="text-sm text-slate-600">
                        {isVatApplicable
                            ? "Vous devez facturer et déclarer la TVA."
                            : "Vous ne facturez pas la TVA (Mention obligatoire sur factures : \"TVA non applicable, art. 293 B du CGI\")."}
                    </p>
                </div>

                {/* CFE Section */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <h4 className="font-semibold text-slate-700">CFE (Cotisation Foncière)</h4>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                        Taxe annuelle locale due par toutes les entreprises (même à domicile).
                    </p>
                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                        <p className="text-xs font-bold text-orange-800 mb-1">📅 Échéance : Novembre / Décembre</p>
                        <p className="text-xs text-orange-700">
                            Pensez à consulter votre espace professionnel sur impots.gouv.fr pour l'avis de paiement.
                        </p>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Exonération possible la première année civile d'activité.
                    </p>
                </div>

            </div>
        </div>
    );
}
