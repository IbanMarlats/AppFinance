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
        <div className="card auth-card">
            <h2>Inscription</h2>
            <form onSubmit={handleSubmit} className="grid">
                <div>
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Mot de passe</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Type de compte</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                    >
                        <option value="" disabled>Sélectionnez un rôle</option>
                        <option value="freelance">Freelance</option>
                        <option value="ecommerce">E-commerce</option>
                        <option value="perso">Personnel</option>
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        checked={newsletter}
                        onChange={(e) => setNewsletter(e.target.checked)}
                        id="newsletter"
                    />
                    <label htmlFor="newsletter" style={{ fontSize: '0.9rem', color: '#666', cursor: 'pointer' }}>
                        M'inscrire à la newsletter
                    </label>
                </div>
                {error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
                <button type="submit" className="primary" style={{ width: '100%', marginTop: '1rem' }}>
                    S'inscrire
                </button>
            </form>
            <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Déjà un compte ?{' '}
                <span onClick={onSwitch} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                    Se connecter
                </span>
            </p>
        </div>
    );
}
