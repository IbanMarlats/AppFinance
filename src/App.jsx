import { useState, useEffect } from 'react';
import axios from 'axios';
import { FinanceProvider } from './context/FinanceContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import IncomeTable from './components/IncomeTable';
import ExpenseTable from './components/ExpenseTable';
import CategoryManager from './components/CategoryManager';
import PlatformManager from './components/PlatformManager';
import SettingsManager from './components/SettingsManager';
import UserProfile from './components/UserProfile';
import Layout from './components/Layout';

// ...

import StatsDashboard from './components/StatsDashboard';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import VerifyEmail from './components/auth/VerifyEmail';
import AdminDashboard from './components/AdminDashboard';
import AdminLogs from './components/AdminLogs';

import UnverifiedBanner from './components/UnverifiedBanner';

function FinanceApp() {
  const [tab, setTabState] = useState(() => localStorage.getItem('active_tab') || 'income');

  const setTab = (newTab) => {
    setTabState(newTab);
    localStorage.setItem('active_tab', newTab);
  };
  const { user, logout, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  // Track Visitor
  useEffect(() => {
    const trackVisit = async () => {
      let visitorId = localStorage.getItem('visitor_id');
      if (!visitorId) {
        visitorId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('visitor_id', visitorId);
      }

      try {
        await axios.post('http://localhost:3001/api/analytics/visit', { visitor_id: visitorId });
      } catch (err) {
        // Silently fail for analytics
        console.error("Analytics error:", err);
      }
    };
    trackVisit();
  }, []);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Chargement...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Finance<span className="text-indigo-600">AI</span></h1>
            <p className="text-slate-500">Gestion financière simplifiée pour pros</p>
          </div>

          {isLogin ? (
            <Login onSwitch={() => setIsLogin(false)} />
          ) : (
            <Register onSwitch={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    );
  }

  // Rewrite Active Tab check
  // The Layout sends 'dashboard' for stats, 'settings' for config
  const handleTabChange = (newTab) => {
    // Map layout IDs to internal tabs if needed, or unify them.
    // Layout: dashboard, income, expense, admin, profile, settings
    // Internal: stats, income, expense, admin, profile, config

    if (newTab === 'dashboard') setTab('stats');
    else if (newTab === 'settings') setTab('config');
    else setTab(newTab);
  };

  // Reverse map for layout active state
  const getLayoutTab = () => {
    if (tab === 'stats') return 'dashboard';
    if (tab === 'config') return 'settings';
    return tab;
  };

  return (
    <FinanceProvider>
      <Layout activeTab={getLayoutTab()} onTabChange={handleTabChange}>
        <UnverifiedBanner />

        {tab === 'income' && <IncomeTable />}
        {tab === 'expense' && <ExpenseTable />}
        {tab === 'config' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Configuration</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PlatformManager />
              <CategoryManager />
              <div className="xl:col-span-2">
                <SettingsManager />
              </div>
            </div>
          </div>
        )}
        {tab === 'stats' && <StatsDashboard />}
        {tab === 'profile' && <UserProfile />}
        {tab === 'admin' && user.role === 'admin' && <AdminDashboard />}

        {/* Audit Logs moved inside Admin or separate? Layout doesn't have Audit button by default yet. */}
        {/* Let's keep audit accessible via admin dashboard probably, or separate tab if link exists. */}
        {tab === 'audit' && user.role === 'admin' && <AdminLogs />}
      </Layout>
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

