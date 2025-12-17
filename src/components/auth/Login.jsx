import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function Login({ onSwitch, onForgot }) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) {
            setError('Email requis');
            return;
        }

        try {
            await login(email.trim(), password);
            // Force navigation to home to clear any residual URL params (like token)
            // Although App.jsx handles state, clean URL is better.
            window.history.replaceState({}, document.title, "/");
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Connexion</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                <button type="submit" className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm focus:ring-4 focus:ring-indigo-200">
                    Se connecter
                </button>
                <button type="button" onClick={onForgot} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium block text-right mt-1">
                    Mot de passe oublié ?
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">
                Pas de compte ?{' '}
                <button onClick={onSwitch} className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline">
                    S'inscrire
                </button>
            </p>
        </div>
    );
}
