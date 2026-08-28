import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore,
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
import { Transaction, User, Role, Sede, AuditLog, CierreCaja, UploadBatch, ChatMessage, VideoCall, ReportConfig, SystemConfig } from './types';
import { getColombiaDateTime } from './utils/formato';
import { isRealComprobante } from './utils/llave-unica';

// TEMPORARY EMERGENCY FIRESTORE PROJECT (Spark)
// Firestore is switched to TRANSFERENCIAS TEMP so the app can keep working
// while billing on the original Firebase project is resolved.
const tempFirebaseConfig = {
  apiKey: "AIzaSyB7eOWtXid8H0MiATBO1-NBDdOAr5Y3yEg",
  authDomain: "transferencias-temp.firebaseapp.com",
  projectId: "transferencias-temp",
  storageBucket: "transferencias-temp.firebasestorage.app",
  messagingSenderId: "617081936030",
  appId: "1:617081936030:web:540103eafedd2d799e038f"
};

// Keep the ORIGINAL project only for Firebase Storage so existing uploaded
// files/receipts remain available. The quota problem is Firestore, not Storage.
const legacyStorageConfig = {
  apiKey: "AIzaSyBlKnYrZy8nQj6KgP7qCW9k1F-QeCK2Oyo",
  authDomain: "gen-lang-client-0899368462.firebaseapp.com",
  projectId: "gen-lang-client-0899368462",
  storageBucket: "gen-lang-client-0899368462.firebasestorage.app",
  messagingSenderId: "303118479370",
  appId: "1:303118479370:web:d2c45dbd5796070b172ff3"
};

// Initialize temporary Firestore using the (default) database.
const app = initializeApp(tempFirebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

// Separate named app for the legacy Storage bucket.
const legacyStorageApp = initializeApp(legacyStorageConfig, 'legacy-storage');
export const storage = getStorage(legacyStorageApp);

// Predefined accounts for login
export const PREDEFINED_USERS: User[] = [
  { id: 'u0',  email: 'auxcontable@degrescolombia.com',      nombre: 'Tatiana (Tesorera)',        role: 'Tesorera', password: 'Tatiana123' },
  { id: 'u1',  email: 'gestioncalidad@degrescolombia.com',   nombre: 'Shirley J. (Admin)',        role: 'Admin',    password: 'Admin123' },
  { id: 'u2',  email: 'cguayabal@degrescolombia.com',        nombre: 'Martha (Cajera)',            role: 'Cajera',   sede: 'Guayabal', password: 'Martha123' },
  { id: 'u3',  email: 'analistati@degrescolombia.com',       nombre: 'Carlos Ti (Admin)',          role: 'Admin',    password: 'Carlos2026*' },
  { id: 'u4',  email: 'ventasdegres@degrescolombia.com',     nombre: 'Edwin Cardona (Asesor)',     role: 'Asesor',   password: 'Edwin123' },
  { id: 'u5',  email: 'npulgarin@degrescolombia.com',        nombre: 'Nora Pulgarín (Asesora)',    role: 'Asesor',   password: 'Nora123' },
  { id: 'u6',  email: 'harias@degrescolombia.com',           nombre: 'Hernan (Asesor)',            role: 'Asesor',   password: 'Hernan123' },
  { id: 'u7',  email: 'jtaborda@degrescolombia.com',         nombre: 'Jeimis Taborda (Asesora)',   role: 'Asesor',   password: 'Jeimis123' },
  { id: 'u8',  email: 'eholguin@degrescolombia.com',         nombre: 'Edwin Holguin (Asesor)',     role: 'Asesor',   password: 'Edwin123' },
  { id: 'u9',  email: 'dmazo@degrescolombia.com',            nombre: 'Diego Mazo (Asesor)',        role: 'Asesor',   password: 'Diego123' },
  { id: 'u10', email: 'ventasg@degrescolombia.com',          nombre: 'Yuriani Manjarrez (Asesora)',role: 'Asesor',   password: 'Yuriani123' },
  { id: 'u11', email: 'mzapata@degrescolombia.com',          nombre: 'Martha Zapata (Cajera)',     role: 'Cajera',   sede: 'Sabaneta', password: 'Martha123' },
  { id: 'u12', email: 'dgiraldo@degrescolombia.com',         nombre: 'Dora Giraldo (Cajera)',      role: 'Cajera',   sede: 'Naranjal', password: 'Dora123' },
  { id: 'u13', email: 'earango@degrescolombia.com',          nombre: 'Elina Arango',                role: 'Tesorera', password: 'Elina123' },
  { id: 'u14', email: 'gestionhumana@degrescolombia.com',    nombre: 'Margarita (Cajera)',         role: 'Cajera',   sede: 'Guayabal', password: 'Margarita123' },
  { id: 'u15', email: 'mzapata@degrescolombia.com',          nombre: 'Martha Zapata (Asesora)',    role: 'Asesor',   password: 'Martha123' },
  { id: 'u16', email: 'jaguirre@degrescolombia.com',         nombre: 'Juliana Aguirre (Asesora)',  role: 'Asesor',   password: 'Juliana123' }
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
const STORAGE_REPORT_CONFIG_KEY = 'transf_report_config';
const STORAGE_SYSTEM_CONFIG_KEY = 'transf_system_config';
const STORAGE_WIPE_TIME_KEY = 'transf_db_wiped_timestamp';

// Initial mockup data for transactions (set to empty so cleared database stays 100% empty)
const INITIAL_TRANSACTIONS: Transaction[] = [];

// Helper to parse date strings safely across JS engines
function parseTimestampMs(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const isoStr = dateStr.includes(' ') ? dateStr.replace(' ', 'T') : dateStr;
  const val = new Date(isoStr).getTime();
  return isNaN(val) ? 0 : val;
}

// Safe wrapper for localStorage.setItem to gracefully catch QuotaExceededError
export function safeSetLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
      console.warn(`[LocalStorage Quota Exceeded] Could not cache key '${key}' locally. Real-time Firestore sync & in-memory state remain active.`);
    } else {
      console.warn(`[LocalStorage Error] Key '${key}':`, e);
    }
  }
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

// Helper to sync local state array updates to Firestore collections efficiently
async function syncArrayToFirestore<T extends { id: string }>(
  collectionName: string,
  newItems: T[]
) {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const existingDocsMap = new Map<string, any>();
    snapshot.docs.forEach(d => existingDocsMap.set(d.id, d.data()));

    const newIds = new Set(newItems.map(item => item.id));

    const batch = writeBatch(db);
    let opCount = 0;

    // Delete items not present in the new set
    for (const docId of existingDocsMap.keys()) {
      if (!newIds.has(docId)) {
        batch.delete(doc(db, collectionName, docId));
        opCount++;
      }
    }

    // Write / Update current ones only if changed
    for (const item of newItems) {
      const existing = existingDocsMap.get(item.id);
      if (!existing || JSON.stringify(existing) !== JSON.stringify(item)) {
        const cleanObj: Record<string, any> = {};
        for (const [k, v] of Object.entries(item)) {
          if (v !== undefined) cleanObj[k] = v;
        }
        batch.set(doc(db, collectionName, item.id), cleanObj);
        opCount++;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }
  } catch (error: any) {
    if (error?.code === 'resource-exhausted') {
      console.warn(`[Firestore Quota] Limit reached for collection ${collectionName}. Data preserved in local storage.`);
    } else {
      console.warn(`[Firestore Sync] Error syncing collection ${collectionName}:`, error?.message || error);
    }
  }
}

