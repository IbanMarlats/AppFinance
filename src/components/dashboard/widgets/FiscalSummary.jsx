import { useFinance } from '../../../context/FinanceContext';
import { useAuth } from '../../../context/AuthContext';
import { Building2, Landmark, Calculator, AlertTriangle, Calendar } from 'lucide-react';

export default function FiscalSummary({ year }) {
    const { settings, incomes, updateUserSettings } = useFinance();
    const { user } = useAuth();

    // ... (lines 9-27)

    const currentYear = year || new Date().getFullYear();

    // Constants 2025 (URSSAF = Cotisation + CPF)
    // If user settings exist, we use them as the TOTAL rate (urge + cpf = setting)
    const getRate = (key, defaultUrge, defaultCpf) => {
        let settingVal;
        if (key === 'vente') settingVal = settings?.urssaf_ecommerce;
        else if (key === 'bic') settingVal = settings?.urssaf_freelance_bic;
        else if (key === 'bnc') settingVal = settings?.urssaf_freelance_bnc;

        if (settingVal) {
            return { urge: parseFloat(settingVal), cpf: 0 }; // User provided effective total
        }
        return { urge: defaultUrge, cpf: defaultCpf };
    };

    const RATES = {
        vente: { ...getRate('vente', 12.3, 0.1), lib: 1.0, label: 'Vente' },
        bic: { ...getRate('bic', 21.2, 0.2), lib: 1.7, label: 'Prestations BIC' },
        bnc: { ...getRate('bnc', 24.6, 0.2), lib: 2.2, label: 'Prestations BNC' }
    };


    const yearlyIncomes = incomes.filter(i => new Date(i.date).getFullYear() === currentYear);

    // Calculate CA per category
    const stats = yearlyIncomes.reduce((acc, curr) => {
        // Default to 'bnc' if undefined, or map 'ecommerce' role to 'vente' if legacy data
        let cat = curr.tax_category || (user?.role === 'ecommerce' ? 'vente' : 'bnc');
        if (!RATES[cat]) cat = 'bnc'; // Fallback

        acc[cat] = (acc[cat] || 0) + curr.amount;
        acc.total += curr.amount;
        return acc;
    }, { vente: 0, bic: 0, bnc: 0, total: 0 });

    const vatThreshold = settings?.tva_threshold || 37500; // 2025 default
    const isVatApplicable = stats.total > vatThreshold;

    // Toggle Handlers
    const isLiberatoire = settings?.versement_liberatoire === 'true';
    const cfeAmount = parseFloat(settings?.cfe_amount || 0);

    const toggleLiberatoire = () => {
        updateUserSettings({ versement_liberatoire: (!isLiberatoire).toString() });
    };

    const updateCfe = (val) => {
        updateUserSettings({ cfe_amount: val });
    };

    // Calculate Estimates
    const calculateCharges = () => {
        let urgeTotal = 0;
        let fiscalTotal = 0;
        let taxableBase = 0;

        Object.keys(RATES).forEach(cat => {
            const base = stats[cat];
            if (base > 0) {
                const r = RATES[cat];
                urgeTotal += base * ((r.urge + r.cpf) / 100);

                // Liberatoire vs Classic
                if (isLiberatoire) {
                    fiscalTotal += base * (r.lib / 100);
                } else {
                    // Calculate Taxable Base for Classic
                    // Allowance: Vente=71%, BIC=50%, BNC=34%
                    let allowance = 0.34; // default BNC
                    if (cat === 'vente') allowance = 0.71;
                    else if (cat === 'bic') allowance = 0.50;

                    taxableBase += base * (1 - allowance);
                }
            }
        });

        return { urgeTotal, fiscalTotal, taxableBase };
    };

    const estimatedTaxRate = parseFloat(settings?.estimated_tax_rate || 0);

    const { urgeTotal, fiscalTotal, taxableBase } = calculateCharges();

    // If not liberatoire, add estimated classic tax
    const classicTax = !isLiberatoire ? (taxableBase * (estimatedTaxRate / 100)) : 0;
    const finalTaxAmount = isLiberatoire ? fiscalTotal : classicTax;

    const totalToPay = urgeTotal + finalTaxAmount + (stats.total < 5000 ? 0 : cfeAmount);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Landmark className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-800">Récapitulatif Fiscal Dynamique {currentYear}</h3>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-end gap-1">
                        Total Estimé À Payer
                        {!isLiberatoire && classicTax > 0 && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded-full px-1.5" title="Inclut une estimation de l'impôt sur le revenu">
                                !
                            </span>
                        )}
                    </p>
                    <p className="text-xl font-black text-slate-800">{totalToPay.toFixed(2)}€</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">

                {/* URSSAF Section */}
                <div className="p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Calculator className="w-4 h-4 text-emerald-600" />
                            <h4 className="font-semibold text-slate-700">URSSAF ({currentYear})</h4>
                        </div>
                        <div className="space-y-3">
                            {Object.entries(RATES).map(([key, r]) => {
                                const amount = stats[key];
                                if (amount <= 0) return null;
                                const rate = (r.urge + r.cpf).toFixed(1);
                                return (
                                    <div key={key} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">{r.label} <span className="text-xs text-slate-400">({rate}%)</span></span>
                                        <span className="font-medium text-slate-900">{(amount * rate / 100).toFixed(2)}€</span>
                                    </div>
                                );
                            })}
                            {stats.total === 0 && <p className="text-sm text-slate-400 italic">Aucun chiffre d'affaires.</p>}
                        </div>
                    </div>
                    <div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Total Cotisations</span>
                            <span className="font-bold text-emerald-600">{urgeTotal.toFixed(2)}€</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                            Inclut la Contribution Formation (CFP). Ouvre droits à la retraite, maladie et allocs.
                        </p>
                    </div>
                </div>

                {/* Impôts Section */}
                <div className="p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            <h4 className="font-semibold text-slate-700">Impôt sur le Revenu</h4>
                        </div>

                        <div className="mb-4">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-sm text-slate-700 font-medium">Versement Libératoire</span>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={isLiberatoire} onChange={toggleLiberatoire} />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                            </label>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Optionnel. Éligible si RFR N-2 &lt; 28k€/part.
                            </p>
                        </div>

                        {isLiberatoire ? (
                            <div className="space-y-2">
                                {Object.entries(RATES).map(([key, r]) => {
                                    const amount = stats[key];
                                    if (amount <= 0) return null;
                                    return (
                                        <div key={key} className="flex justify-between items-center text-sm bg-blue-50 px-2 py-1 rounded">
                                            <span className="text-blue-800">{r.label} <span className="opacity-75">({r.lib}%)</span></span>
                                            <span className="font-bold text-blue-900">{(amount * r.lib / 100).toFixed(2)}€</span>
                                        </div>
                                    );
                                })}
                                <div className="mt-2 text-right">
                                    <span className="text-xs font-bold text-blue-700">Total Impôt : {fiscalTotal.toFixed(2)}€</span>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 p-3 rounded text-xs text-slate-600 space-y-3">
                                <div>
                                    <p className="mb-1 font-semibold flex items-center gap-1">
                                        Imposition Classique
                                        <span className="text-[10px] font-normal text-slate-400 bg-white border border-slate-200 px-1 rounded">Estimatif</span>
                                    </p>
                                    <p>Pas de paiement immédiat. À déclarer (2042-C-PRO).</p>
                                    <p className="mt-1 text-slate-400">Abattement : 34% (BNC), 50% (BIC), 71% (Vente).</p>
                                </div>

                                <div className="pt-2 border-t border-slate-200">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-slate-700">Base Imposable</span>
                                        <span className="font-bold text-slate-800">{taxableBase.toFixed(2)}€</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-slate-600 whitespace-nowrap">Taux Imposition Moyen</label>
                                        <div className="relative w-20">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={estimatedTaxRate}
                                                onChange={(e) => updateUserSettings({ estimated_tax_rate: e.target.value })}
                                                className="w-full text-right p-1 pr-6 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 font-bold"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-2 top-1 text-slate-400">%</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-right">
                                        <span className="text-xs font-bold text-blue-700">Estim. Impôt : {classicTax.toFixed(2)}€</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CFE Section */}
                <div className="p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-orange-600" />
                            <h4 className="font-semibold text-slate-700">CFE (Cotisation Foncière)</h4>
                        </div>

                        {stats.total < 5000 ? (
                            <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                                <span className="text-sm font-bold text-green-700">Non Due</span>
                                <p className="text-xs text-green-600 mt-1">Votre CA est inférieur à 5000€.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-slate-600">Montant Estimé (Avis)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={cfeAmount}
                                        onChange={e => updateCfe(e.target.value)}
                                        className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-1.5 pl-3 pr-8"
                                        placeholder="Ex: 200"
                                    />
                                    <span className="absolute right-3 top-1.5 text-slate-400 text-sm">€</span>
                                </div>
                                <p className="text-[10px] text-orange-600">
                                    À payer vers le 15 Décembre. Vérifiez votre compte impots.gouv.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Protection Sociale (Bonus) */}
                <div className="p-6 bg-slate-50/50 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-indigo-400" />
                            <h4 className="font-semibold text-slate-700">Protection Sociale</h4>
                        </div>
                        <ul className="space-y-3">
                            <li className="flex gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                                <div>
                                    <p className="text-xs font-bold text-slate-700">Santé & Maladie</p>
                                    <p className="text-[10px] text-slate-500">Remboursement soins + Indemnités Journalières (sous conditions).</p>
                                </div>
                            </li>
                            <li className="flex gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>
                                <div>
                                    <p className="text-xs font-bold text-slate-700">Retraite</p>
                                    <p className="text-[10px] text-slate-500">Validation de trimestres selon CA encaissé.</p>
                                </div>
                            </li>
                            <li className="flex gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></span>
                                <div>
                                    <p className="text-xs font-bold text-slate-700">Formation (CFP)</p>
                                    <p className="text-[10px] text-slate-500">Droits au Compte Personnel de Formation (CPF).</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    );
}
