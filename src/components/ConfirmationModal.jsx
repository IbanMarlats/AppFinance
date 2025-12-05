export default function ConfirmationModal({ isOpen, onClose, onConfirm, message }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)'
        }}>
            <div className="card" style={{
                minWidth: '300px',
                maxWidth: '400px',
                padding: '2rem',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                animation: 'slideIn 0.2s ease-out'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Confirmation</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{message}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button className="btn-action" onClick={onClose} style={{ minWidth: '80px' }}>Annuler</button>
                    <button className="danger btn-action" onClick={onConfirm} style={{ minWidth: '80px' }}>Supprimer</button>
                </div>
            </div>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
