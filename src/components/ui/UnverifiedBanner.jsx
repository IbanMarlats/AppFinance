import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function UnverifiedBanner() {
    const { user } = useAuth();
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');

    if (!user || user.is_verified) return null;

    const handleResend = async () => {
        setSending(true);
        setMessage('');
        try {
            await axios.post('http://localhost:3001/api/auth/resend-verification', { email: user.email });
            setMessage('Email envoyé !');
        } catch (err) {
            setMessage('Erreur lors de l\'envoi');
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{
            backgroundColor: 'var(--warning-bg, #fff3cd)',
            color: 'var(--warning-text, #856404)',
            padding: '0.75rem',
            textAlign: 'center',
            borderBottom: '1px solid var(--warning-border, #ffeeba)',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem'
        }}>
            <span>
                Votre email ({user.email}) n'est pas vérifié.
            </span>
            <button
                onClick={handleResend}
                disabled={sending}
                style={{
                    backgroundColor: 'transparent',
                    border: '1px solid currentColor',
                    color: 'currentColor',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9em'
                }}
            >
                {sending ? 'Envoi...' : 'Renvoyer l\'email'}
            </button>
            {message && <span style={{ fontWeight: 'bold' }}>{message}</span>}
        </div>
    );
}
