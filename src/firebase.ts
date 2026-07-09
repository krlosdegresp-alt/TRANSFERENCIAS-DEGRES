import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  deleteField 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Transaction, User, Role, Sede, AuditLog, CierreCaja, UploadBatch, ChatMessage, VideoCall } from './types';
import { getColombiaDateTime } from './utils/formato';

// Firebase configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyBlKnYrZy8nQj6KgP7qCW9k1F-QeCK2Oyo",
  authDomain: "gen-lang-client-0899368462.firebaseapp.com",
  projectId: "gen-lang-client-0899368462",
  storageBucket: "gen-lang-client-0899368462.firebasestorage.app",
  messagingSenderId: "303118479370",
  appId: "1:303118479370:web:d2c45dbd5796070b172ff3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-transferencias-860ea925-2f2f-4216-a4f9-a6801a3ed212");
export const storage = getStorage(app);

// Predefined accounts for login
export const PREDEFINED_USERS: User[] = [
  { id: 'u0', email: 'gestioncalidad@degrescolombia.com', nombre: 'Gestión Calidad (Admin)', role: 'Admin', password: 'Admin123' },
  { id: 'u1', email: 'admin@degrescolombia.com', nombre: 'Admin General', role: 'Admin', password: 'Admin123' },
  { id: 'u2', email: 'tesorera@degrescolombia.com', nombre: 'Marta Delgado (Tesorería)', role: 'Tesorera', password: 'Tesorera123' },
  { id: 'u3', email: 'cajera.guayabal@degrescolombia.com', nombre: 'Lucía Pérez (Caja Guayabal)', role: 'Cajera', sede: 'Guayabal', password: 'Sede123' },
  { id: 'u4', email: 'cajera.sabaneta@degrescolombia.com', nombre: 'Sofía Montoya (Caja Sabaneta)', role: 'Cajera', sede: 'Sabaneta', password: 'Sede123' },
  { id: 'u5', email: 'cajera.naranjal@degrescolombia.com', nombre: 'Claudia Giraldo (Caja Naranjal)', role: 'Cajera', sede: 'Naranjal', password: 'Sede123' },
  { id: 'u6', email: 'asesor@degrescolombia.com', nombre: 'Mateo Osorio (Socio Comercial)', role: 'Asesor', password: 'Asesor123' },
  { id: 'u7', email: 'analistati@degrescolombia.com', nombre: 'Carlos Ti', role: 'Admin', password: 'Admin123' }
];

export const PREDEFINED_ADVISORS: string[] = [];

// Localstorage keys (kept for fallback and caching)
const STORAGE_USER_KEY = 'transf_current_user';
const STORAGE_USERS_KEY = 'transf_registered_users';
const STORAGE_TRANS_KEY = 'transf_transactions';
const STORAGE_LOGS_KEY = 'transf_audit_logs';
const STORAGE_CIERRES_KEY = 'transf_cierres_caja';
const STORAGE_BATCHES_KEY = 'transf_upload_batches';
const STORAGE_CHAT_KEY = 'transferencias_chat_messages';
const STORAGE_VIDEOCALLS_KEY = 'transferencias_videocalls';

// Initial mockup data for transactions so that the dashboard doesn't start completely blank if no data is in cloud
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

// Helper to sync local state array updates to Firestore collections
async function syncArrayToFirestore<T extends { id: string }>(
  collectionName: string,
  newItems: T[]
) {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const existingIds = new Set(snapshot.docs.map(doc => doc.id));
    const newIds = new Set(newItems.map(item => item.id));

    // Delete items not present in the new set
    for (const docId of existingIds) {
      if (!newIds.has(docId)) {
        await deleteDoc(doc(db, collectionName, docId));
      }
    }

    // Write / Update current ones
    for (const item of newItems) {
      await setDoc(doc(db, collectionName, item.id), item);
    }
  } catch (error) {
    console.error(`Error syncing collection ${collectionName} to Firestore:`, error);
  }
}

// ----------------------------------------------------
// REAL-TIME FIRESTORE SYNCHRONIZERS
// ----------------------------------------------------
let isInitialized = false;

