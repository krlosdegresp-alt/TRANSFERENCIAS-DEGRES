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
    
    // Domain authorization restriction
    if (!cleanMail.endsWith('@degrescolombia.com')) {
      setError('Acceso denegado. Solamente están autorizados los correos bajo el dominio corporativo @degrescolombia.com');
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
    <div id="login-container" className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-8 md:p-10 flex flex-col items-center">
        {/* Real Logo Component */}
        <div className="mb-8 flex flex-col items-center">
          <DgDegresLogo className="h-20 max-w-[240px] w-auto drop-shadow-sm mb-3" />
          <h1 className="text-xl font-bold font-sans text-slate-800 tracking-tight mt-2 text-center">
            Módulo de Validación Bancaria
          </h1>
          <p className="text-slate-500 text-xs text-center mt-1">
            Ingresa tus credenciales o define tu cargo para iniciar sesión
          </p>
        </div>

        {error && (
          <div className="w-full mb-5 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                id="input-login-email"
                type="email"
                required
                placeholder="usuario@dgdegres.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="w-full pl-11 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A2D7C]/20 focus:outline-none focus:border-[#1A2D7C] bg-slate-50 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                id="input-login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A2D7C]/20 focus:outline-none focus:border-[#1A2D7C] bg-slate-50 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Rol de Acceso</label>
              <select
                id="select-login-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A2D7C]/20 focus:outline-none focus:border-[#1A2D7C] bg-slate-50 focus:bg-white font-medium cursor-pointer"
              >
                <option value="Cajera">Cajera / Sucursal</option>
                <option value="Tesorera">Tesorera</option>
                <option value="Admin">Admin General</option>
                <option value="Asesor">Asesor Comercial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Sede Física</label>
              <select
                id="select-login-sede"
                value={sede}
                disabled={role !== 'Cajera'}
                onChange={(e) => setSede(e.target.value as Sede)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A2D7C]/20 focus:outline-none focus:border-[#1A2D7C] bg-slate-50 disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed focus:bg-white font-medium cursor-pointer"
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
            className="w-full bg-[#1A2D7C] hover:bg-[#152463] text-white py-3 rounded-xl text-sm font-bold tracking-wider uppercase transition-all shadow-md hover:shadow-lg mt-6"
          >
            Entrar al Sistema
          </button>
        </form>

        <div className="mt-10 border-t border-slate-100 pt-5 w-full text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
            Restricción de Acceso Corporativo
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 font-medium leading-relaxed max-w-xs mx-auto text-center">
            Este sistema de conciliación es de uso privado. Únicamente se permite el inicio de sesión a usuarios activos con cuentas corporativas autorizadas bajo el dominio <span className="font-bold text-[#1A2D7C] font-mono">@degrescolombia.com</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
