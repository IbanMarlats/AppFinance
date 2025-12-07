import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';

export default function CategoryManager() {
    const { categories, addCategory, deleteCategory } = useFinance();
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('#3b82f6'); // Default blue

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newCatName) return;
        addCategory({ name: newCatName, color: newCatColor });
        setNewCatName('');
    };

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <h2>Catégories de Dépenses</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Gérez vos catégories personnalisées.</p>

            <form onSubmit={handleAdd} className="flex space-x-2" style={{ marginBottom: '1.5rem', alignItems: 'center' }}>
                <input
                    placeholder="Nouvelle catégorie..."
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    style={{ flex: 1 }}
                />
                <input
                    type="color"
                    value={newCatColor}
                    onChange={e => setNewCatColor(e.target.value)}
                    style={{ height: '40px', width: '50px', padding: 0, border: 'none', cursor: 'pointer' }}
                    title="Choisir une couleur"
                />
                <button type="submit" className="primary btn-action">Ajouter</button>
            </form>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Badge</th>
                            <th>Nom</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(cat => (
                            <tr key={cat.id}>
                                <td style={{ width: '80px' }}>
                                    <span className="badge" style={{ backgroundColor: cat.color, color: '#fff' }}>
                                        {cat.name.substring(0, 2).toUpperCase()}
                                    </span>
                                </td>
                                <td>{cat.name}</td>
                                <td className="action-cell">
                                    <button
                                        className="danger btn-action btn-icon"
                                        onClick={() => deleteCategory(cat.id)}
                                        title="Supprimer"
                                    >
                                        X
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune catégorie personnalisée</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