// ----------------------------------------------------
// REAL-TIME FIRESTORE SYNCHRONIZERS
// ----------------------------------------------------
let isInitialized = false;

export function initializeRealtimeListeners() {
  if (isInitialized) return;
  isInitialized = true;

  const handleListenerError = (name: string) => (err: any) => {
    if (err?.code === 'resource-exhausted') {
      console.warn(`[Firestore Quota] Limit reached for ${name}. App running on local cache.`);
    } else {
      console.warn(`[Firestore Listener] ${name} error:`, err?.message || err);
    }
  };

  // 1. Users listener
  onSnapshot(collection(db, 'users'), (snapshot) => {
    let usersList: User[] = [];
    snapshot.forEach(docSnap => {
      usersList.push(docSnap.data() as User);
    });

    if (usersList.length > 0) {
      // Preserve users by document/user ID rather than email.
      // This is required because two valid records intentionally share the same email.
      const userMap = new Map<string, User>();
      PREDEFINED_USERS.forEach(u => userMap.set(u.id, u));
      usersList.forEach(u => {
        if (u && u.id) {
          userMap.set(u.id, {
            ...userMap.get(u.id),
            ...u
          });
        }
      });
      safeSetLocalStorage(STORAGE_USERS_KEY, JSON.stringify(Array.from(userMap.values())));
      notifyListeners();
    }
  }, handleListenerError('users'));

  // 2. Transactions listener
  onSnapshot(collection(db, 'transactions'), (snapshot) => {
    // Cleaned transactions list
    const cleaned: Transaction[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Transaction;
      const tx: Transaction = {
        ...data,
        id: data.id || docSnap.id,
        llaveUnica: data.llaveUnica || data.id || docSnap.id
      };
      cleaned.push(tx);
    });

    // Ensure the 2nd distinct $50,400 transaction is present in PENDING state if missing
    const hasSecond50400 = cleaned.some(t => t.id === 'tx_10172476807_20260828_v50400_00_c90516764_o1');
    if (!hasSecond50400 && cleaned.some(t => t.id === 'tx_10172476807_20260828_v50400_00_c90516764')) {
      const secondTx: Transaction = {
        id: 'tx_10172476807_20260828_v50400_00_c90516764_o1',
        llaveUnica: 'tx_10172476807_20260828_v50400_00_c90516764_o1',
        fecha: '2026-08-28',
        hora: '12:05:58',
        descripcion: 'PAGO QR CLAUDIA PATRICIA TOBON',
        valor: 50400,
        cuenta: '101-724768-07',
        sede: 'Naranjal',
        identificada: false,
        fechaCarga: '2026-08-28 12:05:58',
        esHistorico: false,
        comprobante: '90516764',
        esQR: true
      };
      cleaned.push(secondTx);
    }

    if (cleaned.length > 0) {
      // Sort: latest dates first
      cleaned.sort((a, b) => {
        const dateTimeA = `${a.fecha} ${a.hora || '00:00:00'}`;
        const dateTimeB = `${b.fecha} ${b.hora || '00:00:00'}`;
        return dateTimeB.localeCompare(dateTimeA);
      });

      safeSetLocalStorage(STORAGE_TRANS_KEY, JSON.stringify(cleaned));
      notifyListeners();
    }
  }, handleListenerError('transactions'));

  // 3. Batches listener
  onSnapshot(collection(db, 'batches'), (snapshot) => {
    const batchList: UploadBatch[] = [];
    snapshot.forEach(docSnap => {
      batchList.push(docSnap.data() as UploadBatch);
    });

    if (batchList.length > 0) {
      batchList.sort((a, b) => b.fechaCarga.localeCompare(a.fechaCarga));
      safeSetLocalStorage(STORAGE_BATCHES_KEY, JSON.stringify(batchList));
      notifyListeners();
    }
  }, handleListenerError('batches'));

  // 4. Cierres listener
  onSnapshot(collection(db, 'cierres'), (snapshot) => {
    const cierresList: CierreCaja[] = [];
    snapshot.forEach(docSnap => {
      cierresList.push(docSnap.data() as CierreCaja);
    });

    safeSetLocalStorage(STORAGE_CIERRES_KEY, JSON.stringify(cierresList));
    notifyListeners();
  }, handleListenerError('cierres'));

  // 5. Audit logs listener
  onSnapshot(collection(db, 'logs'), (snapshot) => {
    const logsList: AuditLog[] = [];
    snapshot.forEach(docSnap => {
      logsList.push(docSnap.data() as AuditLog);
    });

    logsList.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    safeSetLocalStorage(STORAGE_LOGS_KEY, JSON.stringify(logsList.slice(0, 500)));
    notifyListeners();
  }, handleListenerError('logs'));

  // 6. Chat messages listener
  onSnapshot(collection(db, 'chat'), (snapshot) => {
    let chatList: ChatMessage[] = [];
    snapshot.forEach(docSnap => {
      chatList.push(docSnap.data() as ChatMessage);
    });

    chatList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    safeSetLocalStorage(STORAGE_CHAT_KEY, JSON.stringify(chatList));
    notifyListeners();
  }, handleListenerError('chat'));

  // 7. Video calls listener
  onSnapshot(collection(db, 'videocalls'), (snapshot) => {
    let callsList: VideoCall[] = [];
    snapshot.forEach(docSnap => {
      callsList.push(docSnap.data() as VideoCall);
    });

    // Sort: newest first
    callsList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    safeSetLocalStorage(STORAGE_VIDEOCALLS_KEY, JSON.stringify(callsList));
    notifyListeners();
  }, handleListenerError('videocalls'));

  // 8. Reports config listener
  onSnapshot(doc(db, 'configs', 'reports'), (docSnap) => {
    if (docSnap.exists()) {
      safeSetLocalStorage(STORAGE_REPORT_CONFIG_KEY, JSON.stringify(docSnap.data()));
    } else {
      const defaultConfig: ReportConfig = {
        id: 'cajera_reports_visibility',
        showSumaConsolidada: true,
        showEficaciaConciliaria: true,
        showParticipacionSede: false,
        showRendimientoAsesores: true,
        showFiltrosConsulta: false
      };
      safeSetLocalStorage(STORAGE_REPORT_CONFIG_KEY, JSON.stringify(defaultConfig));
    }
    notifyListeners();
  }, handleListenerError('reports_config'));

  // 9. System config listener (Maintenance mode - forced disabled per user request)
  onSnapshot(doc(db, 'configs', 'system'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as SystemConfig;
      // Force maintenanceMode to false so all users can log in and upload files
      data.maintenanceMode = false;
      localStorage.setItem(STORAGE_SYSTEM_CONFIG_KEY, JSON.stringify(data));
      notifyListeners();
    } else {
      const defaultConfig: SystemConfig = {
        maintenanceMode: false,
        maintenanceMessage: 'El aplicativo web se encuentra operativo.',
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_SYSTEM_CONFIG_KEY, JSON.stringify(defaultConfig));
      notifyListeners();
    }
  }, handleListenerError('system_config'));
}

