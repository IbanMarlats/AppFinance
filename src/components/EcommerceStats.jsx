import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

export default function EcommerceStats({ year }) {
    const { incomes, expenses, platforms } = useFinance();
    const { user } = useAuth(); // Assume role check is done by parent or here

    if (user?.role !== 'ecommerce') return null;

    // Filter by year
    const filteredIncomes = incomes.filter(i => new Date(i.date).getFullYear() === year);
    const filteredExpenses = expenses.filter(e => new Date(e.date).getFullYear() === year);

    // 1. AOV (Average Order Value)
    // Assuming 1 Income = 1 Order
    // Filter out refunds for AOV calc (or keep them?) - usually sales only.
    const activeSales = filteredIncomes.filter(i => i.status !== 'refunded');
    const totalSalesRevenue = activeSales.reduce((acc, curr) => acc + curr.amount, 0);
    const orderCount = activeSales.length;
    const aov = orderCount > 0 ? totalSalesRevenue / orderCount : 0;

    // 2. Return Rate
    const refundCount = filteredIncomes.filter(i => i.status === 'refunded').length;
    const totalOrdersExcludingRefunds = orderCount; // Wait, refund is usually a status update on an order.
    // If status='refunded', it was an order.
    // So total attempts = activeSales + refunds? Or is 'refunded' replacing 'confirmed'?
    // Let's assume total orders = all rows.
    const allOrdersCount = filteredIncomes.length;
    const returnRate = allOrdersCount > 0 ? (refundCount / allOrdersCount) * 100 : 0;

    // 3. Marketing & ROAS
    // Identify marketing expenses. We need a way. 
    // Let's match category names like 'Marketing', 'Ads', 'Publicité', 'Facebook', 'Google'.
    const marketingKeywords = ['marketing', 'ads', 'pub', 'facebook', 'google', 'instagram', 'tiktok'];
    const marketingExpenses = filteredExpenses.filter(e => {
        const cat = (e.category || '').toLowerCase();
        const name = (e.name || '').toLowerCase();
        return marketingKeywords.some(k => cat.includes(k) || name.includes(k));
    });
    const totalAdSpend = marketingExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const roas = totalAdSpend > 0 ? totalSalesRevenue / totalAdSpend : 0;

    // 4. Product Margins (Net Margin per Product)
    // Group by 'name' as product
    const productStats = {};
    activeSales.forEach(sale => {
        const p = platforms.find(pl => pl.id === sale.platformId) || { taxRate: 0, fixed_fee: 0 };

        // Fee calculation
        const platformFee = (sale.amount * (p.taxRate / 100)) + (p.fixed_fee || 0);

        // Costs
        const cogs = sale.cogs || 0;
        const shipping = sale.shipping_cost || 0;
        const transaction = 0; // If tracked separately, add here.

        const totalCost = cogs + shipping + platformFee + transaction;
        const margin = sale.amount - totalCost;

        if (!productStats[sale.name]) {
            productStats[sale.name] = {
                name: sale.name,
                revenue: 0,
                count: 0,
                margin: 0,
                costs: { cogs: 0, shipping: 0, fees: 0 }
            };
        }
        productStats[sale.name].revenue += sale.amount;
        productStats[sale.name].count += 1;
        productStats[sale.name].margin += margin;
        productStats[sale.name].costs.cogs += cogs;
        productStats[sale.name].costs.shipping += shipping;
        productStats[sale.name].costs.fees += platformFee;
    });

    const products = Object.values(productStats).sort((a, b) => a.margin - b.margin); // Sort by margin (lowest first to identify losers?) OR highest?
    // User asked "Quel produit leur fait perdre de l'argent". So lowest margin is interesting.
    // Let's sort by Margin Ascending? Or just list them.
    // Let's sort by Total Margin Descending implies best products. 
    // Maybe sort by "Total Margin" or "Unit Margin"? 
    // Let's do Total Margin Descending by default.

    // 5. Cost Breakdown (Pie Chart data preparation)
    const totalCogs = activeSales.reduce((acc, curr) => acc + (curr.cogs || 0), 0);
    const totalShipping = activeSales.reduce((acc, curr) => acc + (curr.shipping_cost || 0), 0);
    const totalFees = activeSales.reduce((acc, curr) => {
        const p = platforms.find(pl => pl.id === curr.platformId) || { taxRate: 0, fixed_fee: 0 };
        return acc + (curr.amount * (p.taxRate / 100)) + (p.fixed_fee || 0);
    }, 0);
    // Marketing is totalAdSpend

    const totalCosts = totalCogs + totalShipping + totalFees + totalAdSpend;

    return (
        <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', color: '#1e3a8a' }}>📊 Dashboard E-commerce</h2>

            {/* KPI Cards */}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ textAlign: 'center', backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
                    <div className="text-sm text-slate-500">Panier Moyen (AOV)</div>
                    <div className="text-2xl font-bold text-blue-700">{aov.toFixed(2)}€</div>
                </div>
                <div className="card" style={{ textAlign: 'center', backgroundColor: returnRate > 5 ? '#fef2f2' : '#f0fdf4', border: returnRate > 5 ? '1px solid #fecaca' : '1px solid #bbf7d0' }}>
                    <div className="text-sm text-slate-500">Taux de Retour</div>
                    <div className="text-2xl font-bold" style={{ color: returnRate > 5 ? '#dc2626' : '#16a34a' }}>{returnRate.toFixed(1)}%</div>
                </div>
                <div className="card" style={{ textAlign: 'center', backgroundColor: '#fff7ed', border: '1px solid #ffedd5' }}>
                    <div className="text-sm text-slate-500">ROAS (Retour Pub)</div>
                    <div className="text-2xl font-bold text-orange-700">x{roas.toFixed(2)}</div>
                    <div className="text-xs text-orange-600/70">Budget Pub: {totalAdSpend.toFixed(0)}€</div>
                </div>
                <div className="card" style={{ textAlign: 'center', backgroundColor: '#fafafa', border: '1px solid #e5e5e5' }}>
                    <div className="text-sm text-slate-500">Marge Nette Globale</div>
                    <div className="text-2xl font-bold text-slate-700">
                        {(totalSalesRevenue - totalCosts).toFixed(2)}€
                    </div>
                </div>
            </div>

            {/* Marge par Produit Table */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📦 Rentabilité par Produit</h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Produit</th>
                                <th>Ventes</th>
                                <th>CA Total</th>
                                <th>Coûts (Achat + Exp + Frais)</th>
                                <th>Marge Nette</th>
                                <th>% Marge</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p, idx) => {
                                const totalProductCosts = p.costs.cogs + p.costs.shipping + p.costs.fees;
                                const marginPercent = (p.margin / p.revenue) * 100;
                                return (
                                    <tr key={idx} style={{ backgroundColor: p.margin < 0 ? '#fef2f2' : 'transparent' }}>
                                        <td style={{ fontWeight: '500' }}>{p.name}</td>
                                        <td>{p.count}</td>
                                        <td>{p.revenue.toFixed(2)}€</td>
                                        <td style={{ color: '#64748b' }}>-{totalProductCosts.toFixed(2)}€</td>
                                        <td style={{ fontWeight: 'bold', color: p.margin >= 0 ? '#16a34a' : '#dc2626' }}>
                                            {p.margin.toFixed(2)}€
                                        </td>
                                        <td>
                                            <span className={`badge ${marginPercent >= 20 ? 'success' : marginPercent > 0 ? 'warning' : 'danger'}`}>
                                                {marginPercent.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {products.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: '#64748b' }}>Aucune vente enregistrée</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Cost Breakdown Simple Viz */}
            <div className="card">
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>💸 Répartition des Coûts</h3>
                <div className="flex flex-col gap-2">
                    {[
                        { label: 'Achat Produits (COGS)', value: totalCogs, color: '#3b82f6' },
                        { label: 'Expédition', value: totalShipping, color: '#f59e0b' },
                        { label: 'Frais Plateforme', value: totalFees, color: '#8b5cf6' },
                        { label: 'Marketing (Ads)', value: totalAdSpend, color: '#ec4899' }
                    ].map((item, i) => {
                        const percent = totalCosts > 0 ? (item.value / totalCosts) * 100 : 0;
                        if (percent === 0) return null;
                        return (
                            <div key={i} className="mb-2">
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{item.label}</span>
                                    <span style={{ fontWeight: 'bold' }}>{item.value.toFixed(0)}€ ({percent.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                    <div style={{ width: `${percent}%`, backgroundColor: item.color, height: '100%' }}></div>
                                </div>
                            </div>
                        )
                    })}
                    {totalCosts === 0 && <div className="text-center text-slate-500 py-4">Aucun coût enregistré</div>}
                </div>
            </div>
        </div>
    );
}