export function initializeRealtimeListeners() {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Users listener
  onSnapshot(collection(db, 'users'), (snapshot) => {
    let usersList: User[] = [];
    snapshot.forEach(docSnap => {
      usersList.push(docSnap.data() as User);
    });

    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersList));
    notifyListeners();
  });

  // 2. Transactions listener
  onSnapshot(collection(db, 'transactions'), (snapshot) => {
    let txList: Transaction[] = [];
    snapshot.forEach(docSnap => {
      txList.push(docSnap.data() as Transaction);
    });

    // Sort: latest dates first
    txList.sort((a, b) => {
      const dateTimeA = `${a.fecha} ${a.hora || '00:00:00'}`;
      const dateTimeB = `${b.fecha} ${b.hora || '00:00:00'}`;
      return dateTimeB.localeCompare(dateTimeA);
    });

    localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify(txList));
    notifyListeners();
  });

  // 3. Batches listener
  onSnapshot(collection(db, 'batches'), (snapshot) => {
    const batchList: UploadBatch[] = [];
    snapshot.forEach(docSnap => {
      batchList.push(docSnap.data() as UploadBatch);
    });

    batchList.sort((a, b) => b.fechaCarga.localeCompare(a.fechaCarga));

    localStorage.setItem(STORAGE_BATCHES_KEY, JSON.stringify(batchList));
    notifyListeners();
  });

  // 4. Cierres listener
  onSnapshot(collection(db, 'cierres'), (snapshot) => {
    const cierresList: CierreCaja[] = [];
    snapshot.forEach(docSnap => {
      cierresList.push(docSnap.data() as CierreCaja);
    });

    localStorage.setItem(STORAGE_CIERRES_KEY, JSON.stringify(cierresList));
    notifyListeners();
  });

  // 5. Audit logs listener
  onSnapshot(collection(db, 'logs'), (snapshot) => {
    const logsList: AuditLog[] = [];
    snapshot.forEach(docSnap => {
      logsList.push(docSnap.data() as AuditLog);
    });

    logsList.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logsList.slice(0, 500)));
    notifyListeners();
  });

  // 6. Chat messages listener
  onSnapshot(collection(db, 'chat'), (snapshot) => {
    let chatList: ChatMessage[] = [];
    snapshot.forEach(docSnap => {
      chatList.push(docSnap.data() as ChatMessage);
    });

    chatList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(chatList));
    notifyListeners();
  });

  // 7. Video calls listener
  onSnapshot(collection(db, 'videocalls'), (snapshot) => {
    let callsList: VideoCall[] = [];
    snapshot.forEach(docSnap => {
      callsList.push(docSnap.data() as VideoCall);
    });

    // Sort: newest first
    callsList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    localStorage.setItem(STORAGE_VIDEOCALLS_KEY, JSON.stringify(callsList));
    notifyListeners();
  });
}

// Start listeners immediately on import
initializeRealtimeListeners();

// Ensure Carlos Ti and other predefined users are in Firestore if not already present
async function ensurePredefinedUsersInFirestore() {
  try {
    const usersColRef = collection(db, 'users');
    const snap = await getDocs(usersColRef);
    if (snap.empty) {
      console.log("Seeding PREDEFINED_USERS to Firestore...");
      const bWrite = writeBatch(db);
      for (const u of PREDEFINED_USERS) {
        bWrite.set(doc(db, 'users', u.id), u);
      }
      await bWrite.commit();
      console.log("PREDEFINED_USERS successfully seeded.");
    }
  } catch (error) {
    console.error("Error ensuring predefined users in Firestore:", error);
  }
}
ensurePredefinedUsersInFirestore();

// Ensure initial transactions are seeded if none exist in Firestore
async function ensurePredefinedTransactionsInFirestore() {
  try {
    const txsColRef = collection(db, 'transactions');
    const snap = await getDocs(txsColRef);
    if (snap.empty) {
      console.log("Seeding INITIAL_TRANSACTIONS to Firestore...");
      const bWrite = writeBatch(db);
      for (const tx of INITIAL_TRANSACTIONS) {
        bWrite.set(doc(db, 'transactions', tx.id), tx);
      }
      await bWrite.commit();
      console.log("INITIAL_TRANSACTIONS successfully seeded.");
    }
  } catch (error) {
    console.error("Error ensuring predefined transactions in Firestore:", error);
  }
}
ensurePredefinedTransactionsInFirestore();

