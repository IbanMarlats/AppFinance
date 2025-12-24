import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Wallet,
    Receipt,
    Settings,
    User,
    LogOut,
    Menu,
    Shield,
    TrendingUp,
    Crown,
    Target,
    Calendar
} from 'lucide-react';

export default function Layout({ children, activeTab, onTabChange }) {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const NavItem = ({ id, icon: Icon, label, danger = false }) => (
        <button
            onClick={() => id ? onTabChange(id) : null}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
                ${activeTab === id
                    ? 'bg-indigo-50 text-indigo-700'
                    : danger
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
            `}
        >
            <Icon size={20} className={activeTab === id ? 'text-indigo-600' : danger ? 'text-red-500' : 'text-slate-400'} />
            {isSidebarOpen && <span>{label}</span>}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside
                className={`bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-20 transition-all duration-300 flex flex-col
                    ${isSidebarOpen ? 'w-64' : 'w-20'}
                `}
            >
                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-slate-100">
                    <div className="flex items-center gap-3 text-indigo-600 font-bold text-xl">
                        <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
                            {/* Classic Trend Logo */}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 6L13.5 14.5L8.5 9.5L2 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M22 6V10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M22 6H18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        {isSidebarOpen && <span className="tracking-tight text-slate-900">Fiskeo</span>}
                    </div>
                </div>

                {/* Nav Items */}
                <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {isSidebarOpen ? 'Menu' : '...'}
                    </div>

                    <NavItem id="dashboard" icon={LayoutDashboard} label="Tableau de bord" />
                    <NavItem id="income" icon={Wallet} label="Revenus" />
                    <NavItem id="expense" icon={Receipt} label="Dépenses" />
                    <NavItem id="goals" icon={Target} label="Objectifs" />
                    <NavItem id="recap" icon={Calendar} label="Bilans Mensuels" />

                    <div className="my-4 border-t border-slate-100 mx-3"></div>

                    <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {isSidebarOpen ? 'Compte' : '...'}
                    </div>

                    {user?.role === 'admin' && (
                        <NavItem id="admin" icon={Shield} label="Administration" />
                    )}
                    <NavItem id="profile" icon={User} label="Profil & Abo" />
                    <NavItem id="settings" icon={Settings} label="Paramètres" />
                </div>

                {/* User Footer */}
                <div className="p-4 border-t border-slate-100">
                    <div className={`flex items-center gap-3 mb-3 ${!isSidebarOpen && 'justify-center'}`}>
                        <div className="relative">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {user?.email?.charAt(0).toUpperCase()}
                            </div>
                            {user?.is_premium && (
                                <div className="absolute -top-1 -right-1 bg-amber-400 text-white rounded-full p-0.5 border-2 border-white shadow-sm flex items-center justify-center">
                                    <Crown size={10} fill="currentColor" />
                                </div>
                            )}
                        </div>
                        {isSidebarOpen && (
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
                                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={logout}
                        className={`w-full flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-xs font-medium
                            ${!isSidebarOpen && 'justify-center'}
                        `}
                    >
                        <LogOut size={16} />
                        {isSidebarOpen && "Déconnexion"}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
                {/* Top Header Mobile Toggle (Optional, mostly for mobile) */}
                <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10 px-6 flex items-center justify-between">
                    <button onClick={toggleSidebar} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-500">
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center gap-4">
                        {/* Right side header content (Notifications, Date, etc.) */}
                        <div className="text-sm text-slate-500 hidden md:block">
                            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </header>

                <div className="p-6 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
