import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, API_URL } from '../../context/AuthContext';
import { Calendar, Download, RefreshCw, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react';
import RecapView from './RecapView';
import YearlyRecapView from './YearlyRecapView';
import PremiumSubscriptionBlock from '../ui/PremiumSubscriptionBlock';
import { useSearchParams } from 'react-router-dom';

export default function RecapDashboard() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [recaps, setRecaps] = useState([]);
    const [yearlyRecaps, setYearlyRecaps] = useState([]);
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'annual'

    // selectedRecap is now derived from URL
    const selectedRecapId = searchParams.get('recapId');
    const selectedRecap = viewMode === 'monthly'
        ? recaps.find(r => r.id === selectedRecapId)
        : yearlyRecaps.find(r => r.id === selectedRecapId);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user.is_premium) {
            fetchRecaps();
            fetchYearlyRecaps();
        } else {
            setLoading(false);
        }
    }, [user.is_premium]);

    const fetchRecaps = async () => {
        try {
            const res = await axios.get(`${API_URL}/recaps`);
            setRecaps(res.data);
        } catch (err) {
            console.error("Failed to fetch recaps", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchYearlyRecaps = async () => {
        try {
            const res = await axios.get(`${API_URL}/recaps/annual`);
            setYearlyRecaps(res.data);
        } catch (err) {
            console.error("Failed to fetch yearly recaps", err);
        }
    };

    if (!user.is_premium) {
        return (
            <div className="max-w-4xl mx-auto py-8">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-slate-800 mb-4">Archives & Bilans</h2>
                    <p className="text-slate-500 max-w-lg mx-auto">
                        Retrouvez chaque mois une analyse détaillée de votre activité, générée automatiquement et archivée pour vous.
                    </p>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 min-h-[600px]">
                    <div className="absolute inset-0 backdrop-blur-sm z-10 flex items-center justify-center bg-white/50">
                        <PremiumSubscriptionBlock />
                    </div>
                    {/* Fake List Background */}
                    <div className="space-y-4 opacity-50">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Calendar size={24} /></div>
                                    <div>
                                        <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
                                        <div className="h-3 w-20 bg-slate-100 rounded"></div>
                                    </div>
                                </div>
                                <ChevronRight className="text-slate-300" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Chargement...</div>;

    if (selectedRecap) {
        if (viewMode === 'annual') {
            return <YearlyRecapView
                recap={selectedRecap}
                onBack={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('recapId');
                    setSearchParams(newParams);
                }}
            />;
        }
        return <RecapView
            recap={selectedRecap}
            onBack={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('recapId');
                setSearchParams(newParams);
            }}
        />;
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Bilans & Archives</h2>
                    <p className="text-slate-500">Retrouvez l'historique de vos performances.</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Mensuels
                    </button>
                    <button
                        onClick={() => setViewMode('annual')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'annual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Annuels
                    </button>
                </div>
            </div>

            {viewMode === 'monthly' ? (
                recaps.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
                        {/* Empty Monthly State */}
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="text-slate-400" size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun bilan mensuel disponible</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                            Vos bilans sont générés automatiquement à la fin de chaque mois.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recaps.map(recap => {
                            const date = new Date(recap.year, recap.month - 1);
                            const monthName = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

                            return (
                                <div
                                    key={recap.id}
                                    onClick={() => {
                                        const newParams = new URLSearchParams(searchParams);
                                        newParams.set('recapId', recap.id);
                                        setSearchParams(newParams);
                                    }}
                                    className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Calendar size={100} className="transform rotate-12 -translate-y-4 translate-x-4" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                            <Calendar size={24} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 capitalize mb-1">{monthName}</h3>
                                        <p className="text-sm text-slate-500 mb-4">Généré le {new Date(recap.created_at).toLocaleDateString()}</p>

                                        <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 group-hover:translate-x-1 transition-transform">
                                            Voir le détail <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                // ANNUAL VIEW
                yearlyRecaps.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <TrendingUp className="text-indigo-400" size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun bilan annuel disponible</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                            Le bilan annuel sera généré à la fin de l'année.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {yearlyRecaps.map(recap => (
                            <div
                                key={recap.id}
                                onClick={() => {
                                    const newParams = new URLSearchParams(searchParams);
                                    newParams.set('recapId', recap.id);
                                    setSearchParams(newParams);
                                }}
                                className="group bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-6 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <TrendingUp size={100} className="text-white transform rotate-12 -translate-y-4 translate-x-4" />
                                </div>

                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                                        <TrendingUp size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white capitalize mb-1">Bilan {recap.year}</h3>
                                    <p className="text-sm text-slate-400 mb-4">Année complète</p>

                                    <div className="flex items-center gap-2 text-sm font-medium text-indigo-400 group-hover:translate-x-1 transition-transform">
                                        Consulter <ChevronRight size={16} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
