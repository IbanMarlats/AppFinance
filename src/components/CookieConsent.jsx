import { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';

export default function CookieConsent({ onAccept }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        if (consent === null) {
            setIsVisible(true);
        } else if (consent === 'true') {
            // If already accepted on load, trigger callback immediately if needed, 
            // but usually parent checks storage on mount too.
            // Here we just ensure banner is hidden.
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie_consent', 'true');
        setIsVisible(false);
        if (onAccept) onAccept();
    };

    const handleDecline = () => {
        localStorage.setItem('cookie_consent', 'false');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-50 animate-in slide-in-from-bottom-full duration-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                        <Cookie size={24} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Utilisation des cookies</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            Nous utilisons des cookies pour analyser le trafic et améliorer votre expérience.
                            Le cookie d'authentification est essentiel et ne peut pas être refusé.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={handleDecline}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Refuser les cookies tiers
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                    >
                        Accepter et fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
