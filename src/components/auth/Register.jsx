import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Register({ onSwitch }) {
    const { register } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('');
    const [newsletter, setNewsletter] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Adresse email invalide');
            return;
        }

        try {
            await register(email, password, role, newsletter);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl max-w-md w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Inscription</h2>
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
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type de compte</label>
                    <div className="relative">
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            required
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none bg-white"
                        >
                            <option value="" disabled>Sélectionnez un rôle</option>
                            <option value="freelance">Freelance (Prestation Intellectuelle)</option>
                            <option value="artisan">Artisan / Créateur</option>
                            <option value="creator">Créateur de Contenu / Influenceur</option>
                            <option value="field_service">Prestataire "Terrain" (Coach, BTP, etc.)</option>
                            <option value="ecommerce">E-commerce</option>
                            <option value="perso">Personnel</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={newsletter}
                        onChange={(e) => setNewsletter(e.target.checked)}
                        id="newsletter"
                        className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 w-4 h-4"
                    />
                    <label htmlFor="newsletter" className="text-sm text-slate-600 cursor-pointer select-none">
                        M'inscrire à la newsletter
                    </label>
                </div>
                {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">{error}</div>}
                <button type="submit" className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm focus:ring-4 focus:ring-indigo-200">
                    S'inscrire
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">
                Déjà un compte ?{' '}
                <button onClick={onSwitch} className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline">
                    Se connecter
                </button>
            </p>
        </div>
    );
}
