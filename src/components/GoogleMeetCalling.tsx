import React, { useState, useEffect, useRef } from 'react';
import { 
  getVideoCalls, 
  startVideoCall, 
  updateVideoCallStatus, 
  subscribeToDatabase, 
  getUsers,
  PREDEFINED_USERS 
} from '../firebase';
import { VideoCall, User } from '../types';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX, 
  X, 
  Check, 
  ExternalLink,
  Loader2
} from 'lucide-react';

interface GoogleMeetCallingProps {
  currentUser: User;
}

// Browser native tone synthesizer for Call Ringing (elegant and clean)
let currentRingCleanup: (() => void) | null = null;
let currentDialCleanup: (() => void) | null = null;

function stopAllCallSounds() {
  if (currentRingCleanup) {
    currentRingCleanup();
    currentRingCleanup = null;
  }
  if (currentDialCleanup) {
    currentDialCleanup();
    currentDialCleanup = null;
  }
}

// Synthesizer for incoming call ring (dual-tone European style telephone ring)
function playIncomingRingSound(): () => void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return () => {};
    const audioCtx = new AudioContextClass();
    
    let isStopped = false;
    const playRingCycle = () => {
      if (isStopped) return;
      
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(400, audioCtx.currentTime); // 400Hz + 450Hz dual tone
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(450, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime + 1.2);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.5);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc1.start();
      osc2.start();
      
      osc1.stop(audioCtx.currentTime + 1.5);
      osc2.stop(audioCtx.currentTime + 1.5);
    };

    playRingCycle();
    const interval = setInterval(playRingCycle, 2500);

    return () => {
      isStopped = true;
      clearInterval(interval);
      audioCtx.close();
    };
  } catch (e) {
    console.warn('Could not initialize incoming ring synthesizer:', e);
    return () => {};
  }
}

// Synthesizer for outgoing call dial ring (softer pulsing dial tone)
function playOutgoingDialSound(): () => void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return () => {};
    const audioCtx = new AudioContextClass();
    
    let isStopped = false;
    const playDialCycle = () => {
      if (isStopped) return;
      
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, audioCtx.currentTime); // Standard 425Hz European dial tone
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime + 0.8);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.0);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 1.0);
    };

    playDialCycle();
    const interval = setInterval(playDialCycle, 2000);

    return () => {
      isStopped = true;
      clearInterval(interval);
      audioCtx.close();
    };
  } catch (e) {
    console.warn('Could not initialize outgoing dial synthesizer:', e);
    return () => {};
  }
}

