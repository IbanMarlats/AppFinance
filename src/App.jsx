import { useState, useEffect } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import IncomeTable from './components/IncomeTable';
import ExpenseTable from './components/ExpenseTable';
import CategoryManager from './components/CategoryManager';
import PlatformManager from './components/PlatformManager';

// ...

import StatsDashboard from './components/StatsDashboard';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import VerifyEmail from './components/auth/VerifyEmail';

import UnverifiedBanner from './components/UnverifiedBanner';

function FinanceApp() {
  const [tab, setTab] = useState('income');
  const { user, logout, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (window.location.pathname.startsWith('/api/auth/verify/')) {
      // In local flow, maybe we want a frontend route like /verify/:token
      // But backend sends link to /api/auth/verify/:token directly?
      // Ah, the plan said backend sends link. But usually we want frontend to handle it.
      // Let's assume the user clicks the link from console which points to backend API directly.
      // Backend API returns HTML. So we don't need frontend route for that if backend handles it.
      // Wait, my backend implementation returns "<h1>Email Verified!</h1>".
      // So actually, no frontend change needed for verification logic itself if we rely on backend response.

      // HOWEVER, the user might want a cleaner experience. 
      // For now, let's stick to the backend returning the HTML as implemented in index.js step 40.
      // "res.send("<h1>Email Verified!</h1><p>You can close this window...</p>");"
      // So I don't strictly need a React route for this specific implementation.
    }
  }, []);

  if (loading) return <div className="container">Chargement...</div>;

  // Clean URL check for potentially other frontend routes? 
  // For now let's keep it simple.

  if (!user) {
    return (
      <div className="container" style={{ maxWidth: '400px', marginTop: '10vh' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Finance Micro</h1>
        {isLogin ? (
          <Login onSwitch={() => setIsLogin(false)} />
        ) : (
          <Register onSwitch={() => setIsLogin(true)} />
        )}
      </div>
    );
  }

  return (
    <FinanceProvider>
      <div className="container">
        <UnverifiedBanner />
        <header className="flex justify-between" style={{ marginBottom: '3rem', marginTop: '1rem', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              Finance Micro
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Gestion simple de revenus et charges</p>
          </div>
          <button onClick={logout} style={{ fontSize: '0.85em' }}>
            Déconnexion
          </button>
        </header>

        <div className="nav">
          <div className={`nav-item ${tab === 'income' ? 'active' : ''}`} onClick={() => setTab('income')}>
            Revenus
          </div>
          <div className={`nav-item ${tab === 'expense' ? 'active' : ''}`} onClick={() => setTab('expense')}>
            Dépenses
          </div>
          <div className={`nav-item ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>
            Configuration
          </div>
          <div className={`nav-item ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
            Statistiques
          </div>
        </div>

        <main>
          {tab === 'income' && <IncomeTable />}
          {tab === 'expense' && <ExpenseTable />}
          {tab === 'config' && (
            <div className="grid gap-4">
              <PlatformManager />
              <CategoryManager />
            </div>
          )}
          {tab === 'stats' && <StatsDashboard />}
        </main>
      </div>
    </FinanceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FinanceApp />
    </AuthProvider>
  );
}

