import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:3001/api/admin/logs', { withCredentials: true });
            setLogs(res.data);
            setError('');
        } catch (err) {
            console.error('Error fetching logs:', err);
            setError('Impossible de charger les logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        // Refresh every 30s
        const interval = setInterval(fetchLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && logs.length === 0) return <div className="text-gray-500 text-sm">Chargement des logs...</div>;

    if (error) return <div className="text-red-500 text-sm">{error}</div>;

    return (
        <div className="card" style={{ marginTop: '2rem', border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Journal d'activités (Audit)</h3>
                <button
                    onClick={fetchLogs}
                    className="text-sm text-blue-600 hover:text-blue-800"
                    style={{ fontSize: '0.85rem' }}
                >
                    Actualiser
                </button>
            </div>

            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ fontSize: '0.85rem' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Description</th>
                            <th>IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>
                                    {new Date(log.created_at).toLocaleString('fr-FR')}
                                </td>
                                <td>
                                    <span className={`badge ${log.event_type === 'USER_REGISTER' ? 'bg-green-100 text-green-700' :
                                            log.event_type === 'SETTINGS_UPDATE' ? 'bg-amber-100 text-amber-700' :
                                                log.event_type === 'LOGIN_FAIL' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-700'
                                        }`}>
                                        {log.event_type}
                                    </span>
                                </td>
                                <td>{log.description}</td>
                                <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{log.ip_address}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center text-gray-400 py-4">Aucun événement récent</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
