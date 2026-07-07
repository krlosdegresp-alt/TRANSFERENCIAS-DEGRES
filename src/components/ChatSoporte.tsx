import React, { useState, useEffect, useRef } from 'react';
import { 
  getChatMessages, 
  sendChatMessage, 
  deleteChatMessage,
  subscribeToDatabase, 
  getUsers,
  getCierresCaja,
  startVideoCall,
  getTransactions,
  getAdvisors,
  resolveTransactionChange,
  rejectTransactionChange
} from '../firebase';
import { ChatMessage, User, Role } from '../types';
import { 
  MessageSquare, 
  X, 
  Send, 
  Shield, 
  Building2, 
  Volume2, 
  Sparkles,
  Trash2,
  AlertCircle,
  User as UserIcon,
  Video,
  Check,
  Edit,
  Undo2
} from 'lucide-react';

interface ChatSoporteProps {
  currentUser: User;
}

// Browser native notification chime synthesizer (no assets required, works 100% of the time offline & previews)
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startTime);
      
      gainNode.gain.setValueAtTime(0.08, startTime);
      // Smooth exponential decay to avoid click sound artifacts
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioCtx.currentTime;
    // Friendly, elegant double-chime (E5 then A5)
    playNote(659.25, now, 0.12);
    playNote(880.00, now + 0.08, 0.22);
  } catch (error) {
    console.warn('Notification sound could not be played:', error);
  }
}

