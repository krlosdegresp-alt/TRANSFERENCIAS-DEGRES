import { Transaction, User, Role, Sede, AuditLog, CierreCaja, UploadBatch, ChatMessage } from './types';
import { getColombiaDateTime } from './utils/formato';

// Predefined accounts for login
export const PREDEFINED_USERS: User[] = [
  { id: 'u0', email: 'gestioncalidad@degrescolombia.com', nombre: 'Gestión Calidad (Admin)', role: 'Admin', password: 'Admin123' },
  { id: 'u1', email: 'admin@degrescolombia.com', nombre: 'Admin General', role: 'Admin', password: 'Admin123' },
  { id: 'u2', email: 'tesorera@degrescolombia.com', nombre: 'Marta Delgado (Tesorería)', role: 'Tesorera', password: 'Tesorera123' },
  { id: 'u3', email: 'cajera.guayabal@degrescolombia.com', nombre: 'Lucía Pérez (Caja Guayabal)', role: 'Cajera', sede: 'Guayabal', password: 'Sede123' },
  { id: 'u4', email: 'cajera.sabaneta@degrescolombia.com', nombre: 'Sofía Montoya (Caja Sabaneta)', role: 'Cajera', sede: 'Sabaneta', password: 'Sede123' },
  { id: 'u5', email: 'cajera.naranjal@degrescolombia.com', nombre: 'Claudia Giraldo (Caja Naranjal)', role: 'Cajera', sede: 'Naranjal', password: 'Sede123' },
  { id: 'u6', email: 'asesor@degrescolombia.com', nombre: 'Mateo Osorio (Socio Comercial)', role: 'Asesor', password: 'Asesor123' }
];

export const PREDEFINED_ADVISORS: string[] = [];

// Localstorage keys
const STORAGE_USER_KEY = 'transf_current_user';
const STORAGE_USERS_KEY = 'transf_registered_users';
const STORAGE_TRANS_KEY = 'transf_transactions';
const STORAGE_LOGS_KEY = 'transf_audit_logs';
const STORAGE_CIERRES_KEY = 'transf_cierres_caja';
const STORAGE_BATCHES_KEY = 'transf_upload_batches';


export function getUsers(): User[] {
  const data = localStorage.getItem(STORAGE_USERS_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(PREDEFINED_USERS));
    return PREDEFINED_USERS;
  }
  try {
    const parsed = JSON.parse(data) as User[];
    // Check if we still have references to user emails with the old domain 'transferencias.com'
    const hasOldDomain = parsed.some(user => user.email.toLowerCase().endsWith('@transferencias.com'));
    const possessesNewAdmin = parsed.some(user => user.email.toLowerCase() === 'gestioncalidad@degrescolombia.com');
    
    if (hasOldDomain || !possessesNewAdmin) {
      // Force refresh/migration to clean, predefined degrescolombia.com accounts
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(PREDEFINED_USERS));
      return PREDEFINED_USERS;
    }

    // Safety auto-migration check: If any predefined user has an undefined or empty password,
    // restore their default key so login security will enforce credentials correctly.
    let updatedNeeded = false;
    const migrated = parsed.map(user => {
      const predefinedDef = PREDEFINED_USERS.find(pu => pu.email.toLowerCase() === user.email.toLowerCase());
      if (predefinedDef && !user.password) {
        updatedNeeded = true;
        return { ...user, password: predefinedDef.password };
      }
      return user;
    });

    if (updatedNeeded) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return parsed;
  } catch (e) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(PREDEFINED_USERS));
    return PREDEFINED_USERS;
  }
}

export function saveUsers(users: User[]) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  notifyListeners();
}

// Event bus for real-time reactivity without page reload
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToDatabase(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners() {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Error in listener update', e);
    }
  });
}

