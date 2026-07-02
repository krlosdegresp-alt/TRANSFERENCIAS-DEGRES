import React, { useState } from 'react';
import { loginUser, getUsers, saveUsers } from '../firebase';
import { User, Role, Sede } from '../types';
import { Mail, Lock } from 'lucide-react';
import DgDegresLogo from './DgDegresLogo';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Cajera');
  const [sede, setSede] = useState<Sede>('Guayabal');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor ingresa un correo electrónico.');
      return;
    }
    
    const cleanMail = email.trim().toLowerCase();
    
    // Domain authorization restriction (Accepts @degres.com and @degrescolombia.com)
    if (!cleanMail.endsWith('@degrescolombia.com') && !cleanMail.endsWith('@degres.com')) {
      setError('Acceso denegado. Solamente están autorizados los correos bajo el dominio corporativo @degres.com');
      return;
    }

    const activeUsers = getUsers();
    const matched = activeUsers.find(u => u.email.toLowerCase() === cleanMail);
    
    if (matched && matched.isBlocked) {
      setError('Acceso denegado. Este usuario ha sido deshabilitado/bloqueado por el administrador.');
      return;
    }

    // Strict password verification
    if (matched) {
      const expectedPsw = matched.password || 'Degres123';
      if (password !== expectedPsw) {
        setError('Contraseña incorrecta para el usuario ingresado.');
        return;
      }
    } else {
      if (!password || password.length < 4) {
        setError('La contraseña para nuevos registros debe tener al menos 4 caracteres.');
        return;
      }
    }

    // Identify user’s active role and sede based on choice or predefined structure
    const finalRole = matched ? matched.role : role;
    const finalSede = matched ? (matched.sede || 'Guayabal') : (role === 'Cajera' ? sede : undefined);
    
    // If a new user is logged in, use their submitted password for registration
    const logged = loginUser(cleanMail, finalRole, finalSede);
    if (!matched && password) {
      // update password for the newly created user in memory
      const currentRegistered = getUsers();
      const updated = currentRegistered.map(u => {
        if (u.email.toLowerCase() === cleanMail) {
          return { ...u, password };
        }
        return u;
      });
      saveUsers(updated);
    }
    onLoginSuccess(logged);
  };

  return (
    <div id="login-container" className="min-h-screen bg-gradient-to-br from-[#0E1B46] via-[#162761] to-[#1E327A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative corporate ambient background glow */}
      <div className="absolute -top-[10%] -left-[10%] w-[350px] h-[350px] rounded-full bg-[#F47920]/15 blur-[80px] pointer-events-none"></div>
      <div className="absolute -bottom-[10%] -right-[10%] w-[350px] h-[350px] rounded-full bg-[#1A2D7C]/30 blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#1A2D7C] rounded-2xl shadow-2xl border-2 border-[#F47920] border-t-8 overflow-hidden p-8 md:p-10 flex flex-col items-center relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Real Logo Component with lightMode={true} to transparently blend the black background */}
        <div className="mb-6 flex flex-col items-center">
          <DgDegresLogo lightMode={true} className="h-20 max-w-[240px] w-auto mb-3" />
          <h1 className="text-xl font-bold font-sans text-white tracking-tight mt-2 text-center uppercase">
            Validación de Recaudos
          </h1>
          <p className="text-slate-200 text-xs text-center mt-1">
            Ingresa tus credenciales para iniciar sesión en la plataforma
          </p>
        </div>

        {error && (
          <div className="w-full mb-5 p-3 bg-rose-500/15 border-l-4 border-rose-500 text-rose-200 text-xs rounded font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="input-login-email"
                type="email"
                required
                placeholder="usuario@degres.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="w-full pl-11 pr-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#F47920]/20 focus:outline-none focus:border-[#F47920] bg-white text-slate-850 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="input-login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#F47920]/20 focus:outline-none focus:border-[#F47920] bg-white text-slate-850 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">Rol de Acceso</label>
              <select
                id="select-login-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#F47920]/20 focus:outline-none focus:border-[#F47920] bg-white text-slate-850 font-medium cursor-pointer"
              >
                <option value="Cajera">Cajera / Sucursal</option>
                <option value="Tesorera">Tesorera</option>
                <option value="Admin">Admin General</option>
                <option value="Asesor">Asesor Comercial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">Sede Física</label>
              <select
                id="select-login-sede"
                value={sede}
                disabled={role !== 'Cajera'}
                onChange={(e) => setSede(e.target.value as Sede)}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#F47920]/20 focus:outline-none focus:border-[#F47920] bg-white disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-850 font-medium cursor-pointer"
              >
                <option value="Guayabal">Guayabal (6519)</option>
                <option value="Sabaneta">Sabaneta (0916)</option>
                <option value="Naranjal">Naranjal (6807)</option>
                <option value="Desconocida">Otra / Sin Sede</option>
              </select>
            </div>
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            className="w-full bg-[#F47920] hover:bg-[#d9640f] text-white py-3 rounded-xl text-sm font-bold tracking-wider uppercase transition-all shadow-md hover:shadow-lg mt-6 cursor-pointer transform active:scale-[0.98]"
          >
            Entrar al Sistema
          </button>
        </form>
      </div>
    </div>
  );
}
