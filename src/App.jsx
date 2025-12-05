import { useState } from 'react';
import { FinanceProvider } from './context/FinanceContext';
import IncomeTable from './components/IncomeTable';
import ExpenseTable from './components/ExpenseTable';
import PlatformManager from './components/PlatformManager';
import StatsDashboard from './components/StatsDashboard';

function FinanceApp() {
  const [tab, setTab] = useState('income');

  return (
    <div className="container">
      <header style={{ marginBottom: '3rem', marginTop: '1rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          Finance Micro
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Gestion simple de revenus et charges</p>
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
        {tab === 'config' && <PlatformManager />}
        {tab === 'stats' && <StatsDashboard />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <FinanceApp />
    </FinanceProvider>
  );
}