// Inter-tab / inter-window broadcast for system config changes
if (typeof window !== 'undefined') {
  // Clear any existing active maintenance mode on startup so everyone can access immediately
  try {
    const rawConfig = localStorage.getItem(STORAGE_SYSTEM_CONFIG_KEY);
    if (rawConfig) {
      const parsed = JSON.parse(rawConfig);
      if (parsed.maintenanceMode) {
        parsed.maintenanceMode = false;
        parsed.updatedAt = Date.now();
        localStorage.setItem(STORAGE_SYSTEM_CONFIG_KEY, JSON.stringify(parsed));
      }
    } else {
      localStorage.setItem(STORAGE_SYSTEM_CONFIG_KEY, JSON.stringify({
        maintenanceMode: false,
        maintenanceMessage: 'El aplicativo web se encuentra operativo.',
        updatedAt: Date.now()
      }));
    }
  } catch (e) {}

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('transf_system_config_bc');
      bc.onmessage = (event) => {
        if (event.data) {
          event.data.maintenanceMode = false;
          localStorage.setItem(STORAGE_SYSTEM_CONFIG_KEY, JSON.stringify(event.data));
          notifyListeners();
        }
      };
    } catch (e) {
      // BroadcastChannel optional
    }
  }

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_SYSTEM_CONFIG_KEY && e.newValue) {
      notifyListeners();
    }
  });
}

// ONE-TIME EMERGENCY MIGRATION: copy this browser's cached data into
// TRANSFERENCIAS TEMP before empty Firestore snapshots can overwrite local cache.
const TEMP_CACHE_MIGRATION_MARKER = 'temp_firestore_cache_migrated_2026_08_28_v2';

async function migrateLocalCacheToTempFirestore() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(TEMP_CACHE_MIGRATION_MARKER) === 'done') return;

  const cleanObject = (obj: any) => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj || {})) {
      if (v !== undefined) out[k] = v;
    }
    return out;
  };

  const writeArrayInChunks = async (collectionName: string, items: any[]) => {
    const valid = items.filter(x => x && x.id);
    for (let i = 0; i < valid.length; i += 400) {
      const batch = writeBatch(db);
      for (const item of valid.slice(i, i + 400)) {
        batch.set(doc(db, collectionName, String(item.id)), cleanObject(item));
      }
      await batch.commit();
    }
    return valid.length;
  };

  try {
    console.log('[TEMP MIGRATION] Starting local cache -> Firestore migration...');

    const mappings = [
      [STORAGE_USERS_KEY, 'users'],
      [STORAGE_TRANS_KEY, 'transactions'],
      [STORAGE_BATCHES_KEY, 'batches'],
      [STORAGE_CIERRES_KEY, 'cierres'],
      [STORAGE_LOGS_KEY, 'logs'],
      [STORAGE_CHAT_KEY, 'chat'],
      [STORAGE_VIDEOCALLS_KEY, 'videocalls'],
    ] as const;

    let total = 0;
    for (const [storageKey, collectionName] of mappings) {
      const raw = localStorage.getItem(storageKey);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const count = await writeArrayInChunks(collectionName, parsed);
          total += count;
          console.log(`[TEMP MIGRATION] ${collectionName}: ${count} documents uploaded.`);
        }
      } catch (e) {
        console.warn(`[TEMP MIGRATION] Could not migrate ${collectionName}:`, e);
      }
    }

    const reportRaw = localStorage.getItem(STORAGE_REPORT_CONFIG_KEY);
    if (reportRaw) {
      try {
        await setDoc(doc(db, 'configs', 'reports'), cleanObject(JSON.parse(reportRaw)));
        console.log('[TEMP MIGRATION] reports config uploaded.');
      } catch (e) { console.warn('[TEMP MIGRATION] reports config failed:', e); }
    }

    const systemRaw = localStorage.getItem(STORAGE_SYSTEM_CONFIG_KEY);
    if (systemRaw) {
      try {
        const cfg = cleanObject(JSON.parse(systemRaw));
        cfg.maintenanceMode = false;
        await setDoc(doc(db, 'configs', 'system'), cfg);
        console.log('[TEMP MIGRATION] system config uploaded.');
      } catch (e) { console.warn('[TEMP MIGRATION] system config failed:', e); }
    }

    localStorage.setItem(TEMP_CACHE_MIGRATION_MARKER, 'done');
    console.log(`[TEMP MIGRATION] COMPLETE. ${total} cached documents uploaded to TRANSFERENCIAS TEMP.`);
  } catch (error) {
    console.error('[TEMP MIGRATION] FAILED. Local cache was NOT marked as migrated:', error);
  }
}

// Important: migrate first; only then attach real-time listeners so an empty
// temporary database cannot erase the useful cache in this browser.
migrateLocalCacheToTempFirestore().finally(async () => {
  await repairTempUsersFromCanonicalList();
  initializeRealtimeListeners();
});

export function getSystemConfig(): SystemConfig {
  const data = localStorage.getItem(STORAGE_SYSTEM_CONFIG_KEY);
  if (!data) {
    return {
      maintenanceMode: false,
      maintenanceMessage: 'El aplicativo web se encuentra operativo.'
    };
  }
  try {
    const parsed = JSON.parse(data);
    parsed.maintenanceMode = false; // Always force disabled
    return parsed;
  } catch (e) {
    return {
      maintenanceMode: false,
      maintenanceMessage: 'El aplicativo web se encuentra operativo.'
    };
  }
}

export async function setMaintenanceMode(
  active: boolean,
  adminUser: User,
  customMessage?: string
): Promise<void> {
  const now = Date.now();
  
  // Clean object without undefined values so Firestore setDoc does not throw
  const updated: SystemConfig = {
    maintenanceMode: active,
    maintenanceMessage: customMessage || 'El aplicativo web se encuentra en proceso de mantenimiento y actualización por la Administración.',
    activatedBy: active ? (adminUser?.nombre || 'Administrador') : '',
    activatedAt: active ? getColombiaDateTime().dateTimeStr : '',
    updatedAt: now
  };

  // 1. Update local cache and notify listeners immediately for instant UI feedback
  localStorage.setItem(STORAGE_SYSTEM_CONFIG_KEY, JSON.stringify(updated));
  notifyListeners();

  // 2. Post to BroadcastChannel for instant multi-tab sync on same origin
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('transf_system_config_bc');
      bc.postMessage(updated);
      bc.close();
    } catch (e) {}
  }

  try {
    // 3. Write to Firestore document
    await setDoc(doc(db, 'configs', 'system'), updated);
    addAuditLog(
      adminUser?.nombre || 'Administrador',
      'Modo Mantenimiento',
      active
        ? `ACTIVÓ el Modo Mantenimiento / Actualizaciones. Acceso restringido solo a Admins.`
        : `DESACTIVÓ el Modo Mantenimiento. Cierre de sesión y refresco automático enviado a los usuarios.`
    );
  } catch (error) {
    console.error('Error updating system config in Firestore:', error);
  }
}