// Initial mockup data for transactions so that the dashboard doesn't start completely blank
const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_6519_20260619_0915_543000_transferencia_qr',
    llaveUnica: 'tx_6519_20260619_0915_543000_transferencia_qr',
    fecha: '2026-06-19',
    hora: '09:15:32',
    descripcion: 'TRANSFERENCIA INSTANTANEA QR BANCO',
    valor: 543000,
    cuenta: '987000006519',
    sede: 'Guayabal',
    identificada: false,
    fechaCarga: '2026-06-19 08:00:00',
    esHistorico: false
  },
  {
    id: 'tx_0916_20260619_1030_125000_transferencia_corresponsal',
    llaveUnica: 'tx_0916_20260619_1030_125000_transferencia_corresponsal',
    fecha: '2026-06-19',
    hora: '10:30:15',
    descripcion: 'PAGO QR COBRU ADM',
    valor: 125000,
    cuenta: '123000000916',
    sede: 'Sabaneta',
    identificada: true,
    fechaIdentificacion: '2026-06-19 11:20:00',
    usuarioIdentificacion: 'Sofía Montoya (Caja Sabaneta)',
    asesor: 'Mateo Osorio (Socio Comercial)',
    tipoDocumento: 'Remisión',
    fechaCarga: '2026-06-19 08:00:00',
    esHistorico: false
  },
  {
    id: 'tx_6807_20260619_1110_980000_transf_app_bancaria',
    llaveUnica: 'tx_6807_20260619_1110_980000_transf_app_bancaria',
    fecha: '2026-06-19',
    hora: '11:10:00',
    descripcion: 'TRANSFERENCIA DE CUENTA A CUENTA',
    valor: 980000,
    cuenta: '456000006807',
    sede: 'Naranjal',
    identificada: false,
    fechaCarga: '2026-06-19 08:00:00',
    esHistorico: false
  },
  {
    id: 'tx_6519_20260618_1422_320000_abono_cliente',
    llaveUnica: 'tx_6519_20260618_1422_320000_abono_cliente',
    fecha: '2026-06-18',
    hora: '14:22:45',
    descripcion: 'PAGO RECI QR SEDE 1',
    valor: 320000,
    cuenta: '987000006519',
    sede: 'Guayabal',
    identificada: true,
    fechaIdentificacion: '2026-06-18 15:00:00',
    usuarioIdentificacion: 'Lucía Pérez (Caja Guayabal)',
    asesor: 'Mateo Osorio (Socio Comercial)',
    tipoDocumento: 'Recibo',
    fechaCarga: '2026-06-18 17:00:00',
    esHistorico: false
  },
  {
    id: 'tx_0916_20260618_0845_450000_compra_mayo',
    llaveUnica: 'tx_0916_20260618_0845_450000_compra_mayo',
    fecha: '2026-06-18',
    hora: '08:45:10',
    descripcion: 'TRANSFERENCIA ACH BANCO EXT',
    valor: 450000,
    cuenta: '123000000916',
    sede: 'Sabaneta',
    identificada: false,
    fechaCarga: '2026-06-18 17:00:00',
    esHistorico: false
  }
];

// Auth Operations
export function getCurrentUser(): User | null {
  const data = localStorage.getItem(STORAGE_USER_KEY);
  if (!data) return null;
  try {
    const user = JSON.parse(data) as User;
    if (user && user.email && user.email.toLowerCase().endsWith('@transferencias.com')) {
      localStorage.removeItem(STORAGE_USER_KEY);
      return null;
    }
    return user;
  } catch (e) {
    return null;
  }
}

export function loginUser(email: string, role?: Role, mockSede?: Sede): User {
  const users = getUsers();
  // We match users STRICTLY by their normalized email address. This prevents matching different users with similar roles or branches.
  const existing = users.find(
    u => u.email.toLowerCase() === email.toLowerCase()
  );

  const finalUser = existing || {
    id: 'custom_' + Date.now(),
    email: email,
    nombre: email.split('@')[0].toUpperCase(),
    role: role || 'Cajera',
    password: 'Degres123',
    sede: mockSede || 'Guayabal'
  };

  // Auto-register dynamically if they log in manual so they can be managed in Admin Pane
  if (!existing) {
    const updatedUsers = [...users, finalUser];
    saveUsers(updatedUsers);
  }

  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(finalUser));
  addAuditLog(finalUser.nombre, 'Inicio de Sesión', `Usuario con rol ${finalUser.role} ingresó al aplicativo.`);
  return finalUser;
}

export function logoutUser() {
  const currentUser = getCurrentUser();
  if (currentUser) {
    addAuditLog(currentUser.nombre, 'Cierre de Sesión', `Usuario cerró sesión manualmente.`);
  }
  localStorage.removeItem(STORAGE_USER_KEY);
}

// Transaction Operations
export function getTransactions(): Transaction[] {
  const data = localStorage.getItem(STORAGE_TRANS_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
    return INITIAL_TRANSACTIONS;
  }
  try {
    const parsed = JSON.parse(data) as Transaction[];
    const badAdvisors = ['Carlos Mendoza', 'Ana María Gómez', 'Sonia Restrepo', 'Juan David Trujillo', 'Diana Cardona', 'Andrés Felipe'];
    let migrated = false;
    const cleaned = parsed.map(tx => {
      if (tx.asesor && badAdvisors.some(bad => tx.asesor!.trim().toLowerCase() === bad.trim().toLowerCase())) {
        migrated = true;
        return { ...tx, asesor: 'Mateo Osorio (Socio Comercial)' };
      }
      return tx;
    });
    if (migrated) {
      localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify(cleaned));
      return cleaned;
    }
    return parsed;
  } catch (e) {
    return [];
  }
}