export default function ChatSoporte({ currentUser }: ChatSoporteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => getChatMessages());
  const [text, setText] = useState('');
  
  // States for handling transaction reversion requests directly within chat
  const [editingRequestMsgId, setEditingRequestMsgId] = useState<string | null>(null);
  const [editAsesor, setEditAsesor] = useState('');
  const [editDocType, setEditDocType] = useState<'Recibo' | 'Remisión' | 'Ignorado'>('Remisión');
  const [editJustificacion, setEditJustificacion] = useState('');
  
  // Threads & recipients selection
  // 'general' is the shared announcements channel
  // Other options are direct user IDs representing the direct chat thread with that user
  const [selectedThread, setSelectedThread] = useState<string>('general');
  const [allUsers, setAllUsers] = useState<User[]>(() => getUsers());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);

  // Synchronize database updates
  useEffect(() => {
    setMessages(getChatMessages());
    setAllUsers(getUsers());

    const unsubscribe = subscribeToDatabase(() => {
      setMessages(getChatMessages());
      setAllUsers(getUsers());
    });
    return () => unsubscribe();
  }, []);

  // Compute allowed chat recipients for the current user based on strict platform rules:
  // - Admins and Treasurers can talk to ANY active (non-blocked) user.
  // - Cajeras and Advisors (Asesores) can talk ONLY to Admins and Treasurers.
  // - Advisors cannot speak with other advisors, and cashiers cannot speak with other cashiers.
  const getAllowedRecipients = (): User[] => {
    const activeUsers = allUsers.filter(u => !u.isBlocked && u.id !== currentUser.id);
    
    if (currentUser.role === 'Admin' || currentUser.role === 'Tesorera') {
      return activeUsers;
    } else {
      // Cajeras and Asesores can only chat with Admins and Treasurers
      return activeUsers.filter(u => u.role === 'Admin' || u.role === 'Tesorera');
    }
  };

  const allowedRecipients = getAllowedRecipients();

  // Parse custom human timestamp "YYYY-MM-DD HH:MM:SS" into epoch milliseconds for comparisons
  const parseTime = (timestampStr: string): number => {
    return new Date(timestampStr.replace(/-/g, '/')).getTime() || 0;
  };

  // Check if a specific thread has unread messages since last view
  const hasUnreadInThread = (threadId: string): boolean => {
    const lastViewedStr = localStorage.getItem(`chat_last_viewed_${currentUser.id}_${threadId}`);
    const lastViewed = lastViewedStr ? parseInt(lastViewedStr) : 0;
    
    if (threadId === 'general') {
      const generalMsgs = messages.filter(msg => msg.receiverId === 'general' || !msg.receiverId);
      return generalMsgs.some(msg => msg.senderId !== currentUser.id && parseTime(msg.timestamp) > lastViewed);
    } else {
      // Direct message thread with user "threadId"
      const dmMsgs = messages.filter(msg => 
        (msg.senderId === currentUser.id && msg.receiverId === threadId) ||
        (msg.senderId === threadId && msg.receiverId === currentUser.id)
      );
      return dmMsgs.some(msg => msg.senderId !== currentUser.id && parseTime(msg.timestamp) > lastViewed);
    }
  };

  // Update last viewed timestamp for the currently active thread
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem(`chat_last_viewed_${currentUser.id}_${selectedThread}`, Date.now().toString());
    }
  }, [selectedThread, isOpen, messages.length]);

  // Play notification chime on login/load if there are any unread messages
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!soundEnabled) return;

      let hasUnread = false;
      // Check general channel
      const lastViewedGeneralStr = localStorage.getItem(`chat_last_viewed_${currentUser.id}_general`);
      const lastViewedGeneral = lastViewedGeneralStr ? parseInt(lastViewedGeneralStr) : 0;
      const generalMsgs = messages.filter(msg => msg.receiverId === 'general' || !msg.receiverId);
      const hasUnreadGeneral = generalMsgs.some(msg => msg.senderId !== currentUser.id && parseTime(msg.timestamp) > lastViewedGeneral);

      if (hasUnreadGeneral) {
        hasUnread = true;
      } else {
        // Check direct threads with allowed recipients
        const recipients = getAllowedRecipients();
        for (const r of recipients) {
          const lastViewedDMStr = localStorage.getItem(`chat_last_viewed_${currentUser.id}_${r.id}`);
          const lastViewedDM = lastViewedDMStr ? parseInt(lastViewedDMStr) : 0;
          const dmMsgs = messages.filter(msg => 
            (msg.senderId === currentUser.id && msg.receiverId === r.id) ||
            (msg.senderId === r.id && msg.receiverId === currentUser.id)
          );
          if (dmMsgs.some(msg => msg.senderId !== currentUser.id && parseTime(msg.timestamp) > lastViewedDM)) {
            hasUnread = true;
            break;
          }
        }
      }

      if (hasUnread) {
        playNotificationChime();
      }
    }, 1200); // Friendly 1.2s delay to play when app mounts/enters

    return () => clearTimeout(timer);
  }, [currentUser.id]);

  // Trigger sound notifications when new relevant messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.senderId !== currentUser.id) {
        
        // Is this message visible to/directed at us?
        let isRelevant = false;
        if (lastMsg.receiverId === 'general' || !lastMsg.receiverId) {
          isRelevant = true; // Everyone receives general announcements
        } else if (lastMsg.receiverId === currentUser.id) {
          isRelevant = true; // Direct message sent to us
        }

        // Check if we are NOT currently looking at the active thread of this message
        const isCurrentlyLooking = isOpen && (
          (lastMsg.receiverId === 'general' && selectedThread === 'general') ||
          (lastMsg.senderId === selectedThread && lastMsg.receiverId === currentUser.id)
        );

        if (isRelevant && !isCurrentlyLooking && soundEnabled) {
          playNotificationChime();
        }
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, currentUser.id, isOpen, selectedThread, soundEnabled]);

  // Calculate total unread channels for the outer notification badge count
  useEffect(() => {
    let count = 0;
    if (hasUnreadInThread('general')) {
      count++;
    }
    allowedRecipients.forEach(r => {
      if (hasUnreadInThread(r.id)) {
        count++;
      }
    });
    setUnreadCount(count);
  }, [messages, isOpen, selectedThread, allowedRecipients]);

  // Logic to get visible messages in the active thread
  const getVisibleMessages = (): ChatMessage[] => {
    if (selectedThread === 'general') {
      return messages.filter(msg => msg.receiverId === 'general' || !msg.receiverId);
    }
    
    // Direct message thread with selected target user ID
    return messages.filter(msg => 
      (msg.senderId === currentUser.id && msg.receiverId === selectedThread) ||
      (msg.senderId === selectedThread && msg.receiverId === currentUser.id)
    );
  };

  const visibleMessages = getVisibleMessages();

  // Scroll to bottom of message panel
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleMessages, isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (selectedThread === 'general') {
      // Only Admin and Tesorera can write in general announcements channel
      if (currentUser.role !== 'Admin' && currentUser.role !== 'Tesorera') {
        alert('Solo los administradores y tesoreros pueden enviar anuncios en el canal general.');
        return;
      }
    }

    sendChatMessage(
      currentUser.id,
      currentUser.nombre,
      currentUser.role,
      text,
      selectedThread
    );

    setText('');
  };

  const handleDeleteMessage = (msgId: string) => {
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Tesorera') return;
    if (confirm('¿Estás seguro de que deseas eliminar este mensaje del Soporte General?')) {
      deleteChatMessage(msgId);
    }
  };

  const isWriteLocked = selectedThread === 'general' && currentUser.role !== 'Admin' && currentUser.role !== 'Tesorera';

  // Count active unlocked requests for helper badges (Admins/Treasurers only)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  useEffect(() => {
    const checkRequests = () => {
      const pending = getCierresCaja().filter(c => c.solicitaDesbloqueo).length;
      setPendingRequestsCount(pending);
    };
    checkRequests();
    const unsubscribe = subscribeToDatabase(checkRequests);
    return () => unsubscribe();
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      
      {/* Floating Action Button */}
      <button
        id="chat-floating-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="relative group p-4 bg-gradient-to-tr from-[#1A2D7C] to-indigo-900 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center border-2 border-white/20"
      >
        <MessageSquare className="h-6 w-6 text-white" />
        
        {/* Unread & Notification Counter Badge */}
        {(unreadCount > 0 || (currentUser.role !== 'Cajera' && pendingRequestsCount > 0)) && (
          <span className="absolute -top-1.5 -right-1.5 bg-[#F47920] text-white text-[10px] font-black h-5.5 w-5.5 rounded-full flex items-center justify-center animate-bounce shadow-md">
            {unreadCount > 0 ? unreadCount : '🔔'}
          </span>
        )}
      </button>

      {/* Chat Popover dialogue */}
      {isOpen && (
        <div 
          id="chat-dialogue-window" 
          className="absolute bottom-20 right-0 w-85 sm:w-96 h-[510px] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300"
        >
          {/* Header */}
          <div className="bg-[#1A2D7C] p-4 text-white flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/10 rounded-lg">
                <MessageSquare className="h-4.5 w-4.5 text-[#F47920]" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                  Centro de Soporte y Chat
                  {currentUser.role !== 'Cajera' && pendingRequestsCount > 0 && (
                    <span className="bg-[#F47920] text-[9px] font-black uppercase text-white px-1.5 py-0.5 rounded-full animate-pulse">
                      {pendingRequestsCount} PENDIENTE
                    </span>
                  )}
                </h4>
                <p className="text-[9.5px] text-slate-300 font-medium">Línea de soporte y avisos en tiempo real</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Sound Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!soundEnabled) playNotificationChime();
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  soundEnabled ? 'text-[#F47920] hover:bg-white/10' : 'text-slate-400 hover:bg-white/10'
                }`}
                title={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
              >
                <Volume2 className="h-4.5 w-4.5" />
              </button>

              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Thread selector */}
          <div className="bg-slate-100 p-2.5 border-b border-slate-200 flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider font-space">Canal:</span>
            <select
              value={selectedThread}
              onChange={(e) => setSelectedThread(e.target.value)}
              className="flex-1 text-[11px] font-bold p-1 bg-white border border-slate-300 rounded focus:outline-none focus:border-[#1A2D7C]"
            >
              <option value="general">
                {hasUnreadInThread('general') ? '🔴 ' : ''}📢 Soporte General (Anuncios)
              </option>
              {allowedRecipients.map(r => (
                <option key={r.id} value={r.id}>
                  {hasUnreadInThread(r.id) ? '🔴 ' : ''}👤 {r.nombre} ({r.role})
                </option>
              ))}
            </select>
            {selectedThread !== 'general' && (
              <button
                type="button"
                onClick={async () => {
                  const targetUser = allowedRecipients.find(r => r.id === selectedThread);
                  if (targetUser) {
                    try {
                      await startVideoCall(
                        currentUser.id,
                        currentUser.nombre,
                        currentUser.role,
                        targetUser.id,
                        targetUser.nombre
                      );
                    } catch (e) {
                      console.error("Error starting video call:", e);
                    }
                  }
                }}
                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer shadow-sm flex items-center justify-center shrink-0"
                title="Llamar por Google Meet"
              >
                <Video className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Write permission warning notice or helpful tips */}
          {isWriteLocked && (
            <div className="bg-amber-50 border-b border-amber-100 px-3 py-2 text-[10.5px] text-amber-900 leading-relaxed font-semibold flex items-center gap-2 shrink-0">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Soporte General es de solo lectura. Solo los Administradores pueden publicar anuncios generales.</span>
            </div>
          )}

          {selectedThread !== 'general' && (
            <div className="bg-indigo-50 border-b border-indigo-100 px-3 py-1.5 text-[10px] text-[#1A2D7C] leading-normal font-semibold flex items-center gap-1.5 shrink-0">
              <Sparkles className="h-3 w-3 text-[#1A2D7C] shrink-0" />
              <span>Chateando en canal directo de soporte seguro.</span>
            </div>
          )}

          {/* Messages list */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3.5">
            {visibleMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <p className="text-xs text-slate-400 font-semibold italic">No hay mensajes registrados en este canal.</p>
                {!isWriteLocked && (
                  <p className="text-[10px] text-slate-450 leading-relaxed font-medium">Escribe un mensaje de soporte a continuación para iniciar el diálogo directo.</p>
                )}
              </div>
            ) : (
              visibleMessages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                const isGeneralChannel = selectedThread === 'general';
                
                return (
                  <div key={msg.id} className="flex flex-col group/msg relative">
                    
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {/* Sender identity role header */}
                      {!isMe && (
                        <span className="text-[9px] font-black text-slate-500 mb-0.5 ml-1 flex items-center gap-1">
                          {msg.senderRole === 'Admin' ? (
                            <Shield className="h-2.5 w-2.5 text-purple-600 inline" />
                          ) : msg.senderRole === 'Tesorera' ? (
                            <Sparkles className="h-2.5 w-2.5 text-[#F47920] inline" />
                          ) : (
                            <Building2 className="h-2.5 w-2.5 text-emerald-600 inline" />
                          )}
                          {msg.senderName}
                        </span>
                      )}
                      
                      {/* Bubble content */}
                      <div className={`flex items-center gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {msg.text.includes('[REVERSION_PENDIENTE]') ? (() => {
                          const lines = msg.text.split('\n');
                          const colaboradorLine = lines.find(l => l.includes('• Colaborador:'));
                          const colaborador = colaboradorLine ? colaboradorLine.replace('• Colaborador:', '').trim() : '';

                          const transaccionLine = lines.find(l => l.includes('• Transacción:'));
                          const transaccion = transaccionLine ? transaccionLine.replace('• Transacción:', '').trim() : '';

                          const valorLine = lines.find(l => l.includes('• Valor:'));
                          const valor = valorLine ? valorLine.replace('• Valor:', '').trim() : '';

                          const sedeLine = lines.find(l => l.includes('• Sede:'));
                          const sede = sedeLine ? sedeLine.replace('• Sede:', '').trim() : '';

                          const motivoLine = lines.find(l => l.includes('• Motivo:'));
                          const motivo = motivoLine ? motivoLine.replace('• Motivo:', '').trim() : '';

                          const txIdLine = lines.find(l => l.includes('• TxId:'));
                          const txId = txIdLine ? txIdLine.replace('• TxId:', '').trim() : '';

                          const tx = getTransactions().find(t => t.id === txId);
                          const advisorsList = getAdvisors();

                          return (
                            <div className="rounded-2xl p-3 bg-amber-50 border border-amber-200 text-slate-800 text-xs shadow-sm max-w-[95%]">
                              <div className="flex items-center gap-1.5 font-bold text-amber-800 mb-2">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                                <span>Solicitud de Reversión</span>
                              </div>
                              <div className="space-y-1 text-[11px] mb-2 font-medium">
                                <div><span className="font-bold text-slate-600">Sede:</span> {sede}</div>
                                <div><span className="font-bold text-slate-600">Usuario:</span> {colaborador}</div>
                                <div><span className="font-bold text-slate-600">Transacción:</span> {transaccion}</div>
                                <div><span className="font-bold text-slate-600">Valor:</span> {valor}</div>
                                <div className="bg-white/80 p-1.5 rounded border border-amber-100 italic mt-1 text-slate-700">
                                  <span className="font-bold not-italic text-slate-600 block text-[9px] uppercase tracking-wider">Motivo:</span>
                                  "{motivo}"
                                </div>
                              </div>

                              {/* Status Badges */}
                              {(!tx || !tx.solicitudCambio) && (
                                <div className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-100 rounded p-1 text-center mt-1">
                                  ❌ Solicitud Rechazada o Resuelta
                                </div>
                              )}
                              {tx && tx.solicitudCambio === 'liberado' && (
                                <div className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 rounded p-1 text-center mt-1 font-sans">
                                  ✅ Aprobada • Transacción Liberada
                                </div>
                              )}
                              {tx && tx.solicitudCambio === 'corregido' && (
                                <div className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 rounded p-1 text-center mt-1 font-sans">
                                  ✅ Corregida por Admin
                                </div>
                              )}

                              {/* Pending actions for Admin */}
                              {tx && tx.solicitudCambio === 'pendiente' && (
                                <>
                                  {currentUser.role === 'Admin' || currentUser.role === 'Tesorera' ? (
                                    <div className="mt-2 space-y-1">
                                      {editingRequestMsgId === msg.id ? (
                                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-inner space-y-2 mt-1">
                                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Editar & Corregir</div>
                                          
                                          <div>
                                            <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Asesor:</label>
                                            <select
                                              value={editAsesor}
                                              onChange={(e) => setEditAsesor(e.target.value)}
                                              className="w-full text-[10px] p-1 border border-slate-300 rounded font-semibold bg-white"
                                            >
                                              <option value="">Seleccione asesor...</option>
                                              {advisorsList.map(adv => (
                                                <option key={adv} value={adv}>{adv}</option>
                                              ))}
                                            </select>
                                          </div>

                                          <div>
                                            <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Documento:</label>
                                            <select
                                              value={editDocType}
                                              onChange={(e) => setEditDocType(e.target.value as any)}
                                              className="w-full text-[10px] p-1 border border-slate-300 rounded font-semibold bg-white"
                                            >
                                              <option value="Recibo">Recibo</option>
                                              <option value="Remisión">Remisión</option>
                                              <option value="Ignorado">Ignorado</option>
                                            </select>
                                          </div>

                                          {editDocType === 'Ignorado' && (
                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Justificación de Ignorado:</label>
                                              <input
                                                type="text"
                                                value={editJustificacion}
                                                onChange={(e) => setEditJustificacion(e.target.value)}
                                                className="w-full text-[10px] p-1 border border-slate-300 rounded bg-white"
                                                placeholder="Ej: Duplicado, error..."
                                                required
                                              />
                                            </div>
                                          )}

                                          <div className="flex gap-1 pt-1">
                                            <button
                                              type="button"
                                              onClick={() => setEditingRequestMsgId(null)}
                                              className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[9px] rounded transition-colors cursor-pointer"
                                            >
                                              Cancelar
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (editDocType === 'Ignorado' && !editJustificacion.trim()) {
                                                  alert('Por favor ingrese la justificación para Ignorado.');
                                                  return;
                                                }
                                                resolveTransactionChange(tx.id, 'corregir', currentUser.nombre, {
                                                  asesor: editAsesor || null,
                                                  tipoDocumento: editDocType,
                                                  justificacionIgnorado: editDocType === 'Ignorado' ? editJustificacion : null
                                                }, currentUser.role);
                                                setEditingRequestMsgId(null);
                                              }}
                                              className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] rounded shadow-sm transition-colors cursor-pointer"
                                            >
                                              Guardar
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-3 gap-1 mt-1.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (confirm('¿Confirmar reversión y liberar transacción? Volverá a estar disponible para conciliar.')) {
                                                resolveTransactionChange(tx.id, 'liberar', currentUser.nombre, undefined, currentUser.role);
                                              }
                                            }}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white py-1 px-1 rounded text-[9px] font-black uppercase shadow transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                                            title="Confirmar liberación"
                                          >
                                            <Check className="h-2.5 w-2.5" />
                                            Confirmar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (confirm('¿Rechazar esta solicitud de reversión?')) {
                                                rejectTransactionChange(tx.id, currentUser.nombre);
                                              }
                                            }}
                                            className="bg-rose-600 hover:bg-rose-700 text-white py-1 px-1 rounded text-[9px] font-black uppercase shadow transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                                            title="Rechazar solicitud"
                                          >
                                            <X className="h-2.5 w-2.5" />
                                            Rechazar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingRequestMsgId(msg.id);
                                              setEditAsesor(tx.asesor || '');
                                              setEditDocType(tx.tipoDocumento || 'Remisión');
                                              setEditJustificacion(tx.justificacionIgnorado || '');
                                            }}
                                            className="bg-slate-700 hover:bg-slate-800 text-white py-1 px-1 rounded text-[9px] font-black uppercase shadow transition-all flex items-center justify-center gap-0.5 cursor-pointer"
                                            title="Editar y Corregir"
                                          >
                                            <Edit className="h-2.5 w-2.5" />
                                            Editar
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] font-bold text-amber-800 bg-amber-100 rounded-lg p-1.5 text-center mt-2 flex items-center justify-center gap-1 font-sans">
                                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                                      ⏳ Pendiente de aprobación por Admin
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })() : (
                          <div 
                            className={`rounded-2xl p-3 text-xs leading-relaxed font-medium shadow-sm ${
                              isMe 
                                ? 'bg-[#1A2D7C] text-white rounded-tr-none' 
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                            }`}
                          >
                            {msg.text}
                          </div>
                        )}

                        {/* Admin delete message button - only in general announcements and for Admin roles */}
                        {isGeneralChannel && (currentUser.role === 'Admin' || currentUser.role === 'Tesorera') && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-all cursor-pointer shadow-sm shrink-0 opacity-100 md:opacity-0 md:group-hover/msg:opacity-100"
                            title="Eliminar mensaje"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Timestamp indicator */}
                      <span className="text-[8px] font-mono font-bold text-slate-400 mt-0.5 px-1.5">
                        {msg.timestamp.split(' ')[1] || msg.timestamp}
                      </span>
                    </div>

                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0 font-sans">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isWriteLocked ? "Anuncios exclusivos para administradores" : "Escribe un mensaje de soporte..."}
              disabled={isWriteLocked}
              className={`flex-1 text-xs font-bold p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-[#1A2D7C] placeholder:text-slate-400 placeholder:font-normal ${
                isWriteLocked ? 'bg-slate-50 border-dashed border-slate-250 cursor-not-allowed' : ''
              }`}
            />
            <button
              type="submit"
              disabled={isWriteLocked}
              className={`p-2.5 rounded-xl transition-all shadow flex items-center justify-center shrink-0 ${
                isWriteLocked 
                  ? 'bg-slate-300 text-slate-400 cursor-not-allowed' 
                  : 'bg-[#1A2D7C] hover:bg-indigo-950 text-white cursor-pointer'
              }`}
            >
              <Send className="h-4.5 w-4.5 text-white" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
