import axios from 'axios';
import { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import ConfirmationModal from '../ui/ConfirmationModal';
import { hexToRgba } from '../ui/ColorPicker';
import Select from '../ui/Select';
import DatePicker from '../ui/DatePicker';

export default function IncomeTable(props) {
    const { incomes, addIncome, deleteIncome, updateIncome, platforms, settings } = useFinance();
    const { user, refreshUser } = useAuth(); // Add refreshUser
    const isEcommerce = user?.role === 'ecommerce';

    useEffect(() => {
        if (user?.is_subject_vat) {
            setVatRate('20');
        }
    }, [user?.is_subject_vat]);

    // ... existing state ...

    // VAT State
    const [isVatModalOpen, setIsVatModalOpen] = useState(false);
    const [isCrossingModalOpen, setIsCrossingModalOpen] = useState(false);
    const [pendingIncome, setPendingIncome] = useState(null);

    // Year Filtering
    const [selectedYears, setSelectedYears] = useState([new Date().getFullYear()]);
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

    const availableYears = [...new Set(incomes.map(i => new Date(i.date).getFullYear()))];
    const currentYearNum = new Date().getFullYear();
    if (!availableYears.includes(currentYearNum)) {
        availableYears.push(currentYearNum);
    }
    // Also ensure previous year is available for selection
    if (!availableYears.includes(currentYearNum - 1)) {
        availableYears.push(currentYearNum - 1);
    }
    availableYears.sort((a, b) => b - a);

    const filteredIncomes = incomes.filter(i => selectedYears.includes(new Date(i.date).getFullYear()));
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [platformId, setPlatformId] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringEndDate, setRecurringEndDate] = useState('');
    const [tjm, setTjm] = useState('');
    const [vatRate, setVatRate] = useState('0');
    const [addFormEcommerce, setAddFormEcommerce] = useState({ cogs: '', shipping_cost: '' });
    const [addFormRole, setAddFormRole] = useState({
        material_cost: '', hours_spent: '',
        channel_source: '', income_type: 'active', invoice_date: '',
        distance_km: '', status: 'confirmed',
        tax_category: 'bnc'
    });

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Reset pagination when filter changes
    useEffect(() => {
        setVisibleLimit(10);
    }, [selectedYears]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Pagination State
    const [visibleLimit, setVisibleLimit] = useState(10);
    const [sortOrder, setSortOrder] = useState('desc');

    const regularizeMonth = async () => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const incomesToRegularize = incomes.filter(inc => {
            const d = new Date(inc.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear && (!inc.vat_rate || inc.vat_rate === 0);
        });

        if (incomesToRegularize.length === 0) {
            alert("Aucun revenu à régulariser pour ce mois.");
            return;
        }

        if (confirm(`Voulez-vous appliquer 20% de TVA sur les ${incomesToRegularize.length} revenus de ce mois ?`)) {
            for (const inc of incomesToRegularize) {
                await updateIncome(inc.id, { ...inc, vat_rate: 20 });
            }
            alert("Régularisation effectuée !");
        }
    };

    const [isAmountTTC, setIsAmountTTC] = useState(false);

    const resetForm = () => {
        setDesc('');
        setAmount('');
        setTjm('');
        setVatRate(user?.is_subject_vat ? '20' : '0');
        setAddFormEcommerce({ cogs: '', shipping_cost: '' });
        setAddFormRole({
            material_cost: '', hours_spent: '',
            channel_source: '', income_type: 'active', invoice_date: '',
            distance_km: '', status: 'confirmed',
            tax_category: addFormRole.tax_category || 'bnc'
        });
        setIsRecurring(false);
        setRecurringEndDate('');
        setErrors({});
        setIsAmountTTC(false);
    };

    const activateVat = async (mode = 'HT') => {
        try {
            await axios.put('http://localhost:3001/api/auth/me', {
                is_subject_vat: true,
                vat_start_date: new Date().toISOString().split('T')[0]
            });
            // await refreshUser(); // DEFER to avoid remount
            setIsVatModalOpen(false);
            setIsCrossingModalOpen(false);
            setVatRate('20');

            // If there is a pending income (from crossing logic), submit it now with VAT 20
            if (pendingIncome) {
                let finalAmount = pendingIncome.amount;

                // If mode is TTC (Oubli), we assume the user entered a gross amount that included VAT
                // So we back-calculate the HT amount: Amount / 1.2
                if (mode === 'TTC') {
                    finalAmount = finalAmount / 1.2;
                }

                const incomeWithVat = {
                    ...pendingIncome,
                    amount: finalAmount,
                    vat_rate: 20
                };
                addIncome(incomeWithVat);
                resetForm();
                setPendingIncome(null);
            }

            // 2. DETECT CURRENT MONTH incomes to regularize
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            console.log("DEBUG: Checking for regularization. Current Month:", currentMonth, "Year:", currentYear);
            console.log("DEBUG: All Incomes Count:", incomes.length);

            const potentialIncomes = incomes.filter(inc => {
                const d = new Date(inc.date);
                // Filter incomes of same month/year AND that do not have VAT yet
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear && (!inc.vat_rate || inc.vat_rate === 0);
            });
            console.log("DEBUG: Potential Incomes Found:", potentialIncomes.length, potentialIncomes);

            if (potentialIncomes.length > 0) {
                // Determine default choices: usually "forgotten" (true) for past incomes
                // but user wants control.
                // We'll map them to a simple structure for the modal
                setRegularizationList(potentialIncomes.map(inc => ({ ...inc, isForgotten: true })));
                setIsRegularizationModalOpen(true);
            } else {
                await refreshUser(); // Safe to refresh here if no modal
                alert("Activation réussie !");
            }

        } catch (e) {
            console.error("Failed to activate VAT", e);
            alert("Erreur lors de l'activation pour la TVA");
        }
    };

    // ... (keep isRevertModalOpen and deactivateVat as is) ...

    const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);

    // Regularization Modal State
    const [isRegularizationModalOpen, setIsRegularizationModalOpen] = useState(false);
    const [regularizationList, setRegularizationList] = useState([]);

    const handleRegularize = async () => {
        try {
            for (const inc of regularizationList) {
                // If "forgotten" (true), Deduct VAT (Amount / 1.2)
                // If "already charged" (false), Keep Amount (HT)
                let newAmountHT = parseFloat(inc.amount);
                if (inc.isForgotten) {
                    newAmountHT = newAmountHT / 1.2;
                }

                await updateIncome(inc.id, {
                    ...inc,
                    amount: newAmountHT,
                    vat_rate: 20
                });
            }
            alert(`Régularisation terminée ! ${regularizationList.length} revenus ont été mis à jour.`);
            setIsRegularizationModalOpen(false);
            setRegularizationList([]);
            await refreshUser(); // Refresh UI
        } catch (e) {
            console.error("Failed to regularize", e);
            alert("Erreur lors de la régularisation");
        }
    };

    const deactivateVat = async () => {
        try {
            await axios.put('http://localhost:3001/api/auth/me', {
                is_subject_vat: false,
                vat_start_date: null
            });
            await refreshUser();
            setIsRevertModalOpen(false);
            setVatRate('0');
        } catch (e) {
            console.error("Failed to deactivate VAT", e);
            alert("Erreur lors de la désactivation de la TVA");
        }
    };

    // ... existing ... 

    // ... handleSubmit ...


    // ... existing ... 

    // ... handleSubmit ...

    // ... existing ...
    const [errors, setErrors] = useState({});
    const [visibleColumns, setVisibleColumns] = useState({
        date: true,
        name: true,
        platform: true,
        amount: true,
        vat: true,
        tjm: true,
        fee: true,
        deductibleVat: true,
        urssaf: true,
        net: true
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!desc.trim()) newErrors.desc = true;
        if (!amount) newErrors.amount = true;
        if (!platformId) newErrors.platformId = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});

        setErrors({});

        let amountValue = parseFloat(amount);

        // Handle VAT Inclusive (Forgotten VAT) Logic
        if (isAmountTTC && user?.is_subject_vat) {
            // User entered TTC, we must extract HT
            amountValue = amountValue / 1.2;
        }

        // Threshold Crossing Detection (Only if income date is current year)
        const incomeYear = new Date(date).getFullYear();
        const currentYear = new Date().getFullYear();

        let newYearTotal = totals.gross + amountValue;
        // If we are adding income for current year, use the strict currentYearTotals logic calculated below
        if (incomeYear === currentYear) {
            const currentYearTotalsStrict = incomes
                .filter(i => new Date(i.date).getFullYear() === currentYear)
                .reduce((acc, curr) => acc + (curr.status !== 'quote_sent' && curr.status !== 'quote_signed' ? curr.amount : 0), 0);
            newYearTotal = currentYearTotalsStrict + amountValue;
        }

        if (!user?.is_subject_vat && incomeYear === currentYear && newYearTotal > TVA_THRESHOLD) {
            const isCrossing = (newYearTotal - amountValue) <= TVA_THRESHOLD;
            // If strictly crossing OR already crossed but not activated, we must warn/block
            // Ideally we force them to activate.

            // Setup pending income so they can continue after activation
            setPendingIncome({
                name: desc.trim(),
                amount: amountValue,
                date,
                platformId,
                is_recurring: isRecurring,
                tjm: tjm ? parseFloat(tjm) : null,
                vat_rate: parseFloat(vatRate),
                cogs: addFormEcommerce.cogs ? parseFloat(addFormEcommerce.cogs) : 0,
                shipping_cost: addFormEcommerce.shipping_cost ? parseFloat(addFormEcommerce.shipping_cost) : 0,
                material_cost: addFormRole.material_cost ? parseFloat(addFormRole.material_cost) : 0,
                hours_spent: addFormRole.hours_spent ? parseFloat(addFormRole.hours_spent) : 0,
                channel_source: addFormRole.channel_source,
                income_type: addFormRole.income_type,
                invoice_date: addFormRole.invoice_date,
                distance_km: addFormRole.distance_km ? parseFloat(addFormRole.distance_km) : 0,
                status: addFormRole.status,
                recurring_end_date: isRecurring ? recurringEndDate : null,
                tax_category: addFormRole.tax_category || 'bnc'
            });
            setIsCrossingModalOpen(true);
            return;
        }

        addIncome({
            name: desc.trim(),
            amount: amountValue,
            date,
            platformId,
            is_recurring: isRecurring,
            tjm: tjm ? parseFloat(tjm) : null,
            vat_rate: parseFloat(vatRate),
            cogs: addFormEcommerce.cogs ? parseFloat(addFormEcommerce.cogs) : 0,
            shipping_cost: addFormEcommerce.shipping_cost ? parseFloat(addFormEcommerce.shipping_cost) : 0,

            // Role specific fields
            material_cost: addFormRole.material_cost ? parseFloat(addFormRole.material_cost) : 0,
            hours_spent: addFormRole.hours_spent ? parseFloat(addFormRole.hours_spent) : 0,
            channel_source: addFormRole.channel_source,
            income_type: addFormRole.income_type,
            invoice_date: addFormRole.invoice_date,
            distance_km: addFormRole.distance_km ? parseFloat(addFormRole.distance_km) : 0,
            status: addFormRole.status,
            recurring_end_date: isRecurring ? recurringEndDate : null,
            tax_category: addFormRole.tax_category || 'bnc'
        });
        resetForm();
    };

    const handleDelete = (id) => {
        setDeleteId(id);
        setIsModalOpen(true);
    };

    const confirmDelete = () => {
        if (deleteId) {
            // Reversion Logic Check
            const incomeToDelete = incomes.find(i => i.id === deleteId);
            const currentYear = new Date().getFullYear();
            const TVA_THRESHOLD = settings.tva_threshold || 36800; // Define locally to ensure scope

            if (incomeToDelete && new Date(incomeToDelete.date).getFullYear() === currentYear && user?.is_subject_vat) {
                const currentYearTotalsStrict = incomes
                    .filter(i => i.id !== deleteId && new Date(i.date).getFullYear() === currentYear)
                    .reduce((acc, curr) => acc + (curr.status !== 'quote_sent' && curr.status !== 'quote_signed' ? curr.amount : 0), 0);

                if (currentYearTotalsStrict < TVA_THRESHOLD) {
                    setIsRevertModalOpen(true);
                }
            }

            deleteIncome(deleteId);
            setIsModalOpen(false);
            setDeleteId(null);
        }
    };

    const startEdit = (inc) => {
        setEditingId(inc.id);
        setEditForm({ ...inc });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEdit = () => {
        const amountValue = parseFloat(editForm.amount);

        // Threshold Check for Edits
        const TVA_THRESHOLD = settings.tva_threshold || 36800;
        const currentYear = new Date().getFullYear();
        const incomeYear = new Date(editForm.date).getFullYear();

        if (incomeYear === currentYear) {
            const currentYearTotalsStrict = incomes
                .filter(i => i.id !== editingId && new Date(i.date).getFullYear() === currentYear)
                .reduce((acc, curr) => acc + (curr.status !== 'quote_sent' && curr.status !== 'quote_signed' ? curr.amount : 0), 0);

            const newTotal = currentYearTotalsStrict + amountValue;

            // Check for Crossing (if NOT vat subject)
            if (!user?.is_subject_vat && newTotal > TVA_THRESHOLD) {
                alert("Modification refusée : Ce montant ferait dépasser le seuil de TVA (" + TVA_THRESHOLD + "€). Veuillez d'abord activer la TVA.");
                setIsVatModalOpen(true);
                return;
            }

            // Check for Reversion (if IS vat subject)
            if (user?.is_subject_vat && newTotal < TVA_THRESHOLD) {
                setIsRevertModalOpen(true);
            }
        }

        updateIncome(editingId, {
            ...editForm,
            amount: parseFloat(editForm.amount),
            tjm: editForm.tjm ? parseFloat(editForm.tjm) : null,
            tax_category: editForm.tax_category || 'bnc'
        });
        setEditingId(null);
    };

    const calculate = (inc) => {
        const p = platforms.find(pl => pl.id === inc.platformId) || { taxRate: 0, fixed_fee: 0, fee_vat_rate: 0, name: 'Unknown' };
        const gross = inc.amount;

        // Fee HT = % + fixed
        const feeHT = (gross * (p.taxRate / 100)) + (p.fixed_fee || 0);

        // Fee VAT = Fee HT * (fee_vat_rate / 100)
        const feeVat = feeHT * ((p.fee_vat_rate || 0) / 100);

        // Total Fee (TTC)
        const feeTotal = feeHT + feeVat;

        // Effective Fee (Cost) logic
        // If subject to VAT, the VAT part is recoverable, so real cost is HT.
        // If NOT subject to VAT (Franchise), VAT is a cost, so real cost is TTC.
        const effectiveFee = user?.is_subject_vat ? feeHT : feeTotal;

        // URSSAF Calculation
        let urssafRate = 0;
        if (isEcommerce) {
            urssafRate = (settings.urssaf_ecommerce || 12.3) / 100;
        } else {
            // Freelance BNC vs BIC vs VENTE
            const type = inc.tax_category || 'bnc'; // Default to BNC
            if (type === 'bic') {
                urssafRate = (settings.urssaf_freelance_bic || 21.2) / 100;
            } else if (type === 'vente') {
                urssafRate = (settings.urssaf_ecommerce || 12.3) / 100;
            } else {
                urssafRate = (settings.urssaf_freelance_bnc || 23.1) / 100;
            }
        }

        // URSSAF is calculated on GROSS amount
        const urssaf = gross * urssafRate;

        // Final Net Calculation
        // Net = Gross - Effective Fee - URSSAF
        const final = gross - effectiveFee - urssaf;

        return { p, gross, feeHT, feeVat, feeTotal, urssaf, final, urssafRate };
    };

    const totals = filteredIncomes.reduce((acc, curr) => {
        // Exclude Quotes from Totals
        if (curr.status === 'quote_sent' || curr.status === 'quote_signed') {
            return acc;
        }

        const { gross, feeTotal, feeVat, urssaf, final } = calculate(curr);
        return {
            gross: acc.gross + gross,
            feeTotal: acc.feeTotal + feeTotal,
            feeVat: acc.feeVat + feeVat,
            urssaf: acc.urssaf + urssaf,
            final: acc.final + final
        };
    }, { gross: 0, feeTotal: 0, feeVat: 0, urssaf: 0, final: 0 });

    // Calculate totals for the CURRENT YEAR regardless of selected filters
    const currentYear = new Date().getFullYear();
    const currentYearIncomes = incomes.filter(i => new Date(i.date).getFullYear() === currentYear);
    const currentYearTotals = currentYearIncomes.reduce((acc, curr) => {
        if (curr.status === 'quote_sent' || curr.status === 'quote_signed') return acc;
        return acc + curr.amount; // Gross amount
    }, 0);

    const previousYear = currentYear - 1;
    const previousYearIncomes = incomes.filter(i => new Date(i.date).getFullYear() === previousYear);
    const previousYearTotals = previousYearIncomes.reduce((acc, curr) => {
        if (curr.status === 'quote_sent' || curr.status === 'quote_signed') return acc;
        return acc + curr.amount;
    }, 0);

    const TVA_THRESHOLD = settings.tva_threshold || 36800;
    const tvaProgress = Math.min((currentYearTotals / TVA_THRESHOLD) * 100, 100);
    const tvaColor = tvaProgress >= 100 ? '#ef4444' : tvaProgress >= 80 ? '#f59e0b' : '#10b981';

    const MICRO_THRESHOLD = settings.micro_threshold || 77700;
    const microProgress = Math.min((currentYearTotals / MICRO_THRESHOLD) * 100, 100);
    const microColor = microProgress >= 100 ? '#ef4444' : microProgress >= 80 ? '#f59e0b' : '#3b82f6';

    // Logic for alerts (only if not already subject to VAT)
    const showWarning = !user?.is_subject_vat && currentYearTotals >= (TVA_THRESHOLD - 2000) && currentYearTotals <= TVA_THRESHOLD;
    const showCritical = !user?.is_subject_vat && currentYearTotals > TVA_THRESHOLD;

    return (
        <div className="card">
            {/* ... modals ... */}
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={confirmDelete}
                title="Supprimer le revenu ?"
                message="Cette action est irréversible."
            />

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-900">Revenus</h2>

                    {/* Multi-Year Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                            className="input w-auto min-w-[140px] border-slate-600 font-medium text-slate-700 bg-white flex items-center justify-between px-3 py-2 cursor-pointer"
                        >
                            <span className="truncate">
                                {selectedYears.length === 0 ? 'Aucune année' :
                                    selectedYears.length === availableYears.length ? 'Toutes les années' :
                                        selectedYears.length === 1 ? selectedYears[0] :
                                            `${selectedYears.length} années`}
                            </span>
                            <span className="text-slate-500 text-xs ml-2">▼</span>
                        </button>

                        {isYearDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-lg z-50 p-2 overflow-hidden animate-fadeIn">
                                <div className="max-h-60 overflow-y-auto">
                                    {availableYears.map(year => (
                                        <label key={year} className="flex items-center gap-2 p-2 hover:bg-indigo-50 rounded cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedYears.includes(year)}
                                                onChange={() => {
                                                    if (selectedYears.includes(year)) {
                                                        setSelectedYears(selectedYears.filter(y => y !== year));
                                                    } else {
                                                        setSelectedYears([...selectedYears, year]);
                                                    }
                                                }}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-400"
                                            />
                                            <span className={`text-sm ${selectedYears.includes(year) ? 'font-bold text-indigo-900' : 'text-slate-700'}`}>
                                                {year}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between px-2">
                                    <button
                                        onClick={() => setSelectedYears([...availableYears])}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                                    >
                                        Tout
                                    </button>
                                    <button
                                        onClick={() => setSelectedYears([])}
                                        className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
                                    >
                                        Aucun
                                    </button>
                                </div>
                            </div>
                        )}
                        {isYearDropdownOpen && (
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsYearDropdownOpen(false)}
                            />
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 justify-end items-center">
                    {/* Export Buttons Group */}
                    <div className="flex bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm h-10">
                        <button
                            onClick={() => {
                                if (!user?.is_premium) {
                                    alert("Fonctionnalité réservée aux membres Premium.\nAbonnez-vous pour exporter vos données.");
                                    return;
                                }

                                const headers = ['Date', 'Nom', 'Plateforme', 'Montant', 'Statut', 'Catégorie'];
                                const csvContent = [
                                    headers.join(','),
                                    ...filteredIncomes.map(row => {
                                        const pName = platforms.find(p => p.id === row.platformId)?.name || 'Inconnu';
                                        return [
                                            row.date,
                                            `"${row.name.replace(/"/g, '""')}"`,
                                            `"${pName.replace(/"/g, '""')}"`,
                                            row.amount,
                                            row.status,
                                            row.tax_category || 'bnc'
                                        ].join(',');
                                    })
                                ].join('\n');

                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = `revenus_export_${new Date().toISOString().split('T')[0]}.csv`;
                                link.click();
                            }}
                            className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-300 flex items-center gap-2"
                            title={!user?.is_premium ? "Réservé aux membres Premium" : "Exporter en CSV"}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Export CSV
                        </button>
                        <button
                            onClick={() => {
                                if (!user?.is_premium) {
                                    alert("Fonctionnalité réservée aux membres Premium.\nAbonnez-vous pour exporter vos données.");
                                    return;
                                }

                                const doc = new jsPDF();
                                doc.setFontSize(18);
                                doc.text(`Relevé de Revenus - ${new Date().getFullYear()}`, 14, 20);
                                doc.setFontSize(10);
                                doc.text(`Généré le ${new Date().toLocaleDateString()}`, 14, 26);
                                doc.text(`Total Revenus: ${totals.gross.toFixed(2)}€`, 14, 32);

                                const tableColumn = ["Date", "Nom", "Plateforme", "Catégorie", "Montant"];
                                const tableRows = [];

                                filteredIncomes.forEach(income => {
                                    const pName = platforms.find(p => p.id === income.platformId)?.name || 'Inconnu';
                                    const incomeData = [
                                        new Date(income.date).toLocaleDateString(),
                                        income.name,
                                        pName,
                                        (income.tax_category || 'bnc').toUpperCase(),
                                        income.amount.toFixed(2) + "€"
                                    ];
                                    tableRows.push(incomeData);
                                });

                                autoTable(doc, {
                                    startY: 38,
                                    head: [tableColumn],
                                    body: tableRows,
                                    theme: 'grid',
                                    headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
                                });

                                doc.save(`revenus_${new Date().toISOString().split('T')[0]}.pdf`);
                            }}
                            className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                            title={!user?.is_premium ? "Réservé aux membres Premium" : "PDF"}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            PDF
                        </button>
                    </div>

                    {!user?.is_subject_vat && (
                        <button
                            onClick={() => setIsVatModalOpen(true)}
                            className="text-xs font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors"
                        >
                            Passer à la TVA
                        </button>
                    )}

                    <div className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm flex items-center h-10">
                        CA Brut: <span className="font-bold text-slate-900 ml-1">{totals.gross.toFixed(2)}€</span>
                    </div>
                    <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-bold shadow-sm flex items-center h-10">
                        Net Final: <span className="ml-1">{totals.final.toFixed(2)}€</span>
                    </div>
                </div>
            </div>

            {/* CRITICAL THRESHOLD ALERT */}
            {showCritical && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg shadow-md flex items-start gap-3 animate-pulse">
                    <div className="text-red-600 mt-1">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-red-800 text-lg">⚠️ SEUIL DE TVA DÉPASSÉ ({currentYearTotals.toFixed(2)}€)</h4>
                        <p className="font-bold text-red-700 mt-1">
                            Vous avez dépassé le seuil de {TVA_THRESHOLD}€ sur l'année en cours ({currentYear}).
                        </p>
                        <ul className="list-disc pl-5 mt-2 text-red-700 text-sm space-y-1">
                            <li>Vous <strong>devez</strong> activer la TVA immédiatement.</li>
                            <li>Vous devez facturer 20% de TVA sur <strong>tous les revenus de ce mois</strong>.</li>
                            <li>Utilisez le bouton "Régulariser ce mois" après activation.</li>
                        </ul>
                        <button
                            onClick={() => setIsVatModalOpen(true)}
                            className="mt-3 px-4 py-2 bg-red-600 text-white font-bold rounded-lg shadow hover:bg-red-700 transition-colors"
                        >
                            ACTIVER LA TVA MAINTENANT
                        </button>
                    </div>
                </div>
            )}

            {/* PREVENTIVE WARNING */}
            {showWarning && (
                <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg shadow-sm flex items-start gap-3 animate-fadeIn">
                    <div className="text-orange-500 mt-1">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-orange-800">Attention, vous approchez du seuil de TVA !</h4>
                        <p className="text-sm text-orange-700 mt-1">
                            CA {currentYear}: <strong>{currentYearTotals.toFixed(2)}€</strong> / {TVA_THRESHOLD}€
                            <br />
                            Vous allez bientôt devoir facturer la TVA. C'est le moment de demander votre numéro de TVA intracommunautaire.
                        </p>
                        <a
                            href="https://www.impots.gouv.fr/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-orange-600 hover:text-orange-800 underline mt-2 inline-block"
                        >
                            Aller sur impots.gouv.fr →
                        </a>
                    </div>
                </div>
            )}


            {/* REGULARIZATION MODAL */}
            {
                isRegularizationModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-100 rounded-full text-indigo-700">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">Régularisation du mois en cours</h3>
                            </div>

                            <p className="text-slate-600 mb-4 bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
                                Comme vous avez dépassé le seuil, <strong>tous les revenus de ce mois</strong> doivent être assujettis à la TVA (20%).
                                <br />Pour chacun des revenus ci-dessous, précisez si vous aviez anticipé (TVA déjà facturée) ou non.
                            </p>

                            <div className="space-y-3 mb-6">
                                {regularizationList.map((inc, index) => (
                                    <div key={inc.id} className="p-4 border border-slate-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-900">{inc.name || 'Revenu sans nom'}</div>
                                            <div className="text-sm text-slate-500">{new Date(inc.date).toLocaleDateString()} • {inc.amount}€ perçus</div>
                                        </div>

                                        <div className="flex bg-white rounded-lg border border-slate-300 p-1">
                                            <button
                                                onClick={() => {
                                                    const newList = [...regularizationList];
                                                    newList[index].isForgotten = true;
                                                    setRegularizationList(newList);
                                                }}
                                                className={`px-3 py-1.5 text-xs font-bold rounded ${inc.isForgotten
                                                    ? 'bg-amber-100 text-amber-800 shadow-sm'
                                                    : 'text-slate-500 hover:bg-slate-50'}`}
                                            >
                                                Oublié (TTC)
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newList = [...regularizationList];
                                                    newList[index].isForgotten = false;
                                                    setRegularizationList(newList);
                                                }}
                                                className={`px-3 py-1.5 text-xs font-bold rounded ${!inc.isForgotten
                                                    ? 'bg-indigo-100 text-indigo-800 shadow-sm'
                                                    : 'text-slate-500 hover:bg-slate-50'}`}
                                            >
                                                Déjà Facturé (HT)
                                            </button>
                                        </div>

                                        <div className="text-right min-w-[120px]">
                                            <div className="text-xs text-slate-500 mb-1">Montant corrigé (HT)</div>
                                            <div className={`font-bold ${inc.isForgotten ? 'text-amber-600' : 'text-indigo-600'}`}>
                                                {inc.isForgotten
                                                    ? (inc.amount / 1.2).toFixed(2)
                                                    : parseFloat(inc.amount).toFixed(2)}€
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                {/* Cannot cancel legally, must process */}
                                <button
                                    onClick={handleRegularize}
                                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200"
                                >
                                    Valider la régularisation ({regularizationList.length})
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* CROSSING MODAL */}
            {
                isCrossingModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full m-4">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Seuil de TVA dépassé ! 🚨</h3>
                            <p className="text-slate-600 mb-4">
                                Ce revenu vous fait dépasser le seuil de la franchise en base de TVA.
                            </p>
                            <div className="bg-indigo-50 p-4 rounded-lg mb-6 border border-indigo-100">
                                <p className="font-bold text-indigo-900 mb-2">Avez-vous facturé la TVA sur ce revenu ?</p>
                                <p className="text-sm text-indigo-800 mb-2">
                                    Si vous avez oublié de la facturer alors que vous dépassiez le seuil, nous devons considérer que le montant perçu est "TTC" (TVA en dedans).
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button
                                    onClick={() => activateVat('TTC')}
                                    className="px-4 py-3 bg-amber-100 text-amber-900 border border-amber-200 rounded-lg hover:bg-amber-200 text-sm font-medium flex flex-col items-center justify-center"
                                >
                                    <span>Non, j'ai oublié 🤦</span>
                                    <span className="text-xs opacity-75 mt-1">(Calcul TVA en dedans)</span>
                                </button>
                                <button
                                    onClick={() => activateVat('HT')}
                                    className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex flex-col items-center justify-center"
                                >
                                    <span>Oui, TVA facturée 👍</span>
                                    <span className="text-xs opacity-75 mt-1">(Montant HT inchangé)</span>
                                </button>
                            </div>
                            <button
                                onClick={() => setIsCrossingModalOpen(false)}
                                className="w-full mt-4 text-slate-500 text-sm hover:underline"
                            >
                                Annuler l'ajout
                            </button>
                        </div>
                    </div>
                )
            }

            {/* MANUAL SWITCH MODAL */}
            {
                isVatModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full m-4">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Passer à la TVA ?</h3>
                            <p className="text-slate-600 mb-4">
                                Vous pouvez anticiper et activer la gestion de la TVA dès maintenant.
                            </p>
                            <p className="text-sm text-slate-500 mb-6 italic">
                                Cela activera le calcul de la TVA collectée et déductible sur vos prochains revenus et dépenses.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsVatModalOpen(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={activateVat}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
                                >
                                    Confirmer l'activation
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* REVERSION MODAL */}
            {
                isRevertModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full m-4">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Désactiver la TVA ? 📉</h3>
                            <p className="text-slate-600 mb-4">
                                Votre chiffre d'affaires annuel est repassé sous le seuil de TVA.
                            </p>
                            <div className="bg-amber-50 p-4 rounded-lg mb-4 text-sm text-amber-800 border border-amber-200">
                                <strong>Retour à la franchise en base :</strong>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Vous ne facturerez plus la TVA.</li>
                                    <li>Vos prochains revenus seront par défaut sans TVA (0%).</li>
                                </ul>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsRevertModalOpen(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                                >
                                    Rester à la TVA
                                </button>
                                <button
                                    onClick={deactivateVat}
                                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-bold"
                                >
                                    Désactiver la TVA
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }



            {/* FORM */}
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 mb-8 shadow-xl shadow-slate-200/60 relative">
                {/* Decorative Background Layer - Clipped */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <span className="text-8xl font-black text-indigo-900 leading-none">€</span>
                    </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3 relative z-10">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md shadow-indigo-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    Ajouter un revenu
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5 mb-5">
                    <div>
                        <DatePicker
                            label="Date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label text-slate-700">Client / Produit</label>
                        <input
                            placeholder="Description..."
                            value={desc}
                            onChange={e => {
                                setDesc(e.target.value);
                                if (errors.desc) setErrors({ ...errors, desc: false });
                            }}
                            className={`input bg-white text-slate-900 placeholder-slate-400 ${errors.desc ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-600'}`}
                        />
                        {errors.desc && <p className="text-red-500 text-xs mt-1">Requis</p>}
                    </div>
                    <div>
                        <Select
                            label="Plateforme"
                            value={platformId}
                            onChange={e => {
                                const val = e.target.value;
                                if (val === 'ADD_NEW') {
                                    // Trigger navigation prop
                                    if (props.onNavigateToConfig) props.onNavigateToConfig();
                                    return;
                                }
                                setPlatformId(val);
                                if (errors.platformId) setErrors({ ...errors, platformId: false });
                            }}
                            options={[
                                ...platforms.map(p => ({ value: p.id, label: p.name })),
                                { value: 'Autre', label: 'Autre' },
                                { value: 'ADD_NEW', label: '+ Ajouter une plateforme...' }
                            ]}
                            error={errors.platformId}
                        />
                    </div>
                    <div>
                        <label className="label text-slate-700">Montant (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={e => {
                                setAmount(e.target.value);
                                if (errors.amount) setErrors({ ...errors, amount: false });
                            }}
                            className={`input font-bold bg-white text-slate-900 ${errors.amount ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-600'}`}
                            placeholder="0.00"
                        />
                        {errors.amount && <p className="text-red-500 text-xs mt-1">Requis</p>}


                    </div>
                    <div>
                        <Select
                            label="TVA (%)"
                            value={vatRate}
                            onChange={e => setVatRate(e.target.value)}
                            options={[
                                { value: '0', label: '0% (Pas de TVA)' },
                                { value: '5.5', label: '5.5%' },
                                { value: '10', label: '10%' },
                                { value: '20', label: '20%' }
                            ]}
                        />
                    </div>

                    {/* Role Specific Inputs */}
                    {user.role === 'artisan' && (
                        <>
                            <div>
                                <label className="label text-slate-700">Coût Matière</label>
                                <input
                                    type="number" step="0.01"
                                    value={addFormRole.material_cost}
                                    onChange={e => setAddFormRole({ ...addFormRole, material_cost: e.target.value })}
                                    className="input bg-white border-slate-600 text-slate-900" placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="label text-slate-700">Heures</label>
                                <input
                                    type="number" step="0.5"
                                    value={addFormRole.hours_spent}
                                    onChange={e => setAddFormRole({ ...addFormRole, hours_spent: e.target.value })}
                                    className="input bg-white border-slate-600 text-slate-900" placeholder="0 h"
                                />
                            </div>
                        </>
                    )}

                    {user.role === 'creator' && (
                        <>
                            <div>
                                <Select
                                    label="Canal"
                                    value={addFormRole.channel_source}
                                    onChange={e => setAddFormRole({ ...addFormRole, channel_source: e.target.value })}
                                    options={[
                                        { value: 'Youtube', label: 'Youtube' },
                                        { value: 'Twitch', label: 'Twitch' },
                                        { value: 'Sponsor', label: 'Sponsor' },
                                        { value: 'Affiliation', label: 'Affiliation' },
                                        { value: 'Tipeee', label: 'Tipeee / Dons' },
                                        { value: 'Coaching', label: 'Coaching' },
                                        { value: 'Autre', label: 'Autre' }
                                    ]}
                                />
                            </div>
                            <div>
                                <Select
                                    label="Type"
                                    value={addFormRole.income_type}
                                    onChange={e => setAddFormRole({ ...addFormRole, income_type: e.target.value })}
                                    options={[
                                        { value: 'active', label: 'Actif' },
                                        { value: 'passive', label: 'Passif' }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="label text-slate-700">Date Fac.</label>
                                <input
                                    type="date"
                                    value={addFormRole.invoice_date}
                                    onChange={e => setAddFormRole({ ...addFormRole, invoice_date: e.target.value })}
                                    className="input bg-white border-slate-600 text-slate-900"
                                />
                            </div>
                        </>
                    )}

                    {user.role === 'field_service' && (
                        <>
                            <div>
                                <Select
                                    label="Statut"
                                    value={addFormRole.status}
                                    onChange={e => setAddFormRole({ ...addFormRole, status: e.target.value })}
                                    options={[
                                        { value: 'confirmed', label: 'Payé' },
                                        { value: 'quote_sent', label: 'Devis Envoyé' },
                                        { value: 'quote_signed', label: 'Devis Signé' }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="label text-slate-700">Distance (km)</label>
                                <input
                                    type="number" step="1"
                                    value={addFormRole.distance_km}
                                    onChange={e => setAddFormRole({ ...addFormRole, distance_km: e.target.value })}
                                    className="input bg-white border-slate-600 text-slate-900" placeholder="0 km"
                                />
                            </div>
                        </>
                    )}

                    {isEcommerce && (
                        <>
                            <div>
                                <label className="label text-slate-700">Coût Achat</label>
                                <input
                                    type="number" step="0.01"
                                    value={addFormEcommerce.cogs}
                                    onChange={e => setAddFormEcommerce({ ...addFormEcommerce, cogs: e.target.value })}
                                    className="input bg-white border-slate-600 text-slate-900" placeholder="COGS"
                                />
                            </div>
                            <div>
                                <label className="label text-slate-700">Livraison</label>
                                <input
                                    type="number" step="0.01"
                                    value={addFormEcommerce.shipping_cost}
                                    onChange={e => setAddFormEcommerce({ ...addFormEcommerce, shipping_cost: e.target.value })}
                                    className="input bg-white border-slate-600 text-slate-900" placeholder="Frais"
                                />
                            </div>
                        </>
                    )}

                    {!isEcommerce && user.role !== 'artisan' && user.role !== 'creator' && user.role !== 'field_service' && (
                        <div>
                            <label className="label text-slate-700">TJM</label>
                            <input
                                type="number"
                                step="1"
                                value={tjm}
                                onChange={e => setTjm(e.target.value)}
                                className="input bg-white border-slate-600 text-slate-900" placeholder="Optionnel"
                            />
                        </div>
                    )}


                    {!isEcommerce && (
                        <div>
                            <Select
                                label="Type Fiscal"
                                value={addFormRole.tax_category || 'bnc'}
                                onChange={e => setAddFormRole({ ...addFormRole, tax_category: e.target.value })}
                                options={[
                                    { value: 'bnc', label: 'BNC (Prestation de service / Libéral)' },
                                    { value: 'bic', label: 'BIC (Achat-Revente / Commercial)' },
                                    { value: 'vente', label: 'Vente (Marchandises)' }
                                ]}
                            />
                        </div>
                    )}
                </div>



                {/* RECURRING SECTION - REDESIGNED */}
                <div className={`p-4 rounded-xl border transition-all duration-300 mb-5 ${isRecurring ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex flex-wrap items-center gap-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${isRecurring ? 'bg-indigo-600' : ''}`}>
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${isRecurring ? 'translate-x-6' : ''}`}></div>
                            </div>
                            <span className="text-slate-700 font-bold group-hover:text-indigo-700 transition-colors">Mensuel</span>
                            <input
                                type="checkbox"
                                checked={isRecurring}
                                onChange={e => setIsRecurring(e.target.checked)}
                                className="hidden"
                            />
                        </label>

                        {isRecurring && (
                            <div className="flex items-center gap-3 animate-fadeIn">
                                <span className="text-indigo-300 mx-2">|</span>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-indigo-700 uppercase">Date Limite (Optionnel)</label>
                                    <input
                                        type="date"
                                        value={recurringEndDate}
                                        onChange={e => setRecurringEndDate(e.target.value)}
                                        className="input-xs bg-white border-indigo-300 text-indigo-900 focus:ring-indigo-500"
                                        min={date} // Cannot end before start
                                    />
                                    <span className="text-xs text-indigo-500 italic ml-1">
                                        (Laisser vide pour indéfini)
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    {isRecurring && (
                        <div className="mt-2 text-xs text-indigo-600 pl-16">
                            ℹ️ Si la date de début est passée, les revenus manquants seront automatiquement créés jusqu'à aujourd'hui.
                        </div>
                    )}
                </div>

                <div className="flex justify-end items-center pt-2">

                    <button type="submit" className="btn-primary shadow-md">
                        Ajouter
                    </button>
                </div>
            </form >



            <div className="flex justify-end relative gap-2">
                {/* Sort Toggle */}
                <button
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                    title={sortOrder === 'desc' ? "Trier du plus ancien au plus récent" : "Trier du plus récent au plus ancien"}
                >
                    {sortOrder === 'desc' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4 4m-4-4v12" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4-4m-4-4v12" transform="scale(1, -1) translate(0, -24)" />
                        </svg>
                    )}
                </button>

                <button
                    onClick={() => setShowColumnMenu(!showColumnMenu)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                    title="Gérer les colonnes visible"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                </button>

                {showColumnMenu && (
                    <div className="absolute right-0 top-10 z-20 w-56 bg-white rounded-lg shadow-xl border border-slate-200 p-2 animate-fadeIn ring-1 ring-black ring-opacity-5">
                        <div className="space-y-1">
                            {Object.entries({
                                date: 'Date',
                                name: 'Nom',
                                platform: 'Plateforme',
                                amount: 'Montant HT',
                                vat: 'TVA',
                                tjm: 'TJM',
                                fee: 'Frais (TTC)',
                                deductibleVat: 'TVA Déd.',
                                urssaf: 'URSSAF',
                                net: 'Net Final'
                            }).map(([key, label]) => {
                                if (key === 'tjm' && isEcommerce) return null; // Logic for TJM
                                return (
                                    <label key={key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-indigo-50 rounded cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns[key]}
                                            onChange={e => setVisibleColumns({ ...visibleColumns, [key]: e.target.checked })}
                                            className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                        />
                                        <span className="text-sm text-slate-700">{label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">
                            {visibleColumns.date && <th className="px-4 py-4 font-bold text-slate-700">Date</th>}
                            {visibleColumns.name && <th className="px-4 py-4 font-bold text-slate-700">Nom</th>}
                            {visibleColumns.platform && <th className="px-4 py-4 font-bold text-slate-700">Plateforme</th>}
                            {visibleColumns.amount && <th className="px-4 py-4 font-bold text-slate-700 text-right">Montant HT</th>}
                            {visibleColumns.vat && <th className="px-4 py-4 font-bold text-slate-700 text-right">TVA</th>}
                            {!isEcommerce && visibleColumns.tjm && <th className="px-4 py-4 font-bold text-slate-700 text-right">TJM</th>}
                            {visibleColumns.fee && <th className="px-4 py-4 font-bold text-slate-700 text-right text-red-600">Frais (TTC)</th>}
                            {visibleColumns.deductibleVat && <th className="px-4 py-4 font-bold text-slate-700 text-right text-orange-600">TVA Déd.</th>}
                            {visibleColumns.urssaf && <th className="px-4 py-4 font-bold text-slate-700 text-right text-indigo-700">URSSAF</th>}
                            {visibleColumns.net && <th className="px-4 py-4 font-bold text-slate-700 text-right text-emerald-700">Net Final</th>}
                            <th className="px-4 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredIncomes.slice().sort((a, b) => {
                            return sortOrder === 'desc'
                                ? new Date(b.date) - new Date(a.date)
                                : new Date(a.date) - new Date(b.date);
                        }).slice(0, visibleLimit).map(inc => {
                            const isEditing = editingId === inc.id;
                            const { p, gross, feeTotal, feeVat, urssaf, final } = calculate(isEditing ? { ...editForm, platformId: editForm.platformId || inc.platformId } : inc);

                            if (isEditing) {
                                return (
                                    <tr key={inc.id} className="bg-indigo-50">
                                        {visibleColumns.date && <td className="px-4 py-3"><input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-1 px-2" /></td>}
                                        {visibleColumns.name && <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="input text-xs border-slate-600" />
                                            </div>
                                        </td>}
                                        {visibleColumns.platform && <td className="px-4 py-3">
                                            <select value={editForm.platformId} onChange={e => setEditForm({ ...editForm, platformId: e.target.value })} className="input text-xs border-slate-600">
                                                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </td>}
                                        {visibleColumns.amount && <td className="px-4 py-3"><input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} className="input text-xs text-right border-slate-600" /></td>}
                                        {!isEcommerce && visibleColumns.tjm && (
                                            <td className="px-4 py-3"><input type="number" step="1" value={editForm.tjm || ''} onChange={e => setEditForm({ ...editForm, tjm: e.target.value })} className="input text-xs w-16 text-right border-slate-600" placeholder="-" /></td>
                                        )}
                                        <td colSpan="5" className="text-center text-xs text-slate-500 py-3">
                                            <div className="flex items-center justify-center gap-4 flex-wrap">
                                                {!isEcommerce && (
                                                    <select
                                                        value={editForm.tax_category || 'bnc'}
                                                        onChange={e => setEditForm({ ...editForm, tax_category: e.target.value })}
                                                        className="input text-xs border-slate-600 py-1 w-24"
                                                    >
                                                        <option value="bnc">BNC</option>
                                                        <option value="bic">BIC</option>
                                                        <option value="vente">Vente</option>
                                                    </select>
                                                )}
                                                <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.is_recurring}
                                                        onChange={e => setEditForm({ ...editForm, is_recurring: e.target.checked })}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="font-bold text-slate-700">Mensuel</span>
                                                </label>

                                                {editForm.is_recurring && (
                                                    <div className="flex items-center gap-2 animate-fadeIn">
                                                        <label className="font-bold text-indigo-700 uppercase whitespace-nowrap">Date Limite</label>
                                                        <input
                                                            type="date"
                                                            value={editForm.recurring_end_date || ''}
                                                            onChange={e => setEditForm({ ...editForm, recurring_end_date: e.target.value })}
                                                            className="block rounded-md border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1 px-2 text-indigo-900 w-32"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button className="p-1 w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors" onClick={saveEdit}>
                                                    <span className="font-bold text-sm">✓</span>
                                                </button>
                                                <button className="p-1 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors" onClick={cancelEdit}>
                                                    <span className="font-bold text-sm">✕</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={inc.id} className="hover:bg-slate-50 transition-colors group">
                                    {visibleColumns.date && <td className="px-4 py-3 text-slate-800 font-medium">{new Date(inc.date).toLocaleDateString()}</td>}
                                    {visibleColumns.name && <td className="px-4 py-3 font-semibold text-slate-900">
                                        {inc.name}
                                        {!!inc.is_recurring && (
                                            <span className="ml-2 text-blue-600 bg-blue-50 border border-blue-200 p-0.5 rounded-full inline-flex items-center justify-center" title="Revenu Mensuel">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </span>
                                        )}
                                        {inc.status === 'quote_sent' && <span className="ml-2 bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-xs font-bold">DEVIS</span>}
                                    </td>}
                                    {visibleColumns.platform && <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded-md bg-white text-xs font-semibold text-slate-700 border border-slate-200 shadow-sm">
                                            {p ? p.name : 'Autre'}
                                        </span>
                                    </td>}
                                    {visibleColumns.amount && <td className="px-4 py-3 text-right font-bold text-slate-700">{inc.amount.toFixed(2)}€</td>}
                                    {visibleColumns.vat && <td className="px-4 py-3 text-right text-xs text-slate-500 font-medium">
                                        {inc.vat_amount ? `+${inc.vat_amount.toFixed(2)}€` : '-'}
                                    </td>}
                                    {!isEcommerce && visibleColumns.tjm && (
                                        <td className="px-4 py-3 text-right text-slate-600 text-xs font-medium">{inc.tjm ? inc.tjm + '€' : '-'}</td>
                                    )}
                                    {visibleColumns.fee && <td className="px-4 py-3 text-right text-red-600 font-medium">-{feeTotal.toFixed(2)}€</td>}
                                    {visibleColumns.deductibleVat && <td className="px-4 py-3 text-right text-orange-600 font-medium text-xs">
                                        {feeVat > 0 ? `(${feeVat.toFixed(2)}€)` : '-'}
                                    </td>}
                                    {visibleColumns.urssaf && <td className="px-4 py-3 text-right text-indigo-700 font-medium">
                                        <div className="flex flex-col items-end">
                                            <span>-{urssaf.toFixed(2)}€</span>
                                            <span className="text-[10px] text-slate-400">{(calculate(inc).urssafRate * 100).toFixed(1)}%</span>
                                        </div>
                                    </td>}
                                    {visibleColumns.net && <td className="px-4 py-3 text-right font-bold text-emerald-700">{final.toFixed(2)}€</td>}
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <button onClick={() => startEdit(inc)} className="p-1 w-9 h-9 flex items-center justify-center hover:bg-indigo-100 text-indigo-700 rounded-full transition-colors font-bold">
                                                <span className="text-lg">✎</span>
                                            </button>
                                            <button onClick={() => handleDelete(inc.id)} className="p-1 w-9 h-9 flex items-center justify-center hover:bg-red-100 text-red-600 rounded-full transition-colors text-xl font-bold">
                                                ×
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredIncomes.length === 0 && (
                            <tr>
                                <td colSpan={10} className="px-4 py-12 text-center text-slate-500 font-medium italic">
                                    Aucun revenu pour cette période
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {filteredIncomes.length > 0 && (
                        <tfoot className="bg-slate-50 font-extrabold border-t border-slate-600 text-slate-900">
                            <tr>
                                {(visibleColumns.date || visibleColumns.name || visibleColumns.platform) && (
                                    <td colSpan={(visibleColumns.date ? 1 : 0) + (visibleColumns.name ? 1 : 0) + (visibleColumns.platform ? 1 : 0)} className="px-4 py-4 text-right text-slate-900 uppercase text-sm tracking-widest font-black">Totaux</td>
                                )}
                                {visibleColumns.amount && <td className="px-4 py-4 text-right">{totals.gross.toFixed(2)}€</td>}
                                {visibleColumns.vat && <td className="px-4 py-4 text-right text-slate-500 text-xs"></td>}
                                {!isEcommerce && visibleColumns.tjm && <td></td>}
                                {visibleColumns.fee && <td className="px-4 py-4 text-right text-red-600">-{totals.feeTotal.toFixed(2)}€</td>}
                                {visibleColumns.deductibleVat && <td className="px-4 py-4 text-right text-orange-600 text-xs font-bold">{totals.feeVat.toFixed(2)}€</td>}
                                {visibleColumns.urssaf && <td className="px-4 py-4 text-right text-indigo-700">-{totals.urssaf.toFixed(2)}€</td>}
                                {visibleColumns.net && <td className="px-4 py-4 text-right font-bold text-emerald-700">{totals.final.toFixed(2)}€</td>}
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Pagination Controls */}
            {filteredIncomes.length > 10 && (
                <div className="flex justify-center mt-4">
                    {visibleLimit < filteredIncomes.length ? (
                        <button
                            onClick={() => setVisibleLimit(prev => prev + 10)}
                            className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-full shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <span>Voir plus</span>
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">
                                {Math.min(filteredIncomes.length - visibleLimit, 10)} restants
                            </span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setVisibleLimit(10)}
                            className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-full hover:bg-slate-200 transition-colors"
                        >
                            Réduire la liste
                        </button>
                    )}
                </div>
            )}

            {/* Jauges Seuils */}
            <div className="grid gap-6 mb-8 mt-8">
                {/* Jauge Franchise TVA */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between mb-2 text-sm text-slate-700 font-medium">
                        <span>Franchise TVA (Seuil: {TVA_THRESHOLD.toLocaleString()}€)</span>
                        <span className="font-bold flex items-center gap-2" style={{ color: tvaColor }}>
                            {totals.gross.toFixed(2)}€
                            <span className="text-xs bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                                {((totals.gross / TVA_THRESHOLD) * 100).toFixed(1)}%
                            </span>
                        </span>
                    </div>

                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100 relative">
                        {/* Always show at least a sliver if > 0 */}
                        <div
                            className="h-full transition-all duration-500 ease-out rounded-full min-w-[5px]"
                            style={{ width: `${Math.max(tvaProgress, 1)}%`, backgroundColor: tvaColor }}
                        />
                    </div>
                    {tvaProgress >= 100 && (
                        <div className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1">
                            ⚠️ Seuil TVA dépassé
                        </div>
                    )}
                </div>

                {/* Jauge Plafond Micro */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between mb-2 text-sm text-slate-700 font-medium">
                        <span>Plafond Micro-Entreprise (Seuil: {MICRO_THRESHOLD.toLocaleString()}€)</span>
                        <span className="font-bold flex items-center gap-2" style={{ color: microColor }}>
                            {totals.gross.toFixed(2)}€
                            <span className="text-xs bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                                {((totals.gross / MICRO_THRESHOLD) * 100).toFixed(1)}%
                            </span>
                        </span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                        <div
                            className="h-full transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${microProgress}%`, backgroundColor: microColor }}
                        />
                    </div>
                    {microProgress >= 100 && (
                        <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm flex items-start gap-3">
                            <div className="text-blue-500 mt-1">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-900">Seuil Micro-Entreprise dépassé</h4>
                                {previousYearTotals > MICRO_THRESHOLD ? (
                                    <>
                                        <p className="font-bold text-red-800 mt-1">
                                            SEUIL DÉPASSÉ 2 ANNÉES CONSÉCUTIVES ({previousYear} et {currentYear}).
                                        </p>
                                        <p className="text-sm text-red-700 mt-1">
                                            Vous ne pouvez plus bénéficier du régime micro-entreprise.
                                            Vous basculez <strong>obligatoirement</strong> au régime réel dès le 1er janvier prochain.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-bold text-blue-800 mt-1">
                                            Vous avez dépassé le seuil de {MICRO_THRESHOLD.toLocaleString()}€.
                                        </p>
                                        <p className="text-sm text-blue-700 mt-1">
                                            Pas de panique ! En Micro-Entreprise, vous avez droit à une <strong>année de tolérance</strong>.
                                        </p>
                                        <ul className="list-disc pl-5 mt-2 text-blue-700 text-sm space-y-1">
                                            <li>Vous restez en micro-entreprise cette année ({currentYear}).</li>
                                            <li>Vous ne basculerez au régime réel que si vous dépassez ce seuil <strong>deux années consécutives</strong>.</li>
                                            <li>⚠️ Attention : Si vous aviez déjà dépassé le seuil en {previousYear}, vous devez passer au réel.</li>
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={confirmDelete}
                message="Êtes-vous sûr de vouloir supprimer ce revenu ?"
            />
        </div>
    );
}
