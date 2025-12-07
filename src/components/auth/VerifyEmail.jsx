import { useEffect, useState } from 'react';
import axios from 'axios';

export default function VerifyEmail() {
    const [status, setStatus] = useState('Verifying...');

    useEffect(() => {
        const verify = async () => {
            const token = window.location.pathname.split('/').pop();
            try {
                await axios.get(`http://localhost:3001/api/auth/verify/${token}`);
                setStatus('Email vérifié avec succès ! Vous pouvez fermer cette page.');
            } catch (err) {
                setStatus('Lien invalide ou expiré.');
            }
        };
        verify();
    }, []);

    return (
        <div className="container" style={{ textAlign: 'center', marginTop: '10vh' }}>
            <h1>Vérification Email</h1>
            <p>{status}</p>
        </div>
    );
}