export function saveTransactions(txs: Transaction[]) {
  localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify(txs));
  notifyListeners();
}

/**
 * Returns the recorded list of uploaded Excel/CSV files.
 */
export function getUploadBatches(): UploadBatch[] {
  const data = localStorage.getItem(STORAGE_BATCHES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as UploadBatch[];
  } catch (e) {
    return [];
  }
}

/**
 * Saves the recorded upload batches to persistent localStorage.
 */
export function saveUploadBatches(batches: UploadBatch[]) {
  localStorage.setItem(STORAGE_BATCHES_KEY, JSON.stringify(batches));
  notifyListeners();
}

/**
 * Uploads a list of parsed transactions and assigns them a stable batch trace.
 * Ignores duplicates automatically based on checking the llaveUnica.
 */
export function uploadBankTransactions(
  newTxs: Transaction[], 
  uploaderName: string, 
  fileName?: string
): { imported: number; duplicates: number } {
  const current = getTransactions();
  const currentKeysSet = new Set(current.map(tx => tx.llaveUnica));

  // Generate a cryptographically simple and unique batch ID
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let imported = 0;
  let duplicates = 0;
  const toAdd: Transaction[] = [];

  newTxs.forEach(tx => {
    if (currentKeysSet.has(tx.llaveUnica)) {
      duplicates++;
    } else {
      toAdd.push({
        ...tx,
        batchId // associate this specific transaction with the batch
      });
      imported++;
    }
  });

  if (toAdd.length > 0) {
    const updated = [...toAdd, ...current]; // Put newest at the top
    saveTransactions(updated);
  }

  if (newTxs.length > 0) {
    // Save batch log metadata (even if zero are imported, we track the action)
    const batches = getUploadBatches();
    const newBatch: UploadBatch = {
      id: batchId,
      nombreArchivo: fileName || 'archivo_movimientos.xlsx',
      fechaCarga: getColombiaDateTime().dateTimeStr,
      usuario: uploaderName,
      totalLeidos: newTxs.length,
      totalImportados: imported,
      totalDuplicados: duplicates
    };
    batches.unshift(newBatch);
    saveUploadBatches(batches);

    addAuditLog(
      uploaderName,
      'Carga de Archivo',
      `Subió '${newBatch.nombreArchivo}'. Registros: ${newTxs.length}. Importados: ${imported}, Duplicados: ${duplicates}`
    );
  }

  return { imported, duplicates };
}

/**
 * Reverts/deletes a loaded excel batch, removing all transactions imported through it.
 */
export function revertUploadBatch(batchId: string, adminName: string): boolean {
  const batches = getUploadBatches();
  const batchIdx = batches.findIndex(b => b.id === batchId);
  if (batchIdx === -1) return false;

  const batch = batches[batchIdx];

  // Filter out transactions belonging to this batch
  const currentTxs = getTransactions();
  const beforeCount = currentTxs.length;
  const filteredTxs = currentTxs.filter(tx => tx.batchId !== batchId);
  const deletedCount = beforeCount - filteredTxs.length;

  saveTransactions(filteredTxs);

  // Remove the batch log too
  batches.splice(batchIdx, 1);
  saveUploadBatches(batches);

  addAuditLog(
    adminName,
    'Eliminación de Archivo Cargado',
    `Eliminó el lote de carga del archivo '${batch.nombreArchivo}' (ID: ${batchId}). Se removieron ${deletedCount} transacciones de las sucursales.`
  );

  return true;
}


/**
 * Identifies a transaction as completed (Cajera action).
 */
