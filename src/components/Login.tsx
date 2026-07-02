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

    const emailPrefix = cleanMail.split('@')[0];
    
    // Identify user’s active role and sede based on email prefix or predefined structure
    let finalRole: Role = 'Cajera';
    let finalSede: Sede | undefined = 'Guayabal';

    if (matched) {
      finalRole = matched.role;
      finalSede = matched.sede || 'Guayabal';
    } else {
      // Automatic deduction based on email address prefix
      if (emailPrefix.includes('admin') || emailPrefix.includes('calidad') || emailPrefix.includes('gestion')) {
        finalRole = 'Admin';
        finalSede = undefined;
      } else if (emailPrefix.includes('tesor') || emailPrefix.includes('marta') || emailPrefix.includes('pagos')) {
        finalRole = 'Tesorera';
        finalSede = undefined;
      } else if (emailPrefix.includes('asesor') || emailPrefix.includes('vendedor') || emailPrefix.includes('comercial') || emailPrefix.includes('venta')) {
        finalRole = 'Asesor';
        finalSede = undefined;
      } else {
        finalRole = 'Cajera';
        if (emailPrefix.includes('sabaneta')) {
          finalSede = 'Sabaneta';
        } else if (emailPrefix.includes('naranjal')) {
          finalSede = 'Naranjal';
        } else {
          finalSede = 'Guayabal';
        }
      }
    }
    
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
    <div id="login-container" className="min-h-screen bg-gradient-to-br from-[#101b44] via-[#1A2D7C] to-[#0d1637] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Soft corporate ambient background glow with lower intensity */}
      <div className="absolute -top-[10%] -left-[10%] w-[320px] h-[320px] rounded-full bg-[#F47920]/10 blur-[90px] pointer-events-none"></div>
      <div className="absolute -bottom-[10%] -right-[10%] w-[320px] h-[320px] rounded-full bg-[#1A2D7C]/20 blur-[90px] pointer-events-none"></div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200/80 border-t-4 border-t-[#F47920] overflow-hidden p-6 md:p-8 flex flex-col items-center relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="mb-5 flex flex-col items-center">
          <DgDegresLogo className="h-14 max-w-[220px] w-auto mb-3" />
          <h1 className="text-lg font-bold font-sans text-slate-800 tracking-tight mt-1 text-center uppercase">
            Validación de Recaudos
          </h1>
          <p className="text-slate-500 text-[11px] text-center mt-1">
            Ingresa tus credenciales para iniciar sesión en la plataforma
          </p>
        </div>

        {error && (
          <div className="w-full mb-5 p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-xs rounded font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
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
                className="w-full pl-11 pr-4 py-3 text-sm border border-slate-250 rounded-xl focus:ring-2 focus:ring-[#1A2D7C]/15 focus:outline-none focus:border-[#1A2D7C] bg-slate-50 text-slate-850 placeholder-slate-400 font-medium transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="input-login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm border border-slate-250 rounded-xl focus:ring-2 focus:ring-[#1A2D7C]/15 focus:outline-none focus:border-[#1A2D7C] bg-slate-50 text-slate-850 placeholder-slate-400 font-medium transition-all"
              />
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