// ----------------------------------------------------
// USERS OPERATIONS
// ----------------------------------------------------
export function getUsers(): User[] {
  const data = localStorage.getItem(STORAGE_USERS_KEY);
  if (data === null) return PREDEFINED_USERS;
  try {
    return JSON.parse(data) as User[];
  } catch (e) {
    return PREDEFINED_USERS;
  }
}

export async function saveUsers(users: User[]) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  notifyListeners();
  await syncArrayToFirestore('users', users);
}

export async function createUserInFirestore(user: User): Promise<void> {
  const docRef = doc(db, 'users', user.id);
  await setDoc(docRef, user);
}

export async function deleteUserInFirestore(userId: string): Promise<void> {
  const docRef = doc(db, 'users', userId);
  await deleteDoc(docRef);
}

export async function updateUserInFirestore(userId: string, changes: Partial<User>): Promise<void> {
  const docRef = doc(db, 'users', userId);
  
  const cleanChanges: Record<string, any> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) {
      cleanChanges[key] = deleteField();
    } else {
      cleanChanges[key] = value;
    }
  }
  
  await updateDoc(docRef, cleanChanges);
}

export function getCurrentUser(): User | null {
  const data = sessionStorage.getItem(STORAGE_USER_KEY);
  if (!data) return null;
  try {
    const user = JSON.parse(data) as User;
    if (user && user.email && user.email.toLowerCase().endsWith('@transferencias.com')) {
      sessionStorage.removeItem(STORAGE_USER_KEY);
      return null;
    }
    return user;
  } catch (e) {
    return null;
  }
}

export function loginUser(email: string): User | null {
  const users = getUsers();
  const existing = users.find(
    u => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!existing) {
    return null;
  }

  sessionStorage.setItem(STORAGE_USER_KEY, JSON.stringify(existing));
  addAuditLog(existing.nombre, 'Inicio de Sesión', `Usuario con rol ${existing.role} ingresó al aplicativo.`);
  return existing;
}

export function logoutUser() {
  const currentUser = getCurrentUser();
  if (currentUser) {
    addAuditLog(currentUser.nombre, 'Cierre de Sesión', `Usuario cerró sesión manualmente.`);
  }
  sessionStorage.removeItem(STORAGE_USER_KEY);
}

// ----------------------------------------------------
// TRANSACTIONS OPERATIONS
// ----------------------------------------------------
export function getTransactions(): Transaction[] {
  const data = localStorage.getItem(STORAGE_TRANS_KEY);
  if (!data) return INITIAL_TRANSACTIONS;
  try {
    return JSON.parse(data) as Transaction[];
  } catch (e) {
    return [];
  }
}

export function saveTransactions(txs: Transaction[]) {
  localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify(txs));
  notifyListeners();

  // Async bulk sync to Firestore
  (async () => {
    try {
      const chunks = [];
      for (let i = 0; i < txs.length; i += 500) {
        chunks.push(txs.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const bWrite = writeBatch(db);
        chunk.forEach(tx => {
          bWrite.set(doc(db, 'transactions', tx.id), tx);
        });
        await bWrite.commit();
      }
    } catch (e) {
      console.error("Error bulk-syncing transactions to Firestore:", e);
    }
  })();
}

// ----------------------------------------------------
// BATCHES OPERATIONS
// ----------------------------------------------------
export function getUploadBatches(): UploadBatch[] {
  const data = localStorage.getItem(STORAGE_BATCHES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as UploadBatch[];
  } catch (e) {
    return [];
  }
}

export function saveUploadBatches(batches: UploadBatch[]) {
  localStorage.setItem(STORAGE_BATCHES_KEY, JSON.stringify(batches));
  notifyListeners();
  syncArrayToFirestore('batches', batches);
}

