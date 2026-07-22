import React, { useState, useEffect } from 'react';
import { getCurrentUser, logoutUser, getTransactions, subscribeToDatabase, checkFirebaseStatus } from './firebase';
import { User, Transaction } from './types';
import Login from './components/Login';
import Navigation from './components/Navigation';
import Carga from './components/Carga';
import Transacciones from './components/Transacciones';
import Reportes from './components/Reportes';
import AdminPanel from './components/AdminPanel';
import Manuales from './components/Manuales';
import ChatSoporte from './components/ChatSoporte';
import GoogleMeetCalling from './components/GoogleMeetCalling';
import { getColombiaDateTime, formatDateHuman, formatTime12h } from './utils/formato';
import { 
  Building2, 
  Wifi, 
  Sparkles,
  HelpCircle,
  Database,
  Menu,
  X,
  Clock
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [transactions, setTransactions] = useState<Transaction[]>(getTransactions());
  const [activeTab, setActiveTab] = useState<string>('reportes'); // Defaults to reportes
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<{ dateStr: string; dateTimeStr: string }>(getColombiaDateTime());

  // Real-time ticking clock for general verification
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getColombiaDateTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time listener subscription to simulate Firestore active database updates!
  useEffect(() => {
    // Sync initial state on load
    setTransactions(getTransactions());

    // Subscribe to any updates (triggered on charge, validation, cleanup, or revert)
    const unsubscribe = subscribeToDatabase(() => {
      setTransactions(getTransactions());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Whenever user changes, change default focusing tab based on role privileges
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'Admin') {
        setActiveTab('admin');
      } else if (currentUser.role === 'Tesorera') {
        setActiveTab('carga');
      } else if (currentUser.role === 'Cajera') {
        setActiveTab('transacciones');
      } else {
        setActiveTab('reportes');
      }
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // Immediate role simulation trigger for review fluid exploration
  const handleSimulateUser = (user: User) => {
    setCurrentUser(user);
    setMobileMenuOpen(false);
  };

  const handleRefreshData = () => {
    setTransactions(getTransactions());
  };

  // Render Login screen if not authenticated
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Get status of current mock cloud connection
  const firebaseHealth = checkFirebaseStatus();

  return (
    <div id="app-root-shell" className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 flex flex-col font-sans">
      
      {/* Top Mobile Menu Header */}
      <header className="lg:hidden bg-[#1A2D7C] text-white p-4 flex items-center justify-between border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#F47920]" />
          <span className="font-sans font-bold text-base tracking-tight text-white">Transferencias</span>
        </div>
        
        <button 
          id="btn-mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-all text-white"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Main Container Grid */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        
        {/* Navigation panel (Sidebar on Desktop, drawer on Mobile) */}
        <div className={`lg:flex ${mobileMenuOpen ? 'fixed inset-0 top-[57px] z-40' : 'hidden'} lg:block lg:relative w-full lg:w-64 h-[calc(100vh-57px)] lg:h-full lg:max-h-full overflow-hidden no-scrollbar bg-[#1A2D7C] flex-shrink-0`}>
          <Navigation 
            currentUser={currentUser}
            onLogout={handleLogout}
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              setMobileMenuOpen(false); // Auto close mobile
            }}
            onSimulateUser={handleSimulateUser}
          />
        </div>

        {/* Core Content space */}
        <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col justify-between lg:h-full">
          
          <div className="flex-1">
            {/* Top Interactive Info Banner */}
            <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shadow-sm">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-indigo-700 animate-pulse" />
                    {firebaseHealth.status}
                  </span>
                </div>

                {/* Reloj en Tiempo Real - Zona Horaria Colombia */}
                <div className="flex items-center gap-2 text-xs font-bold text-[#1A2D7C] bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl shadow-sm animate-in fade-in duration-300">
                  <Clock className="h-4 w-4 text-[#1A2D7C] animate-spin-slow" style={{ animationDuration: '8s' }} />
                  <span className="font-mono font-black tracking-wide bg-[#1A2D7C] text-white px-2 py-0.5 rounded text-[11px]">
                    {formatTime12h(currentTime.dateTimeStr.split(' ')[1])}
                  </span>
                  <span className="text-slate-400 font-normal">|</span>
                  <span className="text-slate-600 text-[10.5px] font-medium">{formatDateHuman(currentTime.dateStr)} (Bogotá, CO)</span>
                </div>
              </div>

              {/* Instant sandbox reminder notification */}
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 font-medium">
                <Wifi className="h-3.5 w-3.5 text-[#F47920]" />
                <span>Base de Datos Firestore • Sincronización Interactiva</span>
              </div>
            </div>

            {/* Dashboard active view */}
            <div id="active-view-container" className="animate-fade-in">
              {activeTab === 'carga' && (
                <Carga currentUser={currentUser} onRefreshData={handleRefreshData} />
              )}
              {activeTab === 'transacciones' && (
                <Transacciones 
                  currentUser={currentUser} 
                  transactions={transactions} 
                  onRefreshData={handleRefreshData} 
                />
              )}
              {activeTab === 'reportes' && (
                <Reportes transactions={transactions} currentUser={currentUser} onRefreshData={handleRefreshData} />
              )}
              {activeTab === 'admin' && (
                <AdminPanel 
                  currentUser={currentUser} 
                  transactions={transactions} 
                  onRefreshData={handleRefreshData} 
                />
              )}
              {activeTab === 'manuales' && (
                <Manuales currentUser={currentUser} />
              )}
            </div>
          </div>

          {/* Humble clean system footer */}
          <footer className="bg-white border-t border-slate-200 py-3.5 px-6 text-center text-[11px] text-slate-400">
            <div>
              © 2026 <strong>Transferencias S.A.S.</strong> • Validación y Control Contra Partidas QR de Tiendas Físicas
            </div>
          </footer>

        </main>

      </div>
      <ChatSoporte currentUser={currentUser} />
      <GoogleMeetCalling currentUser={currentUser} />
    </div>
  );
}
