export type Role = 'Admin' | 'Tesorera' | 'Cajera' | 'Asesor';

export type Sede = 'Guayabal' | 'Sabaneta' | 'Naranjal' | 'Desconocida';

export interface User {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  sede?: Sede; // If Cajera, specifically bound to a branch
  isBlocked?: boolean; // Blocked or disabled flag
  password?: string; // Optional custom user password
}

export interface Transaction {
  id: string; // The llaveUnica (combination of account + date + time + value + description)
  llaveUnica: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM:SS format
  descripcion: string;
  valor: number;
  cuenta: string; // full or last digits
  sede: Sede;
  identificada: boolean;
  fechaIdentificacion?: string | null;
  usuarioIdentificacion?: string | null; // name/email of the Cajera
  asesor?: string | null; // Predefined list of advisors
  tipoDocumento?: 'Recibo' | 'Remisión' | 'Ignorado' | null;
  justificacionIgnorado?: string | null;
  nroReciboCaja?: string | null;
  fechaCarga: string; // YYYY-MM-DD HH:MM:SS
  esHistorico: boolean; // Cleared/archived during monthly cleanup
  oficina?: string;
  comprobante?: string;
  esQR?: boolean; // Tagged as QR payment
  batchId?: string | null; // Associates transaction with a specific excel upload batch
  solicitudCambio?: 'pendiente' | 'liberado' | 'corregido' | null;
  solicitudMotivo?: string | null;
  solicitudUsuario?: string | null;
  solicitudFecha?: string | null;
  revertidoPorUsuario?: string | null;
  revertidoPorRol?: string | null;
  revertidoFecha?: string | null;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  usuario: string;
  accion: string;
  detalles: string;
}

export interface CierreCaja {
  id: string;
  fecha: string; // YYYY-MM-DD
  sede: Sede;
  nombreCajera: string;
  numeroIdentificados: number;
  totalIdentificado: number;
  totalAplicativo: number;
  coincide: boolean;
  motivoDiferencia?: string | null;
  diferencia?: number;
  totalDeclarado: number;
  fechaCreacion: string;
  bloqueado: boolean;
  solicitaDesbloqueo?: boolean;
  motivoDesbloqueo?: string | null;
}

export interface UploadBatch {
  id: string;
  nombreArchivo: string;
  fechaCarga: string; // YYYY-MM-DD HH:MM:SS
  usuario: string;
  totalLeidos: number;
  totalImportados: number;
  totalDuplicados: number;
  archivoUrl?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  receiverId?: string | null; // Specific recipient or 'all_admins'
  text: string;
  timestamp: string;
  image?: string | null;
}

export interface VideoCall {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  receiverId: string;
  receiverName: string;
  meetLink: string;
  status: 'pending' | 'accepted' | 'declined' | 'ended';
  createdAt: string;
  type?: 'video' | 'voice';
  acceptedAt?: string;
  endedAt?: string;
}

export interface ReportConfig {
  id: string;
  showSumaConsolidada: boolean;
  showEficaciaConciliaria: boolean;
  showParticipacionSede: boolean;
  showRendimientoAsesores: boolean;
  showFiltrosConsulta: boolean;
}