export async function uploadBankTransactions(
  newTxs: Transaction[], 
  uploaderName: string, 
  fileName?: string,
  fileBlob?: File | null
): Promise<{ imported: number; duplicates: number }> {
  const current = getTransactions();
  const currentKeysSet = new Set(current.map(tx => tx.llaveUnica));

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
        batchId
      });
      imported++;
    }
  });

  const finalFileName = fileName || 'archivo_movimientos.xlsx';

  const batches = getUploadBatches();
  const newBatch: UploadBatch = {
    id: batchId,
    nombreArchivo: finalFileName,
    fechaCarga: getColombiaDateTime().dateTimeStr,
    usuario: uploaderName,
    totalLeidos: newTxs.length,
    totalImportados: imported,
    totalDuplicados: duplicates
  };

  // 2. Persistent upload & db save synchronously
  try {
    let downloadUrl = '';
    if (fileBlob) {
      try {
        const storageRef = ref(storage, `batches/${batchId}/${fileBlob.name}`);
        const snapshot = await uploadBytes(storageRef, fileBlob);
        downloadUrl = await getDownloadURL(snapshot.ref);
      } catch (stgErr) {
        console.error("Firebase Storage upload error:", stgErr);
      }
    }

    // Save transactions
    if (toAdd.length > 0) {
      const chunks = [];
      for (let i = 0; i < toAdd.length; i += 500) {
        chunks.push(toAdd.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const bWrite = writeBatch(db);
        chunk.forEach(tx => {
          bWrite.set(doc(db, 'transactions', tx.id), tx);
        });
        await bWrite.commit();
      }
    }

    // Save upload batch record with file URL
    const persistentBatch: UploadBatch = {
      ...newBatch,
      archivoUrl: downloadUrl || undefined
    };
    await setDoc(doc(db, 'batches', batchId), persistentBatch);

    await addAuditLog(
      uploaderName,
      'Carga de Archivo',
      `Subió '${persistentBatch.nombreArchivo}'. Registros: ${newTxs.length}. Importados: ${imported}, Duplicados: ${duplicates}`
    );
  } catch (e) {
    console.error("Error finalizing excel upload to Firestore:", e);
    throw e;
  }

  return { imported, duplicates };
}

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

  // 1. Optimistic UI update
  localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify(filteredTxs));
  batches.splice(batchIdx, 1);
  localStorage.setItem(STORAGE_BATCHES_KEY, JSON.stringify(batches));
  notifyListeners();

  // 2. Async storage and firestore cleanup
  (async () => {
    try {
      // Delete transactions from Firestore
      const txsToDelete = currentTxs.filter(tx => tx.batchId === batchId);
      for (const tx of txsToDelete) {
        await deleteDoc(doc(db, 'transactions', tx.id));
      }

      // Delete file from storage
      if (batch.archivoUrl) {
        try {
          const storageRef = ref(storage, `batches/${batchId}/${batch.nombreArchivo}`);
          await deleteObject(storageRef);
        } catch (stgErr) {
          console.error("Firebase Storage deletion error:", stgErr);
        }
      }

      // Delete batch record from Firestore
      await deleteDoc(doc(db, 'batches', batchId));

      await addAuditLog(
        adminName,
        'Eliminación de Archivo Cargado',
        `Eliminó el lote de carga del archivo '${batch.nombreArchivo}' (ID: ${batchId}). Se removieron ${deletedCount} transacciones de las sucursales.`
      );
    } catch (e) {
      console.error("Error reverting upload batch:", e);
    }
  })();

  return true;
}

// ----------------------------------------------------
// VALIDA_TRANS OPERATIONS
// ----------------------------------------------------
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

  if (current[idx].identificada) return false;

  const updatedTx = {
    ...current[idx],
    identificada: true,
    fechaIdentificacion: getColombiaDateTime().dateTimeStr,
    usuarioIdentificacion: cajeraName,
    asesor: tipoDocumento === 'Ignorado' ? null : (asesor || null),
    tipoDocumento,
    nroReciboCaja: tipoDocumento === 'Ignorado' ? null : (nroReciboCaja || null),
    justificacionIgnorado: tipoDocumento === 'Ignorado' ? (justificacionIgnorado || null) : null
  };

  current[idx] = updatedTx;

  localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify(current));
  notifyListeners();

  setDoc(doc(db, 'transactions', id), updatedTx).catch(err => {
    console.error("Error identifying transaction in Firestore:", err);
  });

  addAuditLog(
    cajeraName,
    tipoDocumento === 'Ignorado' ? 'Pago Ignorado' : 'Validación de Pago',
    tipoDocumento === 'Ignorado'
      ? `Ignoró transacción ${updatedTx.llaveUnica.slice(0, 15)}... - Razón: ${justificacionIgnorado}`
      : `Identificó transacción ${updatedTx.llaveUnica.slice(0, 15)}... como ${tipoDocumento} - Asesor: ${asesor || 'No especificado'}`
  );

  return true;
}

