import { useState, useEffect } from 'react';
import axios from 'axios';
import { FinanceProvider } from './context/FinanceContext';
import { AuthProvider, useAuth, API_URL } from './context/AuthContext';
import IncomeTable from './components/finance/IncomeTable';
import ExpenseTable from './components/finance/ExpenseTable';
import CategoryManager from './components/settings/CategoryManager';
import PlatformManager from './components/settings/PlatformManager';
import SettingsManager from './components/settings/SettingsManager';
import UserProfile from './components/settings/UserProfile';
import Layout from './components/layout/Layout';
import LandingPage from './components/landing/LandingPage';
import LogoIcon from './assets/logo/iconefiskeo.png';

// ...

import StatsDashboard from './components/dashboard/StatsDashboard';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import VerifyEmail from './components/auth/VerifyEmail';
import ForgotPassword from './components/auth/ForgotPassword';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminLogs from './components/admin/AdminLogs';
import GoalsDashboard from './components/dashboard/GoalsDashboard';
import RecapDashboard from './components/dashboard/RecapDashboard';

import UnverifiedBanner from './components/ui/UnverifiedBanner';
import CookieConsent from './components/ui/CookieConsent';

import { useNavigate, useLocation, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import PremiumPage from './components/payment/PremiumPage';
import PaymentResult from './components/payment/PaymentResult';
import MentionsLegales from './components/legal/MentionsLegales';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import Contact from './components/legal/Contact';
import { TourProvider, useTour } from '@reactour/tour';
import { tutorialSteps } from './components/tutorial/TutorialSteps';

function TutorialController() {
  const { currentStep, isOpen } = useTour();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isOpen) return;
    const step = tutorialSteps[currentStep];
    if (step?.path) {
      const currentPath = location.pathname + location.search;
      if (currentPath !== step.path) {
        navigate(step.path);
      }
    }
  }, [currentStep, isOpen, navigate, location.pathname, location.search]);

  return null;
}

function FinanceApp() {
  const { setIsOpen, setSteps, setCurrentStep } = useTour();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL or LocalStorage
  const queryTab = searchParams.get('tab');

  // Effect to set default tab in URL if missing on root
  useEffect(() => {
    if (location.pathname === '/' && !queryTab) {
      const savedTab = localStorage.getItem('active_tab') || 'income';
      setSearchParams({ tab: savedTab }, { replace: true });
    }
  }, [location.pathname, queryTab]);

  // Derived state for rendering
  const tab = queryTab || 'income';

  const setTab = (newTab) => {
    localStorage.setItem('active_tab', newTab);
    if (location.pathname !== '/') {
      navigate(`/?tab=${newTab}`);
    } else {
      setSearchParams({ tab: newTab });
    }
  };

  const { user, logout, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Track Visitor
  const trackVisit = async () => {
    if (localStorage.getItem('cookie_consent') !== 'true') return;
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
      visitorId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('visitor_id', visitorId);
    }
    try {
      await axios.post(`${API_URL}/analytics/visit`, { visitor_id: visitorId });
    } catch (err) {
      console.error("Analytics error:", err);
    }
  };

  useEffect(() => {
    trackVisit();
  }, []);

  useEffect(() => {
    // Check for verify token or reset token...
    const params = new URLSearchParams(window.location.search);
    if (params.get('token') && window.location.pathname === '/reset-password') {
      setIsLogin(false);
      setIsReset(true);
      setShowAuth(true); // Ensure auth view is shown if we have a reset token
    }
  }, []);

  // Auto-start tutorial for new users
  useEffect(() => {
    if (user && localStorage.getItem('fiskeo_first_login') === 'true') {
      localStorage.removeItem('fiskeo_first_login');
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        setIsOpen(true);
      }, 1000);
    }
  }, [user, setIsOpen]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Chargement...</div>;

  if (!user) {
    const publicPaths = ['/mentions-legales', '/privacy', '/contact'];
    const isPublicPath = publicPaths.includes(location.pathname);

    if (!showAuth && !isReset && !isPublicPath) {
      return (
        <LandingPage 
          onLogin={() => { setIsLogin(true); setShowAuth(true); }}
          onRegister={() => { setIsLogin(false); setShowAuth(true); }}
        />
      );
    }

    if (isPublicPath) {
      return (
        <Routes>
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      );
    }

    // Auth Screen
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <button 
          onClick={() => setShowAuth(false)}
          className="mb-8 text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2 group"
        >
          <div className="p-2 rounded-full group-hover:bg-indigo-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </div>
          Retour à l'accueil
        </button>
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-8">
            <img src={LogoIcon} alt="Fiskeo" className="h-12 w-auto mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Fiskeo</h1>
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
  // FIX: Moved MainDashboard logic to be inline or memoized to avoid re-definition on every render
  // which causes unmounting of children (like IncomeTable) when User context updates.
  const activeLayoutTab = getLayoutTab();


  return (
    <FinanceProvider>
      <Routes>
        <Route path="/" element={
          <Layout activeTab={activeLayoutTab} onTabChange={handleTabChange}>
            <UnverifiedBanner />

            {tab === 'income' && <IncomeTable onNavigateToConfig={() => setTab('config')} />}
            {tab === 'expense' && <ExpenseTable onNavigateToConfig={() => setTab('config')} />}
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
            {tab === 'goals' && <GoalsDashboard />}
            {tab === 'recap' && <RecapDashboard />}
            {tab === 'profile' && <UserProfile />}
            {tab === 'admin' && user.role === 'admin' && <AdminDashboard />}
            {tab === 'audit' && user.role === 'admin' && <AdminLogs />}
          </Layout>
        } />
        <Route path="/premium" element={
          <Layout activeTab="premium" onTabChange={(t) => { navigate('/'); handleTabChange(t); }}>
            <PremiumPage />
          </Layout>
        } />
        <Route path="/success" element={<PaymentResult />} />
        <Route path="/cancel" element={<PaymentResult />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/contact" element={<Contact />} />
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
      <TourProvider 
        steps={tutorialSteps}
        padding={0}
        styles={{
          popover: (base) => ({
            ...base,
            borderRadius: '1rem',
            padding: '1rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          }),
          mask: (base) => ({
            ...base,
            opacity: 0.7,
          }),
          maskArea: (base) => ({
             ...base,
             rx: 12,
          }),
          badge: (base) => ({
            ...base,
            backgroundColor: '#4f46e5',
          }),
          dot: (base, state) => ({
            ...base,
            backgroundColor: state.current === state.index ? '#4f46e5' : '#e2e8f0',
          }),
          close: (base) => ({
            ...base,
            color: '#94a3b8',
            '&:hover': { color: '#4f46e5' }
          })
        }}
        onClickMask={({ setIsOpen }) => setIsOpen(false)}
      >
        <TutorialController />
        <FinanceApp />
      </TourProvider>
    </AuthProvider>
  );
}