export function identifyTransaction(
  id: string,
  asesor: string | null,
  tipoDocumento: 'Recibo' | 'Remisión' | 'Ignorado',
  cajeraName: string,
  nroReciboCaja?: string | null,
  justificacionIgnorado?: string | null
): boolean {
  const current = getTransactions();
  const idx = current.findIndex(tx => tx.id === id);
  if (idx === -1) return false;

  // Verify it isn't already identified (or only let it pass if updating tags before completion)
  if (current[idx].identificada) return false;

  current[idx] = {
    ...current[idx],
    identificada: true,
    fechaIdentificacion: getColombiaDateTime().dateTimeStr,
    usuarioIdentificacion: cajeraName,
    asesor: tipoDocumento === 'Ignorado' ? null : (asesor || null),
    tipoDocumento,
    nroReciboCaja: tipoDocumento === 'Ignorado' ? null : (nroReciboCaja || null),
    justificacionIgnorado: tipoDocumento === 'Ignorado' ? (justificacionIgnorado || null) : null
  };

  saveTransactions(current);
  addAuditLog(
    cajeraName,
    tipoDocumento === 'Ignorado' ? 'Pago Ignorado' : 'Validación de Pago',
    tipoDocumento === 'Ignorado'
      ? `Ignoró transacción ${current[idx].llaveUnica.slice(0, 15)}... - Razón: ${justificacionIgnorado}`
      : `Identificó transacción ${current[idx].llaveUnica.slice(0, 15)}... como ${tipoDocumento} - Asesor: ${asesor || 'No especificado'}`
  );
  return true;
}

/**
 * Reverts an identified transaction back to pending state (Admin action).
 */
export function revertIdentification(id: string, adminName: string): boolean {
  const current = getTransactions();
  const idx = current.findIndex(tx => tx.id === id);
  if (idx === -1) return false;

  const originalDoc = current[idx].tipoDocumento;
  const originalAsesor = current[idx].asesor;

  current[idx] = {
    ...current[idx],
    identificada: false,
    fechaIdentificacion: null,
    usuarioIdentificacion: null,
    asesor: null,
    tipoDocumento: null,
    nroReciboCaja: null
  };

  saveTransactions(current);
  addAuditLog(
    adminName,
    'Reversión de Identificación',
    `Revirtió transacción ${id.slice(0, 15)}... (Era ${originalDoc}, Asesor: ${originalAsesor})`
  );
  return true;
}

/**
 * Deletes or archives all transactions as historical (Admin monthly action).
 */
export function executeMonthlyCleanup(adminName: string): { totalArchived: number } {
  const current = getTransactions();
  
  // Set all current active transactions to historic: true
  const updated = current.map(tx => ({
    ...tx,
    esHistorico: true
  }));

  saveTransactions(updated);
  addAuditLog(
    adminName,
    'Limpieza Mensual',
    `Ejecutó cierre del mes. Se archivaron ${updated.filter(t => !t.esHistorico).length} transacciones para consulta histórica.`
  );

  return { totalArchived: updated.length };
}

// Audit Logs
export function getAuditLogs(): AuditLog[] {
  const data = localStorage.getItem(STORAGE_LOGS_KEY);
  if (!data) {
    const initial: AuditLog[] = [
      {
        id: 'log_1',
        timestamp: getColombiaDateTime().dateTimeStr,
        usuario: 'Sistema',
        accion: 'Inicialización',
        detalles: 'Base de datos de transferencias lista.'
      }
    ];
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
}

export function addAuditLog(usuario: string, accion: string, detalles: string) {
  const logs = getAuditLogs();
  const newLog: AuditLog = {
    id: 'log_' + Date.now() + Math.random().toString(36).substr(2, 4),
    timestamp: getColombiaDateTime().dateTimeStr,
    usuario,
    accion,
    detalles
  };
  localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify([newLog, ...logs].slice(0, 500))); // limit to last 500 logs
}

/**
 * Returns a connection health summary details for reference or diagnostics
 */
export function checkFirebaseStatus(): { status: string; persistence: string } {
  return {
    status: 'Real-Time Synchronized (Local-Mirror Mode)',
    persistence: 'LocalStorage Persisted + Active Frame Events'
  };
}

export function getCierresCaja(): CierreCaja[] {
  const data = localStorage.getItem(STORAGE_CIERRES_KEY);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data) as CierreCaja[];
  } catch (e) {
    return [];
  }
}

export function saveCierresCaja(cierres: CierreCaja[]) {
  localStorage.setItem(STORAGE_CIERRES_KEY, JSON.stringify(cierres));
  notifyListeners();
}

export function registrarCierreCaja(fecha: string, sede: Sede, nombreCajera: string, totalDeclarado: number): CierreCaja {
  const cierres = getCierresCaja();
  const id = `cierre_${sede}_${fecha}`;
  
  // Find if a closure already exists for this Sede & Date
  const existingIdx = cierres.findIndex(c => c.id === id);
  
  const nuevoCierre: CierreCaja = {
    id,
    fecha,
    sede,
    nombreCajera,
    totalDeclarado,
    fechaCreacion: getColombiaDateTime().dateTimeStr
  };
  
  if (existingIdx >= 0) {
    cierres[existingIdx] = nuevoCierre;
  } else {
    cierres.push(nuevoCierre);
  }
  
  saveCierresCaja(cierres);
  addAuditLog(
    nombreCajera, 
    'Cierre de Caja Guardado', 
    `Sede: ${sede}, Fecha: ${fecha}, Declarado: $${totalDeclarado.toLocaleString('es-CO')}`
  );
  return nuevoCierre;
}