export function revertIdentification(id: string, adminName: string, adminRole: string = 'Admin'): boolean {
  const current = getTransactions();
  const idx = current.findIndex(tx => tx.id === id);
  if (idx === -1) return false;

  const originalDoc = current[idx].tipoDocumento;
  const originalAsesor = current[idx].asesor;

  const updatedTx = {
    ...current[idx],
    identificada: false,
    fechaIdentificacion: null,
    usuarioIdentificacion: null,
    asesor: null,
    tipoDocumento: null,
    nroReciboCaja: null,
    solicitudCambio: null,
    solicitudMotivo: null,
    solicitudUsuario: null,
    solicitudFecha: null,
    revertidoPorUsuario: adminName,
    revertidoPorRol: adminRole,
    revertidoFecha: getColombiaDateTime().dateTimeStr
  };

  current[idx] = updatedTx;

  localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify(current));
  notifyListeners();

  setDoc(doc(db, 'transactions', id), updatedTx).catch(err => {
    console.error("Error reverting identification in Firestore:", err);
  });

  addAuditLog(
    adminName,
    'Reversión de Identificación',
    `Revirtió transacción ${id.slice(0, 15)}... (Era ${originalDoc}, Asesor: ${originalAsesor}) por ${adminRole}`
  );

  return true;
}

export function requestTransactionChange(id: string, user: User, reason: string): boolean {
  const current = getTransactions();
  const idx = current.findIndex(tx => tx.id === id);
  if (idx === -1) return false;

  const updatedTx = {
    ...current[idx],
    solicitudCambio: 'pendiente' as const,
    solicitudMotivo: reason,
    solicitudUsuario: user.nombre,
    solicitudFecha: getColombiaDateTime().dateTimeStr
  };

  current[idx] = updatedTx;

  localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify(current));
  notifyListeners();

  setDoc(doc(db, 'transactions', id), updatedTx).catch(err => {
    console.error("Error requesting transaction change in Firestore:", err);
  });

  addAuditLog(
    user.nombre,
    'Solicitud de Cambio',
    `Solicitó cambio/liberación para la transacción ${id.slice(-8).toUpperCase()} - Motivo: ${reason}`
  );

  // Send automatic chat message to 'general' so both cashier and admin see it in the general chat
  const msgText = `[REVERSION_PENDIENTE] Solicitud de Reversión\n• Colaborador: ${user.nombre}\n• Transacción: ${updatedTx.llaveUnica.slice(-12).toUpperCase()}\n• Valor: $${updatedTx.valor.toLocaleString()}\n• Sede: ${updatedTx.sede}\n• Motivo: "${reason}"\n• TxId: ${id}`;
  
  sendChatMessage(
    user.id,
    user.nombre,
    user.role,
    msgText,
    'general'
  );

  return true;
}

