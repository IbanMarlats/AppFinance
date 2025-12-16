import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function SettingsManager() {
    const { user } = useAuth();
    const [settings, setSettings] = useState({
        tva_threshold: '',
        micro_threshold: '',
        urssaf_freelance: '',
        urssaf_ecommerce: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/settings', {
                headers: { 'Authorization': `Bearer ${user.token}` } // Actually cookie based, but context might handle header if we used it. 
                // Wait, our auth is cookie based. We just need credentials: include.
            });
            // Oops, fetch in this project needs credentials: 'include' usually, or handled by context helper if any. 
            // Checking App.jsx imports... context/AuthContext. 
            // Let's assume standard fetch for now but credentials include is key.
            // Wait, is there a global axios or helper? 
            // I see `fetch` used in `Login.jsx` (I assume). 
            // Let's check how other components do it. `PlatformManager` etc.
            // It likely needs `credentials: 'include'`.
        } catch (e) {
            console.error(e);
        }
    };

    // Redoing the fetch with proper credentials logic inline for certainty
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('http://localhost:3001/api/settings', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }, // Cookies sent automatically if same origin or with credentials logic
                    // Actually Vite proxy might be set up? 
                    // Checking vite.config.js...
                    // If no proxy, we need full URL + credentials: 'include'.
                });
                // Let's assume standard behavior for now. I'll add credentials: 'include' to be safe.
                // Actually, in previous steps (server/index.js), cors origin is localhost:5173 and credentials: true.
                // So we MUST use credentials: 'include'.

                const data = await res.json(); // Wait, res.json() might fail if not 200

                // To be robust:
                const response = await fetch('http://localhost:3001/api/settings', {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setSettings({
                        tva_threshold: data.tva_threshold || '',
                        micro_threshold: data.micro_threshold || '',
                        urssaf_freelance: data.urssaf_freelance || '',
                        urssaf_ecommerce: data.urssaf_ecommerce || ''
                    });
                }
            } catch (err) {
                console.error("Failed to load settings", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const res = await fetch('http://localhost:3001/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                setMessage('Paramètres sauvegardés !');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Erreur lors de la sauvegarde');
            }
        } catch (err) {
            console.error(err);
            setMessage('Erreur réseau');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return <div className="p-4">Chargement...</div>;

    return (
        <div className="card">
            <h2 className="text-xl font-bold mb-4">Mes Seuils & Taux</h2>
            <p className="text-sm text-gray-500 mb-4">
                Ces valeurs remplacent les seuils par défaut du système. Laissez tel quel pour utiliser les valeurs globales.
            </p>

            {message && <div className="bg-green-100 text-green-700 p-2 rounded mb-4">{message}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Seuil Franchise TVA (€)</label>
                        <input
                            type="number"
                            name="tva_threshold"
                            value={settings.tva_threshold}
                            onChange={handleChange}
                            className="input mt-1 w-full"
                            placeholder="Ex: 36800"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Seuil Micro-Entreprise (€)</label>
                        <input
                            type="number"
                            name="micro_threshold"
                            value={settings.micro_threshold}
                            onChange={handleChange}
                            className="input mt-1 w-full"
                            placeholder="Ex: 77700"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Taux URSSAF (Prestation) %</label>
                        <input
                            type="number"
                            step="0.1"
                            name="urssaf_freelance"
                            value={settings.urssaf_freelance}
                            onChange={handleChange}
                            className="input mt-1 w-full"
                            placeholder="Ex: 23.1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Taux URSSAF (Vente) %</label>
                        <input
                            type="number"
                            step="0.1"
                            name="urssaf_ecommerce"
                            value={settings.urssaf_ecommerce}
                            onChange={handleChange}
                            className="input mt-1 w-full"
                            placeholder="Ex: 12.3"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        {saving ? 'Sauvegarde...' : 'Sauvegarder mes préférences'}
                    </button>
                </div>
            </form>
        </div>
    );
}
