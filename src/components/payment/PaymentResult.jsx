
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PaymentResult() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sessionId = searchParams.get('session_id');
    const isSuccess = window.location.pathname === '/success';

    useEffect(() => {
        if (isSuccess && sessionId) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });

            const verify = async () => {
                try {
                    console.log("Verifying session...", sessionId);
                    await axios.get(`http://localhost:3001/api/stripe/verify-session?session_id=${sessionId}`, { withCredentials: true });
                    console.log("Session verified.");
                } catch (err) {
                    console.error("Verification failed", err);
                }
            };
            verify();
        }
    }, [isSuccess, sessionId]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6 animate-in zoom-in duration-300">
                {isSuccess ? (
                    <>
                        <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                            <CheckCircle2 size={40} />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800">Paiement Réussi !</h1>
                        <p className="text-slate-600">
                            Merci de votre confiance. Votre compte a été mis à niveau avec succès.
                        </p>
                        <p className="text-sm text-slate-400">
                            (Si votre statut ne change pas immédiatement, actualisez la page dans quelques secondes)
                        </p>
                        <button
                            onClick={() => {
                                window.location.href = '/'; // Full reload to refresh user context
                            }}
                            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                        >
                            Accéder au Dashboard
                            <ArrowRight size={18} />
                        </button>
                    </>
                ) : (
                    <>
                        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                            <XCircle size={40} />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800">Paiement Annulé</h1>
                        <p className="text-slate-600">
                            Le processus de paiement a été interrompu. Aucun montant n'a été débité.
                        </p>
                        <button
                            onClick={() => navigate('/premium')}
                            className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            Réessayer
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