export function resolveTransactionChange(
  id: string,
  resolution: 'liberar' | 'corregir',
  adminName: string,
  fields?: {
    asesor?: string | null;
    tipoDocumento?: 'Recibo' | 'Remisión' | 'Ignorado' | null;
    justificacionIgnorado?: string | null;
  },
  adminRole: string = 'Admin'
): boolean {
  const current = getTransactions();
  const idx = current.findIndex(tx => tx.id === id);
  if (idx === -1) return false;

  let updatedTx = { ...current[idx] };

  if (resolution === 'liberar') {
    updatedTx = {
      ...updatedTx,
      identificada: false,
      fechaIdentificacion: null,
      usuarioIdentificacion: null,
      asesor: null,
      tipoDocumento: null,
      nroReciboCaja: null,
      justificacionIgnorado: null,
      solicitudCambio: 'liberado' as const,
      solicitudFecha: getColombiaDateTime().dateTimeStr,
      revertidoPorUsuario: adminName,
      revertidoPorRol: adminRole,
      revertidoFecha: getColombiaDateTime().dateTimeStr
    };
    addAuditLog(
      adminName,
      'Liberación de Transacción',
      `Aprobó liberación de transacción ${id.slice(-8).toUpperCase()} solicitada por ${updatedTx.solicitudUsuario} (${adminRole})`
    );
  } else {
    updatedTx = {
      ...updatedTx,
      identificada: true,
      fechaIdentificacion: getColombiaDateTime().dateTimeStr,
      usuarioIdentificacion: `${updatedTx.usuarioIdentificacion || ''} (Modificado por Admin ${adminName})`,
      asesor: fields?.tipoDocumento === 'Ignorado' ? null : (fields?.asesor || updatedTx.asesor),
      tipoDocumento: fields?.tipoDocumento || updatedTx.tipoDocumento,
      justificacionIgnorado: fields?.tipoDocumento === 'Ignorado' ? (fields?.justificacionIgnorado || updatedTx.justificacionIgnorado) : null,
      solicitudCambio: 'corregido' as const,
      solicitudFecha: getColombiaDateTime().dateTimeStr
    };
    addAuditLog(
      adminName,
      'Corrección de Transacción',
      `Corrigió directamente la transacción ${id.slice(-8).toUpperCase()} - Nuevo Doc: ${fields?.tipoDocumento}, Asesor: ${fields?.asesor || 'N/A'}`
    );
  }

  current[idx] = updatedTx;

  localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify(current));
  notifyListeners();

  setDoc(doc(db, 'transactions', id), updatedTx).catch(err => {
    console.error("Error resolving transaction change in Firestore:", err);
  });

  return true;
}

export function rejectTransactionChange(id: string, adminName: string): boolean {
  const current = getTransactions();
  const idx = current.findIndex(tx => tx.id === id);
  if (idx === -1) return false;

  const updatedTx = {
    ...current[idx],
    solicitudCambio: null, // Clear the request status back to null
    solicitudMotivo: null,
    solicitudUsuario: null,
    solicitudFecha: null
  };

  current[idx] = updatedTx;

  localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify(current));
  notifyListeners();

  setDoc(doc(db, 'transactions', id), updatedTx).catch(err => {
    console.error("Error rejecting transaction change in Firestore:", err);
  });

  addAuditLog(
    adminName,
    'Rechazo de Cambio',
    `Rechazó la solicitud de cambio/reversión para la transacción ${id.slice(-8).toUpperCase()}`
  );

  return true;
}

export function executeMonthlyCleanup(adminName: string): { totalArchived: number } {
  const current = getTransactions();
  
  const updated = current.map(tx => ({
    ...tx,
    esHistorico: true
  }));

  localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify(updated));
  notifyListeners();

  (async () => {
    try {
      const chunks = [];
      for (let i = 0; i < updated.length; i += 500) {
        chunks.push(updated.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const bWrite = writeBatch(db);
        chunk.forEach(tx => {
          bWrite.set(doc(db, 'transactions', tx.id), tx);
        });
        await bWrite.commit();
      }
    } catch (e) {
      console.error("Error in executeMonthlyCleanup background write:", e);
    }
  })();

  addAuditLog(
    adminName,
    'Limpieza Mensual',
    `Ejecutó cierre del mes. Se archivaron ${updated.length} transacciones para consulta histórica.`
  );

  return { totalArchived: updated.length };
}

// ----------------------------------------------------
// AUDIT LOGS OPERATIONS
// ----------------------------------------------------
export function getAuditLogs(): AuditLog[] {
  const data = localStorage.getItem(STORAGE_LOGS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as AuditLog[];
  } catch (e) {
    return [];
  }
}

export function addAuditLog(usuario: string, accion: string, detalles: string) {
  const logs = getAuditLogs();
  const id = 'log_' + Date.now() + Math.random().toString(36).substr(2, 4);
  const newLog: AuditLog = {
    id,
    timestamp: getColombiaDateTime().dateTimeStr,
    usuario,
    accion,
    detalles
  };

  const updatedLogs = [newLog, ...logs].slice(0, 500);
  localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(updatedLogs));
  notifyListeners();

  setDoc(doc(db, 'logs', id), newLog).catch(e => {
    console.error("Error writing audit log to Firestore:", e);
  });
}

