import React from 'react';
import { User, Role } from '../types';
import DgDegresLogo from './DgDegresLogo';
import { 
  History, 
  UploadCloud, 
  FileCheck2, 
  BarChart3, 
  Settings, 
  LogOut, 
  Sparkles,
  Building2,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import { PREDEFINED_USERS } from '../firebase';

interface NavigationProps {
  currentUser: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSimulateUser: (user: User) => void;
}

export default function Navigation({ 
  currentUser, 
  onLogout, 
  activeTab, 
  setActiveTab,
  onSimulateUser 
}: NavigationProps) {

  const menuItems = [
    {
      id: 'carga',
      label: 'Cargar Banco',
      icon: UploadCloud,
      allowedRoles: ['Admin', 'Tesorera']
    },
    {
      id: 'transacciones',
      label: 'Validar Transacciones',
      icon: FileCheck2,
      allowedRoles: ['Admin', 'Cajera']
    },
    {
      id: 'reportes',
      label: 'Reportes y Cifras',
      icon: BarChart3,
      allowedRoles: ['Admin', 'Tesorera', 'Cajera', 'Asesor']
    },
    {
      id: 'admin',
      label: 'Administrador',
      icon: Settings,
      allowedRoles: ['Admin', 'Tesorera']
    }
  ];

  // Filter menu items by active user authorization
  const filteredItems = menuItems.filter(item => item.allowedRoles.includes(currentUser.role));

  return (
    <div id="sidebar-navigation" className="w-full lg:w-64 h-full bg-[#1A2D7C] text-white flex flex-col justify-between p-4 flex-shrink-0 overflow-hidden no-scrollbar">
      
      {/* Top Section */}
      <div>
        {/* Brand */}
        <div className="p-3 mb-4 border-b border-white/10 flex flex-col items-center">
          <DgDegresLogo lightMode={true} className="w-full max-w-[170px] h-auto drop-shadow" />
          <p className="text-[9px] opacity-75 mt-1.5 font-mono uppercase tracking-widest text-indigo-200">PLATA_FORMA CONCILIARIA</p>
        </div>

        {/* User Info Card */}
        <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <UserIcon className="h-3.5 w-3.5 text-[#F47920]" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase font-black tracking-widest text-slate-300">Usuario en Turno</p>
              <p className="text-xs font-semibold text-white truncate">{currentUser.nombre}</p>
              <p className="text-[9px] text-slate-300 truncate font-mono">{currentUser.email}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
              currentUser.role === 'Admin' ? 'bg-purple-500/20 text-purple-200' :
              currentUser.role === 'Tesorera' ? 'bg-blue-500/20 text-blue-200' :
              currentUser.role === 'Asesor' ? 'bg-amber-500/20 text-amber-200' :
              'bg-emerald-500/30 text-emerald-200'
            }`}>
              {currentUser.role}
            </span>
            {currentUser.sede && (
              <span className="text-[8px] uppercase tracking-wider text-slate-300 flex items-center gap-1 font-bold font-space">
                <Building2 className="h-2.5 w-2.5 text-[#F47920]" />
                {currentUser.sede}
              </span>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {filteredItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 p-2.5 rounded-lg transition-all text-left uppercase text-[10px] tracking-wider font-bold font-space ${
                  isActive 
                    ? 'bg-white/10 text-white border-l-4 border-[#F47920]' 
                    : 'text-white opacity-60 hover:opacity-100'
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Logout */}
      <div className="mt-4">
        {/* Logout */}
        <button
          id="btn-nav-logout"
          onClick={onLogout}
          className="w-full flex items-center space-x-3 p-2.5 rounded-lg text-[10px] tracking-wider uppercase font-bold text-rose-300 hover:text-white hover:bg-rose-500/10 transition-all font-space"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

    </div>
  );
}
