import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

export default function ServiceStats({ year }) {
    const { incomes } = useFinance();
    const { user } = useAuth();

    if (user?.role !== 'field_service') return null;

    const filteredIncomes = incomes.filter(i => new Date(i.date).getFullYear() === year);

    // 1. Kilometer Profitability
    // Filter items with distance_km > 0
    const travelItems = filteredIncomes.filter(i => i.distance_km > 0 && i.status === 'paid'); // Only paid for profitability? Or signed?
    // Let's us all confirmed/paid revenue.

    // Sort by Revenue per Km Ascending (Least profitable first)
    travelItems.sort((a, b) => {
        const rateA = a.amount / a.distance_km;
        const rateB = b.amount / b.distance_km;
        return rateA - rateB;
    });

    // 2. Quote Conversion Funnel (All Time or Year?) - Let's do Year based on Date.
    // Funnel: Quote Sent -> Quote Signed -> Paid
    // We agreed to use 'status' field: 'quote_sent', 'quote_signed', 'paid' ('confirmed' maps to paid/signed?)

    const allQuotes = filteredIncomes;
    // Assuming status values: 'quote_sent', 'quote_signed', 'confirmed' (paid).
    // Note: 'confirmed' usually means paid in this system.

    const sentCount = allQuotes.length; // Everyone starts as sent ideally, or we count all records.
    // Logic: If status is 'paid', it was implicitly sent and signed. 
    // User wants "Montant Total Devis Envoyés".

    let amountSent = 0;
    let amountSigned = 0;
    let amountPaid = 0;

    let countSent = 0;
    let countSigned = 0;
    let countPaid = 0;

    allQuotes.forEach(i => {
        // Everyone counts towards "Sent" bucket? 
        // Yes, funnel logic implies strict inclusion.
        // Or if we have separate statuses, we sum them up.
        // Status: 'quote_sent' -> Just Sent.
        // Status: 'quote_signed' -> Signed (implies Sent).
        // Status: 'confirmed'/'paid' -> Paid (implies Signed & Sent).

        const s = i.status || 'confirmed';

        if (s === 'quote_sent' || s === 'quote_signed' || s === 'confirmed' || s === 'paid') {
            amountSent += i.amount;
            countSent++;
        }
        if (s === 'quote_signed' || s === 'confirmed' || s === 'paid') {
            amountSigned += i.amount;
            countSigned++;
        }
        if (s === 'confirmed' || s === 'paid') {
            amountPaid += i.amount;
            countPaid++;
        }
    });

    const conversionRate = countSent > 0 ? (countSigned / countSent) * 100 : 0;

    // 3. Recurrence (New vs Regular)
    // Identify unique client names in History (before this year or within year?)
    // "Répartition du CA entre Clients Réguliers et Nouveaux"
    // Approach: For each income, check if client name exists in previous records (by date).
    let revenueNew = 0;
    let revenueRegular = 0;

    // Need to sort all incomes by date to check history properly
    const sortedAllIncomes = [...incomes].sort((a, b) => new Date(a.date) - new Date(b.date));
    const seenClients = new Set();

    sortedAllIncomes.forEach(inc => {
        if (new Date(inc.date).getFullYear() !== year) {
            seenClients.add(inc.name.toLowerCase().trim());
            return; // Just building history
        }

        // It is current year
        const clientName = inc.name.toLowerCase().trim();
        if (seenClients.has(clientName)) {
            revenueRegular += inc.amount;
        } else {
            revenueNew += inc.amount;
            seenClients.add(clientName);
        }
    });

    const totalRecurrence = revenueNew + revenueRegular;
    const regularPct = totalRecurrence > 0 ? (revenueRegular / totalRecurrence) * 100 : 0;

    return (
        <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', color: '#15803d' }}>🚙 Dashboard Prestataire Terrain</h2>

            {/* Funnel Card */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📣 Conversion des Devis</h3>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', textAlign: 'center' }}>

                    <div style={{ position: 'relative', width: '30%' }}>
                        <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: '8px', border: '1px solid #86efac' }}>
                            <div className="text-sm text-green-800 uppercase font-bold">Envoyés</div>
                            <div className="text-xl font-bold text-green-900">{amountSent.toFixed(0)}€</div>
                            <div className="text-xs text-green-700">{countSent} devis</div>
                        </div>
                    </div>

                    <div style={{ fontSize: '1.5rem', color: '#86efac' }}>➜</div>

                    <div style={{ position: 'relative', width: '30%' }}>
                        <div style={{ background: '#bbf7d0', padding: '1rem', borderRadius: '8px', border: '1px solid #4ade80' }}>
                            <div className="text-sm text-green-800 uppercase font-bold">Signés</div>
                            <div className="text-xl font-bold text-green-900">{amountSigned.toFixed(0)}€</div>
                            <div className="text-xs text-green-700">{Math.round(conversionRate)}% conv.</div>
                        </div>
                    </div>

                    <div style={{ fontSize: '1.5rem', color: '#22c55e' }}>➜</div>

                    <div style={{ position: 'relative', width: '30%' }}>
                        <div style={{ background: '#16a34a', padding: '1rem', borderRadius: '8px', color: 'white' }}>
                            <div className="text-sm uppercase font-bold" style={{ opacity: 0.9 }}>Encaissés</div>
                            <div className="text-xl font-bold">{amountPaid.toFixed(0)}€</div>
                            <div className="text-xs" style={{ opacity: 0.8 }}>{countPaid} paiements</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recurrence Pie */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', width: '100%', textAlign: 'left' }}>🔁 Fidélité Client</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(#15803d ${regularPct}%, #86efac 0)` }}></div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ width: '12px', height: '12px', background: '#15803d', borderRadius: '2px' }}></div>
                                <span className="font-bold text-green-900">Réguliers: {revenueRegular.toFixed(0)}€</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '12px', height: '12px', background: '#86efac', borderRadius: '2px' }}></div>
                                <span className="text-green-700">Nouveaux: {revenueNew.toFixed(0)}€</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table A: Kilometer Profitability */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>⛽ Rentabilité Kilométrique</h3>
                    <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th>CA</th>
                                    <th>Dist.</th>
                                    <th>€ / km</th>
                                </tr>
                            </thead>
                            <tbody>
                                {travelItems.map((item, idx) => {
                                    const rate = item.amount / item.distance_km;
                                    const isLow = rate < 2; // Arbitrary low threshold, e.g. < 0.50€/km is bare minimum for gas+wear
                                    return (
                                        <tr key={idx} style={{ backgroundColor: isLow ? '#fef2f2' : 'transparent' }}>
                                            <td className="font-medium">{item.name}</td>
                                            <td>{item.amount.toFixed(0)}€</td>
                                            <td>{item.distance_km}km</td>
                                            <td style={{ fontWeight: 'bold', color: isLow ? '#dc2626' : '#16a34a' }}>
                                                {rate.toFixed(2)}€
                                            </td>
                                        </tr>
                                    );
                                })}
                                {travelItems.length === 0 && <tr><td colSpan="4" className="text-center text-slate-500">Aucun déplacement</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