export function checkFirebaseStatus(): { status: string; persistence: string } {
  return {
    status: 'Conectado a Firebase Firestore (Tiempo Real)',
    persistence: 'Doble Persistencia (Firestore + LocalStorage)'
  };
}

// ----------------------------------------------------
// CIERRES CAJA OPERATIONS
// ----------------------------------------------------
export function getCierresCaja(): CierreCaja[] {
  const data = localStorage.getItem(STORAGE_CIERRES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as CierreCaja[];
  } catch (e) {
    return [];
  }
}

export function saveCierresCaja(cierres: CierreCaja[]) {
  localStorage.setItem(STORAGE_CIERRES_KEY, JSON.stringify(cierres));
  notifyListeners();
  syncArrayToFirestore('cierres', cierres);
}

export function registrarCierreCaja(fecha: string, sede: Sede, nombreCajera: string, totalDeclarado: number): CierreCaja {
  const cierres = getCierresCaja();
  const id = `cierre_${sede}_${fecha}`;
  
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
  
  localStorage.setItem(STORAGE_CIERRES_KEY, JSON.stringify(cierres));
  notifyListeners();

  setDoc(doc(db, 'cierres', id), nuevoCierre).catch(e => {
    console.error("Error writing closure to Firestore:", e);
  });

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
    const updatedCierre = {
      ...cierres[idx],
      solicitaDesbloqueo: true,
      motivoDesbloqueo: motivo
    };
    cierres[idx] = updatedCierre;
    localStorage.setItem(STORAGE_CIERRES_KEY, JSON.stringify(cierres));
    notifyListeners();

    updateDoc(doc(db, 'cierres', id), {
      solicitaDesbloqueo: true,
      motivoDesbloqueo: motivo
    }).catch(e => {
      console.error("Error requesting unlock in Firestore:", e);
    });

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
    localStorage.setItem(STORAGE_CIERRES_KEY, JSON.stringify(filtered));
    notifyListeners();

    deleteDoc(doc(db, 'cierres', id)).catch(e => {
      console.error("Error deleting closure in Firestore:", e);
    });

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
    const updatedCierre = {
      ...cierres[idx],
      solicitaDesbloqueo: false,
      motivoDesbloqueo: null
    };
    cierres[idx] = updatedCierre;
    localStorage.setItem(STORAGE_CIERRES_KEY, JSON.stringify(cierres));
    notifyListeners();

    updateDoc(doc(db, 'cierres', id), {
      solicitaDesbloqueo: false,
      motivoDesbloqueo: null
    }).catch(e => {
      console.error("Error rejecting unlock in Firestore:", e);
    });

    addAuditLog(adminUser, 'Desbloqueo Cierre Rechazado', `Se rechazó la solicitud de desbloqueo del cierre de caja de la Sede: ${sede} para la Fecha: ${fecha}`);
    return true;
  }
  return false;
}

export function clearAllDatabase(usuario: string) {
  localStorage.setItem(STORAGE_TRANS_KEY, JSON.stringify([]));
  localStorage.setItem(STORAGE_BATCHES_KEY, JSON.stringify([]));
  localStorage.setItem(STORAGE_CIERRES_KEY, JSON.stringify([]));
  notifyListeners();

  (async () => {
    try {
      const collectionsToClear = ['transactions', 'batches', 'cierres', 'logs', 'chat'];
      for (const colName of collectionsToClear) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        const docs = snapshot.docs;
        const chunks = [];
        for (let i = 0; i < docs.length; i += 500) {
          chunks.push(docs.slice(i, i + 500));
        }
        for (const chunk of chunks) {
          const bWrite = writeBatch(db);
          chunk.forEach(d => {
            bWrite.delete(d.ref);
          });
          await bWrite.commit();
        }
      }
    } catch (e) {
      console.error("Error wiping Firestore database:", e);
    }
  })();

  addAuditLog(usuario, 'Limpieza Total', 'Se borraron todas las transacciones, exceles subidos e historial de cierres de caja del sistema.');
}

