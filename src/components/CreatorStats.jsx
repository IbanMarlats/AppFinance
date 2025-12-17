import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

export default function CreatorStats({ year }) {
    const { incomes } = useFinance();
    const { user } = useAuth();

    if (user?.role !== 'creator') return null;

    const filteredIncomes = incomes.filter(i => new Date(i.date).getFullYear() === year);

    // 1. Revenue by Channel
    const channelStats = {};
    const variationStats = {}; // To store previous month data?
    // Doing true variation requires monthly buckets per channel.

    // Let's bucket: Channel -> Month -> Amount
    const channelHistory = {};

    filteredIncomes.forEach(inc => {
        const ch = inc.channel_source || 'Autre';
        const amount = inc.amount;

        if (!channelStats[ch]) channelStats[ch] = 0;
        channelStats[ch] += amount;

        const m = inc.date.substring(0, 7);
        if (!channelHistory[ch]) channelHistory[ch] = {};
        if (!channelHistory[ch][m]) channelHistory[ch][m] = 0;
        channelHistory[ch][m] += amount;
    });

    const totalRevenue = Object.values(channelStats).reduce((a, b) => a + b, 0);

    // Variation Table Data (Current Month vs Previous Month)
    const currentMonth = new Date().toISOString().substring(0, 7);
    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMonth = prevDate.toISOString().substring(0, 7);

    // 2. Passive vs Active Ratio
    let passiveInc = 0;
    let activeInc = 0;
    filteredIncomes.forEach(inc => {
        if (inc.income_type === 'passive') passiveInc += inc.amount;
        else activeInc += inc.amount;
    });
    const totalType = passiveInc + activeInc;
    const passivePct = totalType > 0 ? (passiveInc / totalType) * 100 : 0;

    // 3. Payment Delay (Billed vs Collected)
    // Filter incomes with an invoice_date
    const delayedItems = filteredIncomes.filter(i => i.invoice_date);
    delayedItems.sort((a, b) => {
        // Sort by delay desc
        const delayA = (new Date(a.date) - new Date(a.invoice_date));
        const delayB = (new Date(b.date) - new Date(b.invoice_date));
        return delayB - delayA;
    });

    return (
        <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', color: '#7c3aed' }}>🎙️ Dashboard Créateur</h2>

            {/* KPI Card */}
            <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(to right, #f3e8ff, #ede9fe)', border: '1px solid #ddd6fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div className="text-sm text-purple-800 font-bold uppercase tracking-wider">Revenu Passif vs Actif</div>
                        <div className="text-2xl font-bold text-purple-900">{passivePct.toFixed(1)}% Passif</div>
                        <div className="text-xs text-purple-700">Objectif : Augmenter la part passive (Affiliation, Views)</div>
                    </div>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: `conic-gradient(#a855f7 ${passivePct}%, #e9d5ff 0)` }}></div>
                </div>
            </div>

            {/* Table A: Channel Breakdown & Variation */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📈 Rentabilité par Canal</h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Canal</th>
                                <th>Total (Année)</th>
                                <th>Ce Mois ({currentMonth})</th>
                                <th>Variation (vs M-1)</th>
                                <th>Part du CA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(channelStats).sort((a, b) => b[1] - a[1]).map(([ch, total]) => {
                                const current = channelHistory[ch]?.[currentMonth] || 0;
                                const prev = channelHistory[ch]?.[prevMonth] || 0;
                                let variation = 0;
                                if (prev > 0) variation = ((current - prev) / prev) * 100;
                                else if (current > 0) variation = 100; // New income source

                                const percent = (total / totalRevenue) * 100;

                                return (
                                    <tr key={ch}>
                                        <td style={{ fontWeight: 'bold' }}>{ch}</td>
                                        <td>{total.toFixed(2)}€</td>
                                        <td>{current.toFixed(2)}€</td>
                                        <td style={{ color: variation > 0 ? '#16a34a' : variation < 0 ? '#dc2626' : '#666' }}>
                                            {variation > 0 ? '+' : ''}{variation.toFixed(0)}%
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <div style={{ width: '50px', height: '6px', background: '#e5e7eb', borderRadius: '3px' }}>
                                                    <div style={{ width: `${percent}%`, background: '#8b5cf6', height: '100%', borderRadius: '3px' }}></div>
                                                </div>
                                                <span style={{ fontSize: '0.8em' }}>{percent.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Table B: Payment Delays */}
            <div className="card">
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>⏳ Délais de Paiement (Facturé → Encaissé)</h3>
                <p className="text-sm text-slate-500 mb-4">Top des clients les plus lents à payer.</p>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Client / Plateforme</th>
                                <th>Date Facture</th>
                                <th>Date Paiement</th>
                                <th>Délai</th>
                                <th>Montant</th>
                            </tr>
                        </thead>
                        <tbody>
                            {delayedItems.slice(0, 5).map((item, idx) => {
                                const start = new Date(item.invoice_date);
                                const end = new Date(item.date);
                                const diffTime = Math.abs(end - start);
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                const isLong = diffDays > 45;

                                return (
                                    <tr key={idx} style={{ backgroundColor: isLong ? '#fff1f2' : 'transparent' }}>
                                        <td style={{ fontWeight: '500' }}>{item.name} / {item.channel_source || 'Autre'}</td>
                                        <td>{start.toLocaleDateString()}</td>
                                        <td>{end.toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 'bold', color: isLong ? '#dc2626' : '#666' }}>{diffDays} jours</td>
                                        <td>{item.amount.toFixed(2)}€</td>
                                    </tr>
                                );
                            })}
                            {delayedItems.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: '#666' }}>Aucune facture datée renseignée</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