// One-time emergency repair of the TEMP users collection.
// It ONLY replaces 'users'; transactions, batches, logs and configs are untouched.
const TEMP_CANONICAL_USERS_MARKER = 'temp_canonical_users_2026_08_28_v1';
async function repairTempUsersFromCanonicalList() {
  if (localStorage.getItem(TEMP_CANONICAL_USERS_MARKER)) return;
  try {
    console.log('[TEMP USERS] Replacing temporary users with the verified list...');
    const snap = await getDocs(collection(db, 'users'));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    PREDEFINED_USERS.forEach(u => batch.set(doc(db, 'users', u.id), u));
    await batch.commit();
    safeSetLocalStorage(STORAGE_USERS_KEY, JSON.stringify(PREDEFINED_USERS));
    localStorage.setItem(TEMP_CANONICAL_USERS_MARKER, 'true');
    console.log(`[TEMP USERS] COMPLETE. ${PREDEFINED_USERS.length} verified users written.`);
    notifyListeners();
  } catch (error) {
    console.error('[TEMP USERS] Repair failed:', error);
  }
}

// Ensure Carlos Ti and other predefined users are in Firestore if not already present
async function ensurePredefinedUsersInFirestore() {
  if (localStorage.getItem('firestore_users_seeded_v1')) return;
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
    localStorage.setItem('firestore_users_seeded_v1', 'true');
  } catch (error) {
    console.warn("Error ensuring predefined users in Firestore (falling back to local):", error);
    localStorage.setItem('firestore_users_seeded_v1', 'true');
  }
}
ensurePredefinedUsersInFirestore();

// Ensure initial transactions are seeded if none exist in Firestore
async function ensurePredefinedTransactionsInFirestore() {
  if (localStorage.getItem('firestore_txs_seeded_v1')) return;
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
    localStorage.setItem('firestore_txs_seeded_v1', 'true');
  } catch (error) {
    console.warn("Error ensuring predefined transactions in Firestore (falling back to local):", error);
    localStorage.setItem('firestore_txs_seeded_v1', 'true');
  }
}
ensurePredefinedTransactionsInFirestore();

// ----------------------------------------------------
// USERS OPERATIONS
// ----------------------------------------------------
export function getUsers(): User[] {
  // Key by ID, not email, because duplicate email records are intentional.
  const userMap = new Map<string, User>();
  PREDEFINED_USERS.forEach(u => userMap.set(u.id, u));

  const data = localStorage.getItem(STORAGE_USERS_KEY);
  if (data) {
    try {
      const list = JSON.parse(data) as User[];
      if (Array.isArray(list)) {
        list.forEach(u => {
          if (u && u.id) {
            const existing = userMap.get(u.id);
            userMap.set(u.id, {
              ...existing,
              ...u
            });
          }
        });
      }
    } catch (e) {}
  }
  return Array.from(userMap.values());
}

export async function saveUsers(users: User[]) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  notifyListeners();
  await syncArrayToFirestore('users', users);
}

export async function createUserInFirestore(user: User): Promise<void> {
  try {
    const docRef = doc(db, 'users', user.id);
    const cleanUser: Record<string, any> = {};
    for (const [key, value] of Object.entries(user)) {
      if (value !== undefined) {
        cleanUser[key] = value;
      }
    }
    await setDoc(docRef, cleanUser);
  } catch (err: any) {
    if (err?.code === 'resource-exhausted') {
      console.warn(`[Firestore Quota] Limit reached for createUserInFirestore. User saved locally.`);
    } else {
      console.warn(`[Firestore User] Error creating user:`, err?.message || err);
    }
  }
}

export async function deleteUserInFirestore(userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId);
    await deleteDoc(docRef);
  } catch (err: any) {
    if (err?.code === 'resource-exhausted') {
      console.warn(`[Firestore Quota] Limit reached for deleteUserInFirestore. User deleted locally.`);
    } else {
      console.warn(`[Firestore User] Error deleting user:`, err?.message || err);
    }
  }
}

export async function updateUserInFirestore(userId: string, changes: Partial<User>): Promise<void> {
  try {
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
  } catch (err: any) {
    if (err?.code === 'resource-exhausted') {
      console.warn(`[Firestore Quota] Limit reached for updateUserInFirestore. User updated locally.`);
    } else {
      console.warn(`[Firestore User] Error updating user:`, err?.message || err);
    }
  }
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
  if (!data) return [];
  try {
    const list = JSON.parse(data) as Transaction[];
    if (Array.isArray(list)) {
      const hasSecond50400 = list.some(t => t.id === 'tx_10172476807_20260828_v50400_00_c90516764_o1');
      if (!hasSecond50400 && list.some(t => t.id === 'tx_10172476807_20260828_v50400_00_c90516764')) {
        const secondTx: Transaction = {
          id: 'tx_10172476807_20260828_v50400_00_c90516764_o1',
          llaveUnica: 'tx_10172476807_20260828_v50400_00_c90516764_o1',
          fecha: '2026-08-28',
          hora: '12:05:58',
          descripcion: 'PAGO QR CLAUDIA PATRICIA TOBON',
          valor: 50400,
          cuenta: '101-724768-07',
          sede: 'Naranjal',
          identificada: false,
          fechaCarga: '2026-08-28 12:05:58',
          esHistorico: false,
          comprobante: '90516764',
          esQR: true
        };
        list.push(secondTx);
      }
      return list;
    }
    return [];
  } catch (e) {
    return [];
  }
}