export function solicitarDesbloqueoCierre(fecha: string, sede: Sede, motivo: string, usuario: string): boolean {
  const cierres = getCierresCaja();
  const id = `cierre_${sede}_${fecha}`;
  const idx = cierres.findIndex(c => c.id === id);
  if (idx >= 0) {
    cierres[idx] = {
      ...cierres[idx],
      solicitaDesbloqueo: true,
      motivoDesbloqueo: motivo
    };
    saveCierresCaja(cierres);
    addAuditLog(usuario, 'Solicitud Desbloqueo Cierre', `Sede: ${sede}, Fecha: ${fecha}, Motivo: ${motivo}`);
    return true;
  }
  return false;
}

export function aprobarDesbloqueoCierre(fecha: string, sede: Sede, adminUser: string): boolean {
  const cierres = getCierresCaja();
  const id = `cierre_${sede}_${fecha}`;
  const filtered = cierres.filter(c => c.id !== id);
  if (filtered.length !== cierres.length) {
    saveCierresCaja(filtered);
    addAuditLog(adminUser, 'Desbloqueo Cierre Aprobado', `Se desbloqueó y eliminó el cierre de caja de la Sede: ${sede} para la Fecha: ${fecha}`);
    return true;
  }
  return false;
}

export function rechazarDesbloqueoCierre(fecha: string, sede: Sede, adminUser: string): boolean {
  const cierres = getCierresCaja();
  const id = `cierre_${sede}_${fecha}`;
  const idx = cierres.findIndex(c => c.id === id);
  if (idx >= 0) {
    cierres[idx] = {
      ...cierres[idx],
      solicitaDesbloqueo: false,
      motivoDesbloqueo: null
    };
    saveCierresCaja(cierres);
    addAuditLog(adminUser, 'Desbloqueo Cierre Rechazado', `Se rechazó la solicitud de desbloqueo del cierre de caja de la Sede: ${sede} para la Fecha: ${fecha}`);
    return true;
  }
  return false;
}

export function clearAllDatabase(usuario: string) {
  localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify([]));
  localStorage.setItem(STORAGE_BATCHES_KEY, JSON.stringify([]));
  localStorage.setItem(STORAGE_CIERRES_KEY, JSON.stringify([]));
  addAuditLog(usuario, 'Limpieza Total', 'Se borraron todas las transacciones, exceles subidos e historial de cierres de caja del sistema.');
  notifyListeners();
}

export function getAdvisors(): string[] {
  const list = new Set<string>();

  // Add any registered users whose role is 'Asesor'
  getUsers().forEach(user => {
    if (user.role === 'Asesor' && user.nombre) {
      list.add(user.nombre.trim());
    }
  });

  // Keep any advisor recorded on transactions
  getTransactions().forEach(tx => {
    if (tx.identificada && tx.asesor) {
      list.add(tx.asesor.trim());
    }
  });

  return Array.from(list);
}

const STORAGE_CHAT_KEY = 'transferencias_chat_messages';

export function getChatMessages(): ChatMessage[] {
  const data = localStorage.getItem(STORAGE_CHAT_KEY);
  if (!data) {
    const initial: ChatMessage[] = [
      {
        id: 'init_1',
        senderId: 'admin_test',
        senderName: 'Soporte Administrativo (S.A.S)',
        senderRole: 'Admin',
        text: '¡Hola a todos! Este es el canal de chat y soporte para conciliar los cierres de caja y cuadres diarios.',
        timestamp: getColombiaDateTime().dateTimeStr,
        receiverId: null
      }
    ];
    localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
}

export function sendChatMessage(senderId: string, senderName: string, senderRole: Role, text: string, receiverId?: string | null): ChatMessage {
  const messages = getChatMessages();
  const newMessage: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    senderId,
    senderName,
    senderRole,
    receiverId: receiverId || null,
    text,
    timestamp: getColombiaDateTime().dateTimeStr
  };
  messages.push(newMessage);
  localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
  notifyListeners();
  return newMessage;
}

export function deleteChatMessage(id: string): boolean {
  const messages = getChatMessages();
  const filtered = messages.filter(msg => msg.id !== id);
  if (filtered.length !== messages.length) {
    localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(filtered));
    notifyListeners();
    return true;
  }
  return false;
}


