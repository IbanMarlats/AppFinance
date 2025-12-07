import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Login({ onSwitch }) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="card auth-card">
            <h2>Connexion</h2>
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
                {error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
                <button type="submit" className="primary" style={{ width: '100%', marginTop: '1rem' }}>
                    Se connecter
                </button>
            </form>
            <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Pas de compte ?{' '}
                <span onClick={onSwitch} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                    S'inscrire
                </span>
            </p>
        </div>
    );
}