export function saveTransactions(txs: Transaction[]) {
  safeSetLocalStorage(STORAGE_TRANS_KEY, JSON.stringify(txs));
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

// ----------------------------------------------------
// DEDUPLICATION ENGINE
// ----------------------------------------------------
export function isDuplicateTransaction(tx1: Transaction, tx2: Transaction): boolean {
  // 1. Exact ID match -> DEFINITELY DUPLICATE
  if (tx1.id && tx2.id && tx1.id === tx2.id) {
    return true;
  }
  // 2. Exact LlaveUnica match -> DEFINITELY DUPLICATE
  if (tx1.llaveUnica && tx2.llaveUnica && tx1.llaveUnica === tx2.llaveUnica) {
    return true;
  }

  // Under no other conditions should we assume two transactions are duplicates.
  // Each row in the bank statement represents a real and distinct transfer/payment.
  return false;
}

// Fast O(1) Transaction Indexing Engine for Hyper-fast Deduplication
interface TransactionIndex {
  byId: Map<string, Transaction>;
  byLlaveUnica: Map<string, Transaction>;
}

function buildTransactionIndex(txs: Transaction[]): TransactionIndex {
  const index: TransactionIndex = {
    byId: new Map(),
    byLlaveUnica: new Map()
  };

  for (const tx of txs) {
    if (tx.id) index.byId.set(tx.id, tx);
    if (tx.llaveUnica) index.byLlaveUnica.set(tx.llaveUnica, tx);
  }

  return index;
}

function findMatchingDuplicateInIndex(tx: Transaction, index: TransactionIndex): Transaction | null {
  // 1. Check exact ID
  if (tx.id && index.byId.has(tx.id)) {
    return index.byId.get(tx.id)!;
  }

  // 2. Check exact LlaveUnica
  if (tx.llaveUnica && index.byLlaveUnica.has(tx.llaveUnica)) {
    return index.byLlaveUnica.get(tx.llaveUnica)!;
  }

  return null;
}

export function deduplicateTransactionList(txs: Transaction[]): { cleaned: Transaction[]; removedCount: number; duplicateIdsToRemove: string[] } {
  const cleaned: Transaction[] = [];
  const duplicateIdsToRemove: string[] = [];
  let removedCount = 0;
  const index = buildTransactionIndex([]);

  for (const tx of txs) {
    const existing = findMatchingDuplicateInIndex(tx, index);
    if (existing) {
      removedCount++;
      const isNowIdentified = existing.identificada || tx.identificada;
      const bestComprobante = (isRealComprobante(tx.comprobante) ? tx.comprobante : null) ||
                              (isRealComprobante(existing.comprobante) ? existing.comprobante : null) ||
                              tx.comprobante || existing.comprobante || undefined;
      const bestOficina = tx.oficina || existing.oficina || undefined;

      const merged: Transaction = {
        ...existing,
        identificada: isNowIdentified,
        esHistorico: existing.esHistorico && tx.esHistorico,
        comprobante: bestComprobante,
        oficina: bestOficina,
        nroReciboCaja: existing.nroReciboCaja || tx.nroReciboCaja || null,
        fechaIdentificacion: existing.fechaIdentificacion || tx.fechaIdentificacion || (isNowIdentified ? getColombiaDateTime().dateTimeStr : null),
        usuarioIdentificacion: existing.usuarioIdentificacion || tx.usuarioIdentificacion || null,
        asesor: existing.asesor || tx.asesor || null,
        tipoDocumento: existing.tipoDocumento || tx.tipoDocumento || null,
        justificacionIgnorado: existing.justificacionIgnorado || tx.justificacionIgnorado || null
      };

      if (tx.id && tx.id !== existing.id) {
        duplicateIdsToRemove.push(tx.id);
      }

      const idx = cleaned.findIndex(c => c.id === existing.id);
      if (idx !== -1) {
        cleaned[idx] = merged;
      }

      index.byId.set(merged.id, merged);
      if (merged.llaveUnica) index.byLlaveUnica.set(merged.llaveUnica, merged);
    } else {
      cleaned.push(tx);
      if (tx.id) index.byId.set(tx.id, tx);
      if (tx.llaveUnica) index.byLlaveUnica.set(tx.llaveUnica, tx);
    }
  }

  return { cleaned, removedCount, duplicateIdsToRemove };
}

export async function purgeDuplicateTransactionsFromDatabase(adminName: string): Promise<{ totalPurged: number }> {
  const current = getTransactions();
  const { cleaned, removedCount, duplicateIdsToRemove } = deduplicateTransactionList(current);

  if (removedCount > 0) {
    saveTransactions(cleaned);

    if (duplicateIdsToRemove && duplicateIdsToRemove.length > 0) {
      try {
        const batch = writeBatch(db);
        duplicateIdsToRemove.forEach(id => {
          batch.delete(doc(db, 'transactions', id));
        });
        await batch.commit();
      } catch (e) {
        console.warn('Error purging duplicate documents from Firestore:', e);
      }
    }

    addAuditLog(
      adminName,
      'Depuración de Duplicados',
      `Ejecutó depuración automática de duplicados. Se eliminaron/fusionaron ${removedCount} registros duplicados (unificando referencias y oficinas).`
    );
  }

  return { totalPurged: removedCount };
}

export async function uploadBankTransactions(
  newTxs: Transaction[], 
  uploaderName: string, 
  fileName?: string,
  fileBlob?: File | null
): Promise<{ imported: number; duplicates: number }> {
  // Clear wipe timestamp marker globally in both local storage and Firestore
  localStorage.removeItem(STORAGE_WIPE_TIME_KEY);
  setDoc(doc(db, 'configs', 'wipeState'), { wipeTime: 0 }).catch(() => {});

  // 1. Deduplicate incoming batch first
  const { cleaned: cleanedNewTxs, removedCount: inBatchDupes } = deduplicateTransactionList(newTxs);

  const current = getTransactions();
  const index = buildTransactionIndex(current);
  const currentMap = new Map(current.map(tx => [tx.id, tx]));

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let imported = 0;
  let duplicates = inBatchDupes;

  // Track only modified or new transactions for Firestore persistence
  const changedTxs: Transaction[] = [];

  cleanedNewTxs.forEach(tx => {
    // Fast O(1) duplicate search
    const existingTx = findMatchingDuplicateInIndex(tx, index);

    if (existingTx) {
      duplicates++;
      const isNowIdentified = tx.identificada || existingTx.identificada;
      const bestComprobante = (isRealComprobante(tx.comprobante) ? tx.comprobante : null) ||
                              (isRealComprobante(existingTx.comprobante) ? existingTx.comprobante : null) ||
                              tx.comprobante || existingTx.comprobante;
      const bestOficina = tx.oficina || existingTx.oficina;

      const updatedTx: Transaction = {
        ...existingTx,
        identificada: isNowIdentified,
        esHistorico: false, // Restore / un-archive transaction on re-import
        comprobante: bestComprobante,
        oficina: bestOficina,
        nroReciboCaja: tx.nroReciboCaja || existingTx.nroReciboCaja,
        fechaIdentificacion: tx.fechaIdentificacion || existingTx.fechaIdentificacion || (isNowIdentified ? getColombiaDateTime().dateTimeStr : null),
        usuarioIdentificacion: tx.usuarioIdentificacion || existingTx.usuarioIdentificacion || uploaderName,
        asesor: tx.asesor || existingTx.asesor || null,
        tipoDocumento: tx.tipoDocumento || existingTx.tipoDocumento || null,
        justificacionIgnorado: tx.justificacionIgnorado || existingTx.justificacionIgnorado || null
      };
      currentMap.set(existingTx.id, updatedTx);
      index.byId.set(updatedTx.id, updatedTx);
      if (updatedTx.llaveUnica) index.byLlaveUnica.set(updatedTx.llaveUnica, updatedTx);
      changedTxs.push(updatedTx);
    } else {
      const newTx = {
        ...tx,
        batchId
      };
      currentMap.set(newTx.id, newTx);
      index.byId.set(newTx.id, newTx);
      if (newTx.llaveUnica) index.byLlaveUnica.set(newTx.llaveUnica, newTx);
      changedTxs.push(newTx);
      imported++;
    }
  });

  const updatedTxs = Array.from(currentMap.values());
  updatedTxs.sort((a, b) => {
    const dateTimeA = `${a.fecha} ${a.hora || '00:00:00'}`;
    const dateTimeB = `${b.fecha} ${b.hora || '00:00:00'}`;
    return dateTimeB.localeCompare(dateTimeA);
  });

  // Immediate local state update
  safeSetLocalStorage(STORAGE_TRANS_KEY, JSON.stringify(updatedTxs));

  const finalFileName = fileName || 'archivo_movimientos.xlsx';
  const nowStr = getColombiaDateTime().dateTimeStr;

  const batches = getUploadBatches();
  const newBatch: UploadBatch = {
    id: batchId,
    nombreArchivo: finalFileName,
    fechaCarga: nowStr,
    usuario: uploaderName,
    totalLeidos: newTxs.length,
    totalImportados: imported,
    totalDuplicados: duplicates
  };

  batches.unshift(newBatch);
  safeSetLocalStorage(STORAGE_BATCHES_KEY, JSON.stringify(batches));

  notifyListeners();

  // 2. Direct Cloud Sync to Firestore
  try {
    let downloadUrl = '';
    if (fileBlob) {
      try {
        const storageRef = ref(storage, `batches/${batchId}/${fileBlob.name}`);
        const uploadTask = uploadBytes(storageRef, fileBlob);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Storage upload timeout')), 2500)
        );
        const snapshot = await Promise.race([uploadTask, timeoutPromise]);
        downloadUrl = await getDownloadURL(snapshot.ref);
      } catch (stgErr) {
        console.warn("Firebase Storage upload skipped or timed out, proceeding with db save:", stgErr);
      }
    }

    // Save modified or new transactions to Firestore in chunks of 500 concurrently
    if (changedTxs.length > 0) {
      const chunks = [];
      for (let i = 0; i < changedTxs.length; i += 500) {
        chunks.push(changedTxs.slice(i, i + 500));
      }

      await Promise.all(
        chunks.map(async (chunk) => {
          const bWrite = writeBatch(db);
          chunk.forEach(tx => {
            const cleanTx: Record<string, any> = {};
            for (const [key, value] of Object.entries(tx)) {
              if (value !== undefined) {
                cleanTx[key] = value;
              }
            }
            bWrite.set(doc(db, 'transactions', tx.id), cleanTx, { merge: true });
          });
          return bWrite.commit();
        })
      );
    }

    // Save batch record to Firestore
    const persistentBatch: UploadBatch = {
      ...newBatch,
      archivoUrl: downloadUrl || undefined
    };

    const cleanPersistentBatch: Record<string, any> = {};
    for (const [key, value] of Object.entries(persistentBatch)) {
      if (value !== undefined) {
        cleanPersistentBatch[key] = value;
      }
    }
    await setDoc(doc(db, 'batches', batchId), cleanPersistentBatch);

    await addAuditLog(
      uploaderName,
      'Carga de Archivo',
      `Subió '${persistentBatch.nombreArchivo}'. Registros: ${newTxs.length}. Importados: ${imported}, Duplicados: ${duplicates}`
    );
  } catch (e: any) {
    console.warn("[Firestore Upload Sync Warning]:", e?.message || e);
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
  safeSetLocalStorage(STORAGE_TRANS_KEY, JSON.stringify(filteredTxs));
  batches.splice(batchIdx, 1);
  safeSetLocalStorage(STORAGE_BATCHES_KEY, JSON.stringify(batches));
  notifyListeners();

  // 2. Async storage and firestore cleanup
  (async () => {
    try {
      // Delete transactions from Firestore in batch chunks
      const txsToDelete = currentTxs.filter(tx => tx.batchId === batchId);
      for (let i = 0; i < txsToDelete.length; i += 500) {
        const chunk = txsToDelete.slice(i, i + 500);
        const bWrite = writeBatch(db);
        chunk.forEach(tx => {
          bWrite.delete(doc(db, 'transactions', tx.id));
        });
        await bWrite.commit();
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
  justificacionIgnorado?: string | null,
  customFechaIdentificacion?: string | null
): boolean {
  const current = getTransactions();
  const idx = current.findIndex(tx => tx.id === id || tx.llaveUnica === id);
  if (idx === -1) return false;

  if (current[idx].identificada) return false;

  let finalFechaIdent = getColombiaDateTime().dateTimeStr;
  if (customFechaIdentificacion && customFechaIdentificacion.trim() !== '') {
    const cleanDate = customFechaIdentificacion.trim();
    if (cleanDate.length === 10) {
      const timePart = getColombiaDateTime().dateTimeStr.slice(11);
      finalFechaIdent = `${cleanDate} ${timePart}`;
    } else {
      finalFechaIdent = cleanDate;
    }
  }

  const targetId = current[idx].id;
  const updatedTx = {
    ...current[idx],
    identificada: true,
    fechaIdentificacion: finalFechaIdent,
    usuarioIdentificacion: cajeraName,
    asesor: tipoDocumento === 'Ignorado' ? null : (asesor || null),
    tipoDocumento,
    nroReciboCaja: tipoDocumento === 'Ignorado' ? null : (nroReciboCaja || null),
    justificacionIgnorado: tipoDocumento === 'Ignorado' ? (justificacionIgnorado || null) : null
  };

  current[idx] = updatedTx;

  safeSetLocalStorage(STORAGE_TRANS_KEY, JSON.stringify(current));
  notifyListeners();

  setDoc(doc(db, 'transactions', targetId), updatedTx).catch(err => {
    console.error("Error identifying transaction in Firestore:", err);
  });

  addAuditLog(
    cajeraName,
    tipoDocumento === 'Ignorado' ? 'Pago Ignorado' : 'Validación de Pago',
    tipoDocumento === 'Ignorado'
      ? `Ignoró transacción ${updatedTx.llaveUnica.slice(0, 15)}... - Razón: ${justificacionIgnorado} (Fecha Validación: ${finalFechaIdent.slice(0, 10)})`
      : `Identificó transacción ${updatedTx.llaveUnica.slice(0, 15)}... como ${tipoDocumento} - Asesor: ${asesor || 'No especificado'} (Fecha Validación: ${finalFechaIdent.slice(0, 10)})`
  );

  return true;
}

export function updateTransactionFechaIdentificacion(
  id: string,
  newFechaDate: string,
  adminName: string
): boolean {
  const current = getTransactions();
  const idx = current.findIndex(tx => tx.id === id || tx.llaveUnica === id);
  if (idx === -1) return false;

  const targetId = current[idx].id;
  const currentTime = current[idx].fechaIdentificacion
    ? current[idx].fechaIdentificacion!.slice(11)
    : getColombiaDateTime().dateTimeStr.slice(11);

  const finalFechaIdent = `${newFechaDate} ${currentTime || '12:00:00'}`;

  const updatedTx = {
    ...current[idx],
    fechaIdentificacion: finalFechaIdent
  };

  current[idx] = updatedTx;
  safeSetLocalStorage(STORAGE_TRANS_KEY, JSON.stringify(current));
  notifyListeners();

  setDoc(doc(db, 'transactions', targetId), updatedTx, { merge: true }).catch(err => {
    console.error("Error updating fechaIdentificacion in Firestore:", err);
  });

  addAuditLog(
    adminName,
    'Modificación Fecha Validación',
    `Cambió fecha de validación de transacción ${updatedTx.llaveUnica.slice(0, 15)}... a ${newFechaDate}`
  );

  return true;
}

export function revertIdentification(id: string, adminName: string, adminRole: string = 'Admin'): boolean {
  const current = getTransactions();
  const idx = current.findIndex(tx => tx.id === id || tx.llaveUnica === id);
  if (idx === -1) return false;

  const targetId = current[idx].id;
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

  safeSetLocalStorage(STORAGE_TRANS_KEY, JSON.stringify(current));
  notifyListeners();

  setDoc(doc(db, 'transactions', targetId), updatedTx).catch(err => {
    console.error("Error reverting identification in Firestore:", err);
  });

  addAuditLog(
    adminName,
    'Reversión de Identificación',
    `Revirtió transacción ${targetId.slice(0, 15)}... (Era ${originalDoc}, Asesor: ${originalAsesor}) por ${adminRole}`
  );

  return true;
}

export function requestTransactionChange(id: string, user: User, reason: string): boolean {
  const current = getTransactions();
  const idx = current.findIndex(tx => tx.id === id || tx.llaveUnica === id);
  if (idx === -1) return false;

  const targetId = current[idx].id;
  const updatedTx = {
    ...current[idx],
    solicitudCambio: 'pendiente' as const,
    solicitudMotivo: reason,
    solicitudUsuario: user.nombre,
    solicitudFecha: getColombiaDateTime().dateTimeStr
  };

  current[idx] = updatedTx;

  safeSetLocalStorage(STORAGE_TRANS_KEY, JSON.stringify(current));
  notifyListeners();

  setDoc(doc(db, 'transactions', targetId), updatedTx).catch(err => {
    console.error("Error requesting transaction change in Firestore:", err);
  });

  addAuditLog(
    user.nombre,
    'Solicitud de Cambio',
    `Solicitó cambio/liberación para la transacción ${targetId.slice(-8).toUpperCase()} - Motivo: ${reason}`
  );

  // Send automatic chat message to 'general' so both cashier and admin see it in the general chat
  const msgText = `[REVERSION_PENDIENTE] Solicitud de Reversión\n• Colaborador: ${user.nombre}\n• Transacción: ${updatedTx.llaveUnica.slice(-12).toUpperCase()}\n• Valor: $${updatedTx.valor.toLocaleString()}\n• Sede: ${updatedTx.sede}\n• Motivo: "${reason}"\n• TxId: ${targetId}`;
  
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
  const idx = current.findIndex(tx => tx.id === id || tx.llaveUnica === id);
  if (idx === -1) return false;

  const targetId = current[idx].id;
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
      `Aprobó liberación de transacción ${targetId.slice(-8).toUpperCase()} solicitada por ${updatedTx.solicitudUsuario} (${adminRole})`
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
      `Corrigió directamente la transacción ${targetId.slice(-8).toUpperCase()} - Nuevo Doc: ${fields?.tipoDocumento}, Asesor: ${fields?.asesor || 'N/A'}`
    );
  }

  current[idx] = updatedTx;

  safeSetLocalStorage(STORAGE_TRANS_KEY, JSON.stringify(current));
  notifyListeners();

  setDoc(doc(db, 'transactions', targetId), updatedTx).catch(err => {
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

export function restoreAllArchivedTransactions(adminName: string): { totalRestored: number } {
  const current = getTransactions();
  let count = 0;
  const updated = current.map(tx => {
    if (tx.esHistorico) {
      count++;
      return { ...tx, esHistorico: false };
    }
    return tx;
  });

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
      console.error("Error in restoreAllArchivedTransactions write:", e);
    }
  })();

  addAuditLog(
    adminName,
    'Restauración de Datos',
    `Restauró/desarchivó ${count} transacciones históricas a estado activo.`
  );

  return { totalRestored: count };
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

export function registrarCierreCaja(
  fecha: string, 
  sede: Sede, 
  nombreCajera: string, 
  numeroIdentificados: number,
  totalIdentificado: number,
  totalAplicativo: number,
  coincide: boolean,
  motivoDiferencia?: string | null,
  bloqueado: boolean = true
): CierreCaja {
  localStorage.removeItem(STORAGE_WIPE_TIME_KEY);
  const cierres = getCierresCaja();
  const id = `cierre_${sede}_${fecha}`;
  
  const existingIdx = cierres.findIndex(c => c.id === id);
  
  const dif = totalIdentificado - totalAplicativo;

  const nuevoCierre: CierreCaja = {
    id,
    fecha,
    sede,
    nombreCajera,
    numeroIdentificados,
    totalIdentificado,
    totalAplicativo,
    coincide,
    motivoDiferencia: coincide ? null : (motivoDiferencia || null),
    diferencia: dif,
    totalDeclarado: totalIdentificado,
    fechaCreacion: getColombiaDateTime().dateTimeStr,
    bloqueado,
    solicitaDesbloqueo: false,
    motivoDesbloqueo: null
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
    'Cierre de Caja Guardado y Bloqueado', 
    `Sede: ${sede}, Fecha: ${fecha}, Identificados: ${numeroIdentificados} ($${totalIdentificado.toLocaleString('es-CO')}), Aplicativo: $${totalAplicativo.toLocaleString('es-CO')}, Coincide: ${coincide ? 'SÍ' : 'NO'}${!coincide ? ` - Motivo: ${motivoDiferencia}` : ''}`
  );

  return nuevoCierre;
}

export function importarCierresCajaBulk(nuevosCierres: CierreCaja[]): number {
  if (!nuevosCierres || nuevosCierres.length === 0) return 0;
  
  const cierres = getCierresCaja();
  let count = 0;

  for (const c of nuevosCierres) {
    const idx = cierres.findIndex(x => x.id === c.id);
    if (idx >= 0) {
      cierres[idx] = { ...cierres[idx], ...c };
    } else {
      cierres.push(c);
    }
    count++;

    setDoc(doc(db, 'cierres', c.id), c).catch(e => {
      console.error("Error bulk inserting closure to Firestore:", e);
    });
  }

  localStorage.setItem(STORAGE_CIERRES_KEY, JSON.stringify(cierres));
  notifyListeners();
  return count;
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
    safeSetLocalStorage(STORAGE_CIERRES_KEY, JSON.stringify(cierres));
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

export async function clearAllDatabase(usuario: string): Promise<void> {
  // 1. Instantly clear local storage cache and notify listeners
  safeSetLocalStorage(STORAGE_TRANS_KEY, JSON.stringify([]));
  safeSetLocalStorage(STORAGE_BATCHES_KEY, JSON.stringify([]));
  safeSetLocalStorage(STORAGE_CIERRES_KEY, JSON.stringify([]));
  safeSetLocalStorage(STORAGE_CHAT_KEY, JSON.stringify([]));
  safeSetLocalStorage(STORAGE_VIDEOCALLS_KEY, JSON.stringify([]));
  safeSetLocalStorage(STORAGE_LOGS_KEY, JSON.stringify([]));
  localStorage.removeItem(STORAGE_WIPE_TIME_KEY);
  notifyListeners();

  // 2. Clear wipeState in Firestore if present
  try {
    await deleteDoc(doc(db, 'configs', 'wipeState')).catch(() => {});
  } catch (e) {}

  // 3. Delete ALL documents in all data collections from Firestore
  const collectionsToClear = ['transactions', 'batches', 'cierres', 'logs', 'chat', 'videocalls'];
  for (const colName of collectionsToClear) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      const docs = snapshot.docs;
      
      // Batch delete in chunks of 500
      for (let i = 0; i < docs.length; i += 500) {
        const chunk = docs.slice(i, i + 500);
        const bWrite = writeBatch(db);
        chunk.forEach(d => {
          bWrite.delete(d.ref);
        });
        await bWrite.commit();
      }
    } catch (colErr) {
      console.warn(`[Wipe] Error clearing collection ${colName}:`, colErr);
    }
  }

  // 4. Log the audit action
  await addAuditLog(usuario, 'Limpieza Total', 'Se borraron todas las transacciones, exceles subidos e historial de cierres de caja del sistema.');

  // 5. Final local cache wipe & listener notification
  safeSetLocalStorage(STORAGE_TRANS_KEY, JSON.stringify([]));
  safeSetLocalStorage(STORAGE_BATCHES_KEY, JSON.stringify([]));
  safeSetLocalStorage(STORAGE_CIERRES_KEY, JSON.stringify([]));
  safeSetLocalStorage(STORAGE_CHAT_KEY, JSON.stringify([]));
  safeSetLocalStorage(STORAGE_VIDEOCALLS_KEY, JSON.stringify([]));
  notifyListeners();
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

export function sendChatMessage(senderId: string, senderName: string, senderRole: Role, text: string, receiverId?: string | null, image?: string | null): ChatMessage {
  const messages = getChatMessages();
  const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const newMessage: ChatMessage = {
    id,
    senderId,
    senderName,
    senderRole,
    receiverId: receiverId || null,
    text,
    timestamp: getColombiaDateTime().dateTimeStr,
    image: image || null
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

export function clearChatMessages(threadId?: string): boolean {
  const messages = getChatMessages();
  let toKeep: ChatMessage[] = [];
  let toDelete: ChatMessage[] = [];

  if (!threadId || threadId === 'all') {
    toDelete = [...messages];
    toKeep = [];
  } else if (threadId === 'general') {
    toDelete = messages.filter(msg => msg.receiverId === 'general' || !msg.receiverId);
    toKeep = messages.filter(msg => msg.receiverId && msg.receiverId !== 'general');
  } else {
    // Thread with specific user ID
    toDelete = messages.filter(msg =>
      msg.receiverId === threadId || msg.senderId === threadId
    );
    toKeep = messages.filter(msg =>
      !(msg.receiverId === threadId || msg.senderId === threadId)
    );
  }

  localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(toKeep));
  notifyListeners();

  (async () => {
    try {
      const chunks = [];
      for (let i = 0; i < toDelete.length; i += 500) {
        chunks.push(toDelete.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const bWrite = writeBatch(db);
        chunk.forEach(msg => {
          bWrite.delete(doc(db, 'chat', msg.id));
        });
        await bWrite.commit();
      }
    } catch (e) {
      console.error("Error clearing chat messages in Firestore:", e);
    }
  })();

  return true;
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
  customMeetLink?: string,
  type: 'video' | 'voice' = 'video'
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
    createdAt: getColombiaDateTime().dateTimeStr,
    type
  };

  const currentCalls = getVideoCalls();
  currentCalls.unshift(newCall);
  localStorage.setItem(STORAGE_VIDEOCALLS_KEY, JSON.stringify(currentCalls));
  notifyListeners();

  try {
    await setDoc(doc(db, 'videocalls', id), newCall);
  } catch (err: any) {
    if (err?.code === 'resource-exhausted') {
      console.warn(`[Firestore Quota] Limit reached for startVideoCall. Video call recorded locally.`);
    } else {
      console.warn(`[Firestore VideoCall] Error starting video call:`, err?.message || err);
    }
  }
  const callTypeName = type === 'voice' ? 'Llamada de voz' : 'Videollamada';
  addAuditLog(senderName, `${callTypeName} Iniciada`, `Inició una ${callTypeName.toLowerCase()} para ${receiverName}.`);

  return newCall;
}

export async function updateVideoCallStatus(callId: string, status: 'accepted' | 'declined' | 'ended'): Promise<void> {
  const calls = getVideoCalls();
  const index = calls.findIndex(c => c.id === callId);
  if (index !== -1) {
    const call = calls[index];
    call.status = status;
    const nowStr = getColombiaDateTime().dateTimeStr;
    const updatePayload: any = { status };

    if (status === 'accepted') {
      call.acceptedAt = nowStr;
      updatePayload.acceptedAt = nowStr;
    } else if (status === 'ended') {
      call.endedAt = nowStr;
      updatePayload.endedAt = nowStr;
    }

    localStorage.setItem(STORAGE_VIDEOCALLS_KEY, JSON.stringify(calls));
    notifyListeners();

    try {
      await setDoc(doc(db, 'videocalls', callId), updatePayload, { merge: true });
    } catch (err: any) {
      if (err?.code === 'resource-exhausted') {
        console.warn(`[Firestore Quota] Limit reached for updateVideoCallStatus. Local status updated.`);
      } else {
        console.warn(`[Firestore VideoCall] Error updating status:`, err?.message || err);
      }
    }

    const callTypeName = call.type === 'voice' ? 'Llamada de voz' : 'Videollamada';

    if (status === 'accepted') {
      addAuditLog(call.receiverName, `${callTypeName} Aceptada`, `Aceptó la ${callTypeName.toLowerCase()} de ${call.senderName}.`);
    } else if (status === 'declined') {
      addAuditLog(call.receiverName, `${callTypeName} Rechazada`, `Rechazó la ${callTypeName.toLowerCase()} de ${call.senderName}.`);
      sendChatMessage(
        call.senderId,
        call.senderName,
        call.senderRole,
        `📞 ${callTypeName} no contestada / rechazada`,
        call.receiverId
      );
    } else if (status === 'ended') {
      addAuditLog(call.senderName, `${callTypeName} Finalizada`, `Finalizó la ${callTypeName.toLowerCase()} con ${call.receiverName}.`);
      
      // Calculate call duration
      let durationText = 'duración desconocida';
      const callFull = { ...call, ...updatePayload };
      if (callFull.acceptedAt) {
        try {
          const start = new Date(callFull.acceptedAt.replace(' ', 'T')).getTime();
          const end = new Date(nowStr.replace(' ', 'T')).getTime();
          const diffSec = Math.max(0, Math.floor((end - start) / 1000));
          const mins = Math.floor(diffSec / 60);
          const secs = diffSec % 60;
          durationText = `${mins}m ${secs}s`;
        } catch (e) {
          console.error("Error calculating duration:", e);
        }
      } else {
        durationText = 'no contestada';
      }

      // Add call log to chat conversation
      sendChatMessage(
        call.senderId,
        call.senderName,
        call.senderRole,
        `📞 ${callTypeName} finalizada. Duración: ${durationText}`,
        call.receiverId
      );
    }
  }
}

export function getReportConfig(): ReportConfig {
  const data = localStorage.getItem(STORAGE_REPORT_CONFIG_KEY);
  const defaultConfig: ReportConfig = {
    id: 'cajera_reports_visibility',
    showSumaConsolidada: true,
    showEficaciaConciliaria: true,
    showParticipacionSede: false,
    showRendimientoAsesores: true,
    showFiltrosConsulta: false
  };
  if (!data) return defaultConfig;
  try {
    return { ...defaultConfig, ...JSON.parse(data) } as ReportConfig;
  } catch (e) {
    return defaultConfig;
  }
}

export async function updateReportConfig(config: Partial<ReportConfig>): Promise<void> {
  const current = getReportConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(STORAGE_REPORT_CONFIG_KEY, JSON.stringify(updated));
  notifyListeners();

  try {
    await setDoc(doc(db, 'configs', 'reports'), updated, { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted') {
      console.warn(`[Firestore Quota] Limit reached for updateReportConfig. Saved locally.`);
    } else {
      console.warn(`[Firestore ReportConfig] Error updating config:`, err?.message || err);
    }
  }
}