export default function GoogleMeetCalling({ currentUser }: GoogleMeetCallingProps) {
  const [videoCalls, setVideoCalls] = useState<VideoCall[]>(() => getVideoCalls());
  const [users, setUsers] = useState<User[]>(() => getUsers());
  const [showDialer, setShowDialer] = useState(false);
  const [dialingReceiverId, setDialingReceiverId] = useState('');
  const [isCallingAPI, setIsCallingAPI] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customMeetLink, setCustomMeetLink] = useState('');
  const [meetLinkError, setMeetLinkError] = useState('');
  const [callType, setCallType] = useState<'video' | 'voice'>('voice');
  const [linkMethod, setLinkMethod] = useState<'auto' | 'manual'>('auto');
  
  // Mounted timestamp to filter out old videocalls on load
  const mountTimeRef = useRef<number>(Date.now());

  // Listen for real-time video calls updates
  useEffect(() => {
    setVideoCalls(getVideoCalls());
    setUsers(getUsers());
    const unsubscribe = subscribeToDatabase(() => {
      setVideoCalls(getVideoCalls());
      setUsers(getUsers());
    });
    return () => unsubscribe();
  }, []);

  // Parse custom date timestamp YYYY-MM-DD HH:MM:SS into Epoch Ms
  const parseCallTime = (timeStr: string): number => {
    return new Date(timeStr.replace(/-/g, '/')).getTime() || 0;
  };

  // Find active incoming call (pending, directed to us, newer than mount time & less than 2 minutes old)
  const incomingCall = videoCalls.find(c => 
    c.receiverId === currentUser.id && 
    c.status === 'pending' && 
    parseCallTime(c.createdAt) > mountTimeRef.current - 120000
  );

  // Find active outgoing call (pending, initiated by us, newer than mount time & less than 2 minutes old)
  const outgoingCall = videoCalls.find(c => 
    c.senderId === currentUser.id && 
    c.status === 'pending' && 
    parseCallTime(c.createdAt) > mountTimeRef.current - 120000
  );

  // Find current accepted call involving us that is still open/active (e.g. less than 1 hour old)
  const acceptedCall = videoCalls.find(c => 
    (c.senderId === currentUser.id || c.receiverId === currentUser.id) && 
    c.status === 'accepted' && 
    parseCallTime(c.createdAt) > mountTimeRef.current - 3600000
  );

  // Manage Sound FX
  useEffect(() => {
    stopAllCallSounds();

    if (!soundEnabled) return;

    if (incomingCall) {
      currentRingCleanup = playIncomingRingSound();
    } else if (outgoingCall) {
      currentDialCleanup = playOutgoingDialSound();
    }

    return () => {
      stopAllCallSounds();
    };
  }, [incomingCall?.id, outgoingCall?.id, soundEnabled]);

  // Clean up sounds when call ends or is accepted
  useEffect(() => {
    if (!incomingCall && !outgoingCall) {
      stopAllCallSounds();
    }
  }, [incomingCall, outgoingCall]);

  // Auto-open Meet room when an outgoing call is accepted
  const [hasAutoOpened, setHasAutoOpened] = useState<string | null>(null);
  useEffect(() => {
    if (acceptedCall && acceptedCall.senderId === currentUser.id && hasAutoOpened !== acceptedCall.id) {
      setHasAutoOpened(acceptedCall.id);
      // Informative alert then open
      const notifyAndOpen = () => {
        try {
          window.open(acceptedCall.meetLink, '_blank');
        } catch (e) {
          console.warn("Blocked popup from auto-opening Meet:", e);
        }
      };
      notifyAndOpen();
    }
  }, [acceptedCall, currentUser.id, hasAutoOpened]);

  // Start call
  const handleStartCall = async () => {
    if (!dialingReceiverId) return;
    
    let cleanedLink = customMeetLink.trim();
    setMeetLinkError('');

    if (linkMethod === 'auto') {
      const letters = 'abcdefghijklmnopqrstuvwxyz';
      const randSec = (len: number) => Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
      if (callType === 'voice') {
        cleanedLink = `https://meet.jit.si/SoporteLlamadaVoz_${randSec(4)}_${randSec(4)}#config.startWithVideoMuted=true`;
      } else {
        cleanedLink = `https://meet.jit.si/SoporteVideollamada_${randSec(4)}_${randSec(4)}#config.startWithAudioMuted=false`;
      }
    } else {
      if (!cleanedLink) {
        setMeetLinkError('Por favor ingresa un enlace o código de Google Meet.');
        return;
      }

      // Auto-format short-codes to standard Google Meet URLs
      const codeRegex = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i;
      const cleanCodeRegex = /^[a-z]{10}$/i;
      if (codeRegex.test(cleanedLink)) {
        cleanedLink = `https://meet.google.com/${cleanedLink.toLowerCase()}`;
      } else if (cleanCodeRegex.test(cleanedLink)) {
        const parts = [cleanedLink.substring(0, 3), cleanedLink.substring(3, 7), cleanedLink.substring(7)];
        cleanedLink = `https://meet.google.com/${parts.join('-').toLowerCase()}`;
      }

      if (!cleanedLink.toLowerCase().includes('meet.google.com/') && !cleanedLink.toLowerCase().includes('meet.jit.si/')) {
        setMeetLinkError('El enlace debe ser un enlace de Google Meet o Jitsi válido.');
        return;
      }
    }

    const target = users.find(u => u.id === dialingReceiverId);
    if (!target) return;

    setIsCallingAPI(true);
    try {
      await startVideoCall(
        currentUser.id,
        currentUser.nombre,
        currentUser.role,
        target.id,
        target.nombre,
        cleanedLink,
        callType
      );
      setShowDialer(false);
      setCustomMeetLink('');
      setMeetLinkError('');
    } catch (e) {
      console.error("Error starting call:", e);
      alert("No se pudo iniciar la llamada.");
    } finally {
      setIsCallingAPI(false);
    }
  };

  // Accept Call
  const handleAcceptCall = async (callId: string, meetLink: string) => {
    try {
      stopAllCallSounds();
      await updateVideoCallStatus(callId, 'accepted');
      window.open(meetLink, '_blank');
    } catch (e) {
      console.error("Error accepting call:", e);
    }
  };

  // Decline Call
  const handleDeclineCall = async (callId: string) => {
    try {
      stopAllCallSounds();
      await updateVideoCallStatus(callId, 'declined');
    } catch (e) {
      console.error("Error declining call:", e);
    }
  };

  // End active call
  const handleEndCall = async (callId: string) => {
    try {
      await updateVideoCallStatus(callId, 'ended');
    } catch (e) {
      console.error("Error ending call:", e);
    }
  };

  // Predefined users available to be called based on role permissions:
  // - Asesor can call Tesorera or Admin.
  // - Tesorera and Admin can call anyone (except themselves).
  // - Cajera cannot start calls.
  const allowedTargets = users.filter(u => {
    if (u.id === currentUser.id || u.isBlocked) return false;
    
    if (currentUser.role === 'Admin' || currentUser.role === 'Tesorera') {
      return true;
    } else if (currentUser.role === 'Asesor') {
      return u.role === 'Admin' || u.role === 'Tesorera';
    }
    return false;
  });

  return (
    <>
      {/* Floating Voice Call Launcher Button */}
      {!incomingCall && !outgoingCall && !acceptedCall && currentUser.role !== 'Cajera' && (
        <button
          id="btn-voice-launcher"
          onClick={() => {
            if (allowedTargets.length === 0) {
              alert("No hay destinatarios válidos o disponibles para llamar en este momento.");
              return;
            }
            setDialingReceiverId(allowedTargets[0]?.id || '');
            setCustomMeetLink('');
            setMeetLinkError('');
            setCallType('voice');
            setLinkMethod('auto');
            setShowDialer(true);
          }}
          className="fixed bottom-6 right-46 z-40 p-4 bg-gradient-to-tr from-sky-600 to-blue-700 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center border-2 border-white/20"
          title="Iniciar Llamada de Voz"
        >
          <Phone className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Floating Video Call Launcher Button */}
      {!incomingCall && !outgoingCall && !acceptedCall && currentUser.role !== 'Cajera' && (
        <button
          id="btn-google-meet-launcher"
          onClick={() => {
            if (allowedTargets.length === 0) {
              alert("No hay destinatarios válidos o disponibles para llamar en este momento.");
              return;
            }
            setDialingReceiverId(allowedTargets[0]?.id || '');
            setCustomMeetLink('');
            setMeetLinkError('');
            setCallType('video');
            setLinkMethod('auto');
            setShowDialer(true);
          }}
          className="fixed bottom-6 right-28 z-40 p-4 bg-gradient-to-tr from-emerald-600 to-teal-700 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center border-2 border-white/20"
          title="Iniciar Videollamada Google Meet"
        >
          <Video className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Dialer Modal */}
      {showDialer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {callType === 'voice' ? (
                  <Phone className="h-5 w-5 text-sky-600 animate-pulse" />
                ) : (
                  <Video className="h-5 w-5 text-emerald-600 animate-pulse" />
                )}
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
                  {callType === 'voice' ? 'Iniciar Llamada de Voz' : 'Iniciar Videollamada'}
                </h3>
              </div>
              <button 
                onClick={() => setShowDialer(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-left">
              {/* Step 1: Select Collaborator */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label className="block text-[10px] font-black uppercase text-slate-700 tracking-wider mb-1.5">
                  1. Seleccionar Colaborador
                </label>
                <select
                  value={dialingReceiverId}
                  onChange={(e) => setDialingReceiverId(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 transition-all cursor-pointer"
                >
                  {allowedTargets.map(t => (
                    <option key={t.id} value={t.id}>
                      👤 {t.nombre} ({t.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Choose Call Type */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label className="block text-[10px] font-black uppercase text-slate-700 tracking-wider mb-2">
                  2. Tipo de Comunicación
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCallType('voice')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      callType === 'voice'
                        ? 'bg-sky-50 border-sky-300 text-sky-700 font-extrabold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Phone className="h-4 w-4" />
                    Llamada de voz
                  </button>
                  <button
                    type="button"
                    onClick={() => setCallType('video')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      callType === 'video'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-extrabold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Video className="h-4 w-4" />
                    Videollamada
                  </button>
                </div>
              </div>

              {/* Step 3: Choose Connection Method */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label className="block text-[10px] font-black uppercase text-slate-700 tracking-wider mb-2">
                  3. Método de Conexión
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLinkMethod('auto')}
                    className={`py-2 px-2 text-[11px] font-bold rounded-lg flex flex-col items-center justify-center border transition-all cursor-pointer ${
                      linkMethod === 'auto'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-extrabold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-extrabold">🚀 Línea Directa</span>
                    <span className="text-[9px] font-medium text-slate-400">Instante (1-Clic)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkMethod('manual')}
                    className={`py-2 px-2 text-[11px] font-bold rounded-lg flex flex-col items-center justify-center border transition-all cursor-pointer ${
                      linkMethod === 'manual'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-extrabold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-extrabold">🌐 Meet Manual</span>
                    <span className="text-[9px] font-medium text-slate-400">Enlace propio</span>
                  </button>
                </div>
              </div>

              {linkMethod === 'auto' ? (
                <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl text-center">
                  <span className="text-xs text-indigo-950 font-bold leading-normal block">
                    ¡Conexión de Línea Directa Activada!
                  </span>
                  <span className="text-[11px] text-indigo-700 mt-1 block">
                    No necesitas crear salas manuales. Generaremos una sala instantánea segura para {callType === 'voice' ? 'llamada de voz' : 'videollamada'}. Ambos se conectarán con un solo clic.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Step 2 (for manual Meet link generation) */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <span className="block text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                      Generar Sala de Google Meet Real
                    </span>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Haz clic abajo para abrir Google Meet en otra pestaña y crear una reunión real.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        window.open('https://meet.google.com/new', '_blank');
                      }}
                      className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
                    >
                      <ExternalLink className="h-4 w-4 text-emerald-600" />
                      Crear Nueva Sala (Abrir en Meet)
                    </button>
                  </div>

                  {/* Step 3 (for manual Meet link pasting) */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                    <label className="block text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                      Pegar Enlace o Código de la Reunión
                    </label>
                    <p className="text-[11px] text-slate-500 leading-normal mb-1">
                      Copia el enlace de Google Meet (ej. https://meet.google.com/xxx-yyyy-zzz) o el código y pégalo aquí:
                    </p>
                    <input
                      type="text"
                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                      value={customMeetLink}
                      onChange={(e) => {
                        setCustomMeetLink(e.target.value);
                        setMeetLinkError('');
                      }}
                      className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 transition-all placeholder:text-slate-400 font-mono"
                    />
                    {meetLinkError ? (
                      <p className="text-[11px] text-red-600 font-bold">{meetLinkError}</p>
                    ) : customMeetLink.includes('meet.google.com/') ? (
                      <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Enlace de Meet válido detectado
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDialer(false)}
                  className="flex-1 py-3 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleStartCall}
                  disabled={isCallingAPI || !dialingReceiverId || (linkMethod === 'manual' && !customMeetLink.trim())}
                  className={`flex-1 py-3 text-xs font-bold text-white bg-gradient-to-r rounded-xl transition-all shadow-md flex items-center justify-center gap-2 uppercase cursor-pointer disabled:opacity-50 ${
                    callType === 'voice' 
                      ? 'from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700' 
                      : 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                  }`}
                >
                  {isCallingAPI ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : callType === 'voice' ? (
                    <Phone className="h-4 w-4 text-white" />
                  ) : (
                    <Video className="h-4 w-4 text-white" />
                  )}
                  Llamar Ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing Call Overlay Screen */}
      {outgoingCall && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-full transition-all cursor-pointer ${soundEnabled ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 bg-slate-800'}`}
                title={soundEnabled ? 'Mute' : 'Unmute'}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className={`h-20 w-20 bg-gradient-to-tr rounded-full flex items-center justify-center shadow-lg animate-pulse ${
                  outgoingCall.type === 'voice' ? 'from-sky-500 to-blue-500 shadow-sky-500/20' : 'from-emerald-500 to-teal-500 shadow-emerald-500/20'
                }`}>
                  {outgoingCall.type === 'voice' ? (
                    <Phone className="h-9 w-9 text-white animate-bounce" />
                  ) : (
                    <Video className="h-9 w-9 text-white animate-bounce" />
                  )}
                </div>
                <span className={`absolute inset-0 rounded-full border-4 animate-ping ${
                  outgoingCall.type === 'voice' ? 'border-sky-500/30' : 'border-emerald-500/30'
                }`} style={{ animationDuration: '2s' }}></span>
              </div>
            </div>

            <h4 className="text-white font-extrabold text-sm uppercase tracking-wider mb-1">Marcación Saliente</h4>
            <h3 className="text-slate-200 font-bold text-lg leading-snug mb-1">{outgoingCall.receiverName}</h3>
            <p className="text-[11px] text-indigo-400 mb-6 font-medium font-mono uppercase tracking-widest animate-pulse">
              {outgoingCall.type === 'voice' ? 'Llamando por voz...' : 'Llamando por videollamada...'}
            </p>

            <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl mb-6">
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Esperando que el destinatario acepte la llamada. Al aceptar, la comunicación se abrirá automáticamente.
              </p>
            </div>

            <button
              onClick={() => handleEndCall(outgoingCall.id)}
              className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md flex items-center justify-center gap-2 w-full cursor-pointer"
            >
              <PhoneOff className="h-4 w-4 text-white" />
              Cancelar Llamada
            </button>
          </div>
        </div>
      )}

      {/* Incoming Call Overlay Alert Dialog (CRITICAL) */}
      {incomingCall && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-[#1A2D7C] border-2 border-[#F47920]/40 rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-full transition-all cursor-pointer ${soundEnabled ? 'text-[#F47920] bg-white/10' : 'text-slate-400 bg-white/5'}`}
                title={soundEnabled ? 'Silenciar timbre' : 'Activar timbre'}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="h-20 w-20 bg-gradient-to-tr from-[#F47920] to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-[#F47920]/20 animate-pulse">
                  {incomingCall.type === 'voice' ? (
                    <Phone className="h-9 w-9 text-white animate-bounce" />
                  ) : (
                    <Video className="h-9 w-9 text-white animate-spin-slow" style={{ animationDuration: '4s' }} />
                  )}
                </div>
                <span className="absolute inset-0 rounded-full border-4 border-[#F47920]/40 animate-ping" style={{ animationDuration: '1.5s' }}></span>
              </div>
            </div>

            <span className="inline-block bg-[#F47920] text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-2.5 animate-bounce">
              {incomingCall.type === 'voice' ? 'Llamada de Voz Entrante' : 'Videollamada Entrante'}
            </span>
            <h3 className="text-white font-extrabold text-lg leading-snug mb-1">{incomingCall.senderName}</h3>
            <p className="text-[10px] text-slate-300 mb-6 font-semibold uppercase tracking-wider">
              {incomingCall.senderRole} de la compañía está solicitando una {incomingCall.type === 'voice' ? 'llamada de voz' : 'videollamada'}
            </p>

            <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-6">
              <p className="text-[10.5px] text-slate-200 font-medium leading-relaxed">
                Solicitud de asistencia vía **{incomingCall.type === 'voice' ? 'Llamada de Voz' : 'Google Meet'}**. Presiona "Aceptar" para contestar de inmediato.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleDeclineCall(incomingCall.id)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneOff className="h-4 w-4 text-slate-400" />
                Rechazar
              </button>
              <button
                onClick={() => handleAcceptCall(incomingCall.id, incomingCall.meetLink)}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer animate-pulse"
              >
                <Check className="h-4 w-4 text-white" />
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Floating Sticky Banner */}
      {acceptedCall && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4 animate-in slide-in-from-top-6 duration-300">
          <div className="bg-emerald-900 border border-emerald-600/30 text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl flex-shrink-0 animate-pulse">
                {acceptedCall.type === 'voice' ? (
                  <Phone className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Video className="h-5 w-5 text-emerald-400" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                  {acceptedCall.type === 'voice' ? 'Llamada de Voz Activa' : 'Videollamada Activa'}
                </h4>
                <p className="text-[11px] text-emerald-100 font-semibold truncate">
                  Con {acceptedCall.senderId === currentUser.id ? acceptedCall.receiverName : acceptedCall.senderName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={acceptedCall.meetLink}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-500/20 hover:scale-102 active:scale-98"
                title="Abrir sala de Meet"
              >
                <ExternalLink className="h-3.5 w-3.5 text-white" />
                <span className="hidden sm:inline">Contestar / Entrar</span>
              </a>
              <button
                onClick={() => handleEndCall(acceptedCall.id)}
                className="p-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all cursor-pointer"
                title="Finalizar Llamada"
              >
                <PhoneOff className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