export function getAdvisors(): string[] {
  const list = new Set<string>();

  getUsers().forEach(user => {
    if (user.role === 'Asesor' && user.nombre) {
      list.add(user.nombre.trim());
    }
  });

  getTransactions().forEach(tx => {
    if (tx.identificada && tx.asesor) {
      list.add(tx.asesor.trim());
    }
  });

  return Array.from(list);
}

// ----------------------------------------------------
// CHAT OPERATIONS
// ----------------------------------------------------
export function getChatMessages(): ChatMessage[] {
  const data = localStorage.getItem(STORAGE_CHAT_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as ChatMessage[];
  } catch (e) {
    return [];
  }
}

export function sendChatMessage(senderId: string, senderName: string, senderRole: Role, text: string, receiverId?: string | null): ChatMessage {
  const messages = getChatMessages();
  const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const newMessage: ChatMessage = {
    id,
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

  setDoc(doc(db, 'chat', id), newMessage).catch(e => {
    console.error("Error sending chat message to Firestore:", e);
  });

  return newMessage;
}

export function deleteChatMessage(id: string): boolean {
  const messages = getChatMessages();
  const filtered = messages.filter(msg => msg.id !== id);
  if (filtered.length !== messages.length) {
    localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(filtered));
    notifyListeners();

    deleteDoc(doc(db, 'chat', id)).catch(e => {
      console.error("Error deleting chat message in Firestore:", e);
    });

    return true;
  }
  return false;
}

// ----------------------------------------------------
// VIDEO CALLS OPERATIONS
// ----------------------------------------------------
function generateGoogleMeetLink(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const randSec = (len: number) => Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  // Use Jitsi Meet which provides 100% free, active and instantly working dynamic conference rooms
  return `https://meet.jit.si/SoporteTransferencias_${randSec(4)}_${randSec(4)}`;
}

export function getVideoCalls(): VideoCall[] {
  const data = localStorage.getItem(STORAGE_VIDEOCALLS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as VideoCall[];
  } catch (e) {
    return [];
  }
}

export async function startVideoCall(
  senderId: string,
  senderName: string,
  senderRole: Role,
  receiverId: string,
  receiverName: string,
  customMeetLink?: string
): Promise<VideoCall> {
  const id = `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const meetLink = customMeetLink || generateGoogleMeetLink();
  const newCall: VideoCall = {
    id,
    senderId,
    senderName,
    senderRole,
    receiverId,
    receiverName,
    meetLink,
    status: 'pending',
    createdAt: getColombiaDateTime().dateTimeStr
  };

  const currentCalls = getVideoCalls();
  currentCalls.unshift(newCall);
  localStorage.setItem(STORAGE_VIDEOCALLS_KEY, JSON.stringify(currentCalls));
  notifyListeners();

  await setDoc(doc(db, 'videocalls', id), newCall);
  addAuditLog(senderName, 'Llamada de Meet Iniciada', `Inició una videollamada de Google Meet para ${receiverName}.`);

  return newCall;
}

export async function updateVideoCallStatus(callId: string, status: 'accepted' | 'declined' | 'ended'): Promise<void> {
  const calls = getVideoCalls();
  const index = calls.findIndex(c => c.id === callId);
  if (index !== -1) {
    const call = calls[index];
    call.status = status;
    localStorage.setItem(STORAGE_VIDEOCALLS_KEY, JSON.stringify(calls));
    notifyListeners();

    await setDoc(doc(db, 'videocalls', callId), { status }, { merge: true });

    if (status === 'accepted') {
      addAuditLog(call.receiverName, 'Llamada de Meet Aceptada', `Aceptó la videollamada de Google Meet de ${call.senderName}.`);
    } else if (status === 'declined') {
      addAuditLog(call.receiverName, 'Llamada de Meet Rechazada', `Rechazó la videollamada de Google Meet de ${call.senderName}.`);
    } else if (status === 'ended') {
      addAuditLog(call.senderName, 'Llamada de Meet Finalizada', `Finalizó la videollamada de Google Meet con ${call.receiverName}.`);
    }
  }
}

