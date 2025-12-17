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
import ForgotPassword from './components/auth/ForgotPassword';
import AdminDashboard from './components/AdminDashboard';
import AdminLogs from './components/AdminLogs';
import GoalsDashboard from './components/GoalsDashboard';

import UnverifiedBanner from './components/UnverifiedBanner';
import CookieConsent from './components/CookieConsent';

import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import PremiumPage from './components/PremiumPage';
import PaymentResult from './components/PaymentResult';

function FinanceApp() {
  const [tab, setTabState] = useState(() => localStorage.getItem('active_tab') || 'income');
  const location = useLocation();
  const navigate = useNavigate();

  const setTab = (newTab) => {
    // If we are on a route like /premium, navigation to a tab should maybe redirect to / ?
    // Or we keep simple hash-like tab navigation on home path.
    if (location.pathname !== '/') {
      navigate('/');
    }
    setTabState(newTab);
    localStorage.setItem('active_tab', newTab);
  };

  const { user, logout, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Track Visitor
  const trackVisit = async () => {
    if (localStorage.getItem('cookie_consent') !== 'true') return;
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
      visitorId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('visitor_id', visitorId);
    }
    try {
      await axios.post('http://localhost:3001/api/analytics/visit', { visitor_id: visitorId });
    } catch (err) {
      console.error("Analytics error:", err);
    }
  };

  useEffect(() => {
    trackVisit();
  }, []);

  useEffect(() => {
    // Check for verify token or reset token...
    // Reset logic handled below or via route? 
    // Existing logic seems to handle password reset via query params on same page.
    const params = new URLSearchParams(window.location.search);
    if (params.get('token') && window.location.pathname === '/reset-password') {
      setIsLogin(false);
      setIsReset(true);
    }
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Chargement...</div>;

  if (!user) {
    // Public Routes or Auth Screen
    // Maybe allow /premium to be seen public? No, need user to link payment.
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Finance<span className="text-indigo-600">AI</span></h1>
            <p className="text-slate-500">Gestion financière simplifiée pour pros</p>
          </div>
          {isReset ? (
            <ForgotPassword onDone={() => { setIsReset(false); setIsLogin(true); navigate('/'); }} />
          ) : isLogin ? (
            <Login onSwitch={() => setIsLogin(false)} onForgot={() => setIsReset(true)} />
          ) : (
            <Register onSwitch={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    );
  }

  // Rewrite Active Tab check
  const handleTabChange = (newTab) => {
    if (newTab === 'dashboard') setTab('stats');
    else if (newTab === 'settings') setTab('config');
    else setTab(newTab);
  };

  const getLayoutTab = () => {
    // If we are on /premium, maybe highlight none or special?
    if (location.pathname === '/premium') return 'premium'; // Add this to Sidebar?

    if (tab === 'stats') return 'dashboard';
    if (tab === 'config') return 'settings';
    return tab;
  };

  // Main Content
  const MainDashboard = () => (
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
      {tab === 'goals' && <GoalsDashboard />}
      {tab === 'profile' && <UserProfile />}
      {tab === 'admin' && user.role === 'admin' && <AdminDashboard />}
      {tab === 'audit' && user.role === 'admin' && <AdminLogs />}
    </Layout>
  );

  return (
    <FinanceProvider>
      <Routes>
        <Route path="/" element={<MainDashboard />} />
        <Route path="/premium" element={
          <Layout activeTab="premium" onTabChange={(t) => { navigate('/'); handleTabChange(t); }}>
            <PremiumPage />
          </Layout>
        } />
        <Route path="/success" element={<PaymentResult />} />
        <Route path="/cancel" element={<PaymentResult />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsent onAccept={trackVisit} />
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

