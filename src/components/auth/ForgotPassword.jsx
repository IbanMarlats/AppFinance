import { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ResetPassword({ onDone }) {
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState('request'); // 'request' or 'reset'
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Check URL for token on mount
    // Check URL for token on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        if (urlToken) {
            setToken(urlToken);
            setStep('reset');
        }
    }, []);

    const handleRequest = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await axios.post('http://localhost:3001/api/auth/request-password-reset', { email });
            setMessage(res.data.message);
        } catch (err) {
            // Generic error to avoid enumeration if security desired, or specific if internal app
            setError(err.response?.data?.error || "Une erreur est survenue");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (newPassword.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères');
            return;
        }
        setLoading(true);

        try {
            await axios.post('http://localhost:3001/api/auth/reset-password', { token, newPassword });
            setMessage("Mot de passe modifié avec succès ! Vous pouvez vous connecter.");
            setTimeout(() => {
                onDone(); // Switch back to login
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || "Échec de la réinitialisation");
        } finally {
            setLoading(false);
        }
    };

    if (step === 'request') {
        return (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Mot de passe oublié</h2>
                <p className="text-slate-500 text-sm text-center mb-6">Entrez votre email pour recevoir un lien de réinitialisation.</p>

                {message ? (
                    <div className="p-4 bg-green-50 text-green-700 rounded-lg text-center mb-6 border border-green-100">
                        {message}
                    </div>
                ) : (
                    <form onSubmit={handleRequest} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                required
                            />
                        </div>
                        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">{error}</div>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm focus:ring-4 focus:ring-indigo-200 disabled:opacity-50"
                        >
                            {loading ? 'Envoi...' : 'Envoyer le lien'}
                        </button>
                    </form>
                )}
                <button onClick={onDone} className="mt-6 w-full text-center text-sm text-indigo-600 font-bold hover:text-indigo-700 hover:underline">
                    Retour à la connexion
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Nouveau mot de passe</h2>
            <form onSubmit={handleReset} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all pr-10"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                        >
                            {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                    </div>
                </div>
                {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">{error}</div>}
                {message && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 text-center">{message}</div>}
                {!message && (
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm focus:ring-4 focus:ring-indigo-200 disabled:opacity-50"
                    >
                        {loading ? 'Modification...' : 'Modifier le mot de passe'}
                    </button>
                )}
            </form>
            <button onClick={() => { setStep('request'); onDone(); }} className="mt-6 w-full text-center text-sm text-indigo-600 font-bold hover:text-indigo-700 hover:underline">
                Retour à la connexion
            </button>
        </div>
    );
}
