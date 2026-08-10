import React from 'react';
import { SystemConfig } from '../types';
import DgDegresLogo from './DgDegresLogo';
import { RefreshCw, Wrench, ShieldAlert, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { getColombiaDateTime, formatDateHuman, formatTime12h } from '../utils/formato';

interface PantallaMantenimientoProps {
  systemConfig: SystemConfig;
  onAdminLoginRequest?: () => void;
}

export default function PantallaMantenimiento({ systemConfig, onAdminLoginRequest }: PantallaMantenimientoProps) {
  const now = getColombiaDateTime();

  const handleManualRefresh = () => {
    window.location.reload();
  };

  return (
    <div id="pantalla-mantenimiento-overlay" className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#0B132B] via-[#1A2D7C] to-[#0A1128] text-white flex flex-col items-center justify-center p-6 overflow-y-auto">
      {/* Background ambient decorative glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F47920]/15 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-xl w-full bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col items-center text-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Logo */}
        <div className="mb-6 bg-white/95 p-4 rounded-2xl shadow-lg border border-white/20">
          <DgDegresLogo className="h-12 w-auto" />
        </div>

        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 bg-[#F47920]/20 text-[#F47920] border border-[#F47920]/40 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 animate-pulse">
          <Wrench className="h-4 w-4 animate-spin-slow" style={{ animationDuration: '6s' }} />
          <span>Sistema en Mantenimiento y Actualización</span>
        </div>

        {/* Headline */}
        <h1 className="text-2xl md:text-3xl font-black font-sans tracking-tight text-white mb-3 leading-tight">
          Estamos Aplicando Mejoras en el Aplicativo
        </h1>

        {/* Custom message or standard description */}
        <p className="text-slate-200 text-sm leading-relaxed mb-6 font-medium max-w-lg">
          {systemConfig.maintenanceMessage || 
            'El equipo de administración está realizando una actualización importante en la plataforma. Por seguridad, el acceso a cajeras y tesoreras está temporalmente en pausa.'}
        </p>

        {/* Info Box */}
        <div className="w-full bg-slate-900/60 border border-white/10 rounded-2xl p-5 mb-6 text-left space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <strong className="text-white block font-bold mb-0.5">Tus datos y registros están 100% seguros</strong>
              No perderás ninguna transacción ni recibo guardado previamente.
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2 border-t border-white/10">
            <RefreshCw className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '4s' }} />
            <div className="text-xs text-slate-300">
              <strong className="text-white block font-bold mb-0.5">Actualización e inicio automático</strong>
              Tan pronto el administrador desactive el modo mantenimiento, esta pantalla detectará la señal y <span className="text-sky-300 font-bold">cargará la nueva versión automáticamente</span>.
            </div>
          </div>
        </div>

        {/* Metadata section */}
        {systemConfig.activatedAt && (
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-300 bg-white/5 px-4 py-2 rounded-xl border border-white/10 mb-6 font-mono">
            <Clock className="h-3.5 w-3.5 text-[#F47920]" />
            <span>Inicio: {systemConfig.activatedAt} (Hora Col)</span>
            {systemConfig.activatedBy && (
              <>
                <span>•</span>
                <span>Por: {systemConfig.activatedBy}</span>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <button
            id="btn-manual-refresh-maintenance"
            onClick={handleManualRefresh}
            className="w-full sm:w-auto bg-[#F47920] hover:bg-[#d9640f] text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer transform active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Comprobar / Refrescar
          </button>

          {onAdminLoginRequest && (
            <button
              id="btn-[#admin-login-maintenance]"
              onClick={onAdminLoginRequest}
              className="w-full sm:w-auto bg-white/15 hover:bg-white/25 border border-white/20 text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              Acceso Administrador
            </button>
          )}
        </div>

        <p className="text-[10px] text-slate-400 mt-5">
          Transferencias S.A.S. • Control de Recaudos y Conciliación QR
        </p>
      </div>
    </div>
  );
}
