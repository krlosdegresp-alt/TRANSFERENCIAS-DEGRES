import React, { useState, useEffect } from 'react';
import { 
  getTransactions, 
  revertIdentification, 
  executeMonthlyCleanup, 
  getAuditLogs, 
  getUsers,
  saveUsers, 
  addAuditLog,
  subscribeToDatabase,
  clearAllDatabase,
  getCierresCaja,
  aprobarDesbloqueoCierre,
  rechazarDesbloqueoCierre,
  registrarCierreCaja
} from '../firebase';
import { formatCOP, formatDateHuman, getColombiaDateTime } from '../utils/formato';
import { Transaction, User, Role, Sede, AuditLog, CierreCaja } from '../types';
import * as XLSX from 'xlsx';
import { 
  Settings, 
  ShieldAlert, 
  UserPlus, 
  History, 
  Download, 
  Undo2, 
  AlertTriangle,
  Users,
  Search,
  Check,
  RefreshCw,
  ServerCrash,
  Trash2,
  Edit2,
  Ban,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: User;
  transactions: Transaction[];
  onRefreshData: () => void;
}

export default function AdminPanel({ currentUser, transactions, onRefreshData }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'roles' | 'reversiones' | 'limpieza' | 'logs' | 'desbloqueos'>(
    currentUser.role === 'Tesorera' ? 'reversiones' : 'roles'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [userList, setUserList] = useState<User[]>(() => getUsers());
  const [cierresCajaList, setCierresCajaList] = useState<CierreCaja[]>(() => getCierresCaja());

  const [editingCierreId, setEditingCierreId] = useState<string | null>(null);
  const [nuevoValorCierre, setNuevoValorCierre] = useState<string>('');

  // Custom dialog and modal states to bypass iframe blocking restrictions
  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info' | 'success';
  } | null>(null);

  const [customAlert, setCustomAlert] = useState<{
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
  } | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' | 'success' = 'warning') => {
    setCustomConfirm({ title, message, onConfirm, type });
  };

  const triggerAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setCustomAlert({ title, message, type });
  };

  useEffect(() => {
    setUserList(getUsers());
    setCierresCajaList(getCierresCaja());
    const unsubscribe = subscribeToDatabase(() => {
      setUserList(getUsers());
      setCierresCajaList(getCierresCaja());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // New user form state
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('Cajera');
  const [newSede, setNewSede] = useState<Sede>('Guayabal');
  const [newPassword, setNewPassword] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Editing user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Role>('Cajera');
  const [editSede, setEditSede] = useState<Sede>('Guayabal');
  const [editPassword, setEditPassword] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Admin Own Password 2FA change states
  const [showAdminPswModal, setShowAdminPswModal] = useState(false);
  const [adminPsw2FAStage, setAdminPsw2FAStage] = useState<'request' | 'verify' | 'new-password'>('request');
  const [adminPsw2FACode, setAdminPsw2FACode] = useState('');
  const [adminPswInputCode, setAdminPswInputCode] = useState('');
  const [adminNewPsw, setAdminNewPsw] = useState('');
  const [adminNewPswConfirm, setAdminNewPswConfirm] = useState('');
  const [adminPswError, setAdminPswError] = useState('');
  const [adminPswSuccess, setAdminPswSuccess] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // List of identified transactions that could be reverted
  const identifiedTxs = transactions.filter(tx => tx.identificada && !tx.esHistorico);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre || !newEmail) {
      triggerAlert('Campos Incompletos', 'Por favor completa todos los campos.', 'error');
      return;
    }

    const emailLower = newEmail.trim().toLowerCase();
    if (!emailLower.endsWith('@degrescolombia.com')) {
      triggerAlert('Restricción de Seguridad', 'Únicamente se permite dar acceso a correos con el dominio corporativo @degrescolombia.com', 'error');
      return;
    }

    const newUser: User = {
      id: 'u_' + Date.now(),
      nombre: newNombre,
      email: emailLower,
      role: newRole,
      sede: newRole === 'Cajera' ? newSede : undefined,
      password: newPassword ? newPassword.trim() : 'Degres123'
    };

    const updated = [newUser, ...userList];
    setIsSavingUser(true);
    try {
      setUserList(updated);
      await saveUsers(updated);
      addAuditLog(currentUser.nombre, 'Creación de Usuario', `Creado usuario ${newNombre} con rol ${newRole}`);
      triggerAlert('Colaborador Creado', `¡El colaborador "${newNombre}" ha sido guardado exitosamente en la base de datos!`, 'success');
      
      // reset form
      setNewNombre('');
      setNewEmail('');
      setNewPassword('');
      setShowAddForm(false);
    } catch (error) {
      console.error(error);
      triggerAlert('Error de Guardado', 'Hubo un inconveniente al guardar el colaborador en la base de datos.', 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleUpdateUserRole = async (id: string, role: Role, sede?: Sede) => {
    const updated = userList.map(u => {
      if (u.id === id) {
        return {
          ...u,
          role,
          sede: role === 'Cajera' ? (sede || 'Guayabal') : undefined
        };
      }
      return u;
    });

    setIsSavingUser(true);
    try {
      setUserList(updated);
      await saveUsers(updated);
      const usr = userList.find(u => u.id === id);
      addAuditLog(currentUser.nombre, 'Ajuste de Rol', `Modificado rol de ${usr?.nombre} a ${role}`);
      triggerAlert('Rol Actualizado', 'El rol del colaborador se actualizó y guardó exitosamente.', 'success');
    } catch (err) {
      console.error(err);
      triggerAlert('Error', 'No se pudo guardar el cambio de rol.', 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleStartEdit = (usr: User) => {
    setEditingUserId(usr.id);
    setEditNombre(usr.nombre);
    setEditEmail(usr.email);
    setEditRole(usr.role);
    setEditSede(usr.sede || 'Guayabal');
    setEditPassword(usr.password || '');
  };

  const handleSaveEdit = async () => {
    if (!editNombre || !editEmail) {
      triggerAlert('Campos Incompletos', 'Por favor completa todos los campos.', 'error');
      return;
    }
    const emailLower = editEmail.trim().toLowerCase();
    if (!emailLower.endsWith('@degrescolombia.com')) {
      triggerAlert('Restricción de Seguridad', 'Únicamente se permiten correos con el dominio @degrescolombia.com', 'error');
      return;
    }

    const updated = userList.map(u => {
      if (u.id === editingUserId) {
        return {
          ...u,
          nombre: editNombre,
          email: emailLower,
          role: editRole,
          isBlocked: u.isBlocked, // preserve existing block status
          password: editRole !== 'Admin' ? (editPassword.trim() || u.password || 'Degres123') : u.password,
          sede: editRole === 'Cajera' ? editSede : undefined
        };
      }
      return u;
    });

    setIsSavingUser(true);
    try {
      setUserList(updated);
      await saveUsers(updated);
      addAuditLog(currentUser.nombre, 'Edición de Colaborador', `Modificados datos del colaborador ${editNombre} (${emailLower})`);
      setEditingUserId(null);
      triggerAlert('Cambios Guardados', 'Los cambios en los datos del colaborador han sido guardados exitosamente.', 'success');
    } catch (err) {
      console.error(err);
      triggerAlert('Error de Guardado', 'No se pudieron guardar las modificaciones.', 'error');
    } finally {
      setIsSavingUser(false);
    }
  };

  // 2FA Admin Password Change Operations
  const handleOpenAdminPswChange = () => {
    setShowAdminPswModal(true);
    setAdminPsw2FAStage('request');
    setAdminPswInputCode('');
    setAdminNewPsw('');
    setAdminNewPswConfirm('');
    setAdminPswError('');
    setAdminPswSuccess('');
  };

  const handleSend2FACode = () => {
    // Generate 6 digit code
    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    setAdminPsw2FACode(generated);
    setAdminPsw2FAStage('verify');
    setAdminPswError('');
    addAuditLog(currentUser.nombre, 'Solicitud 2FA', `Código de 2FA solicitado para cambio de contraseña de administración.`);
  };

  const handleVerify2FACode = () => {
    if (adminPswInputCode.trim() === adminPsw2FACode) {
      setAdminPsw2FAStage('new-password');
      setAdminPswError('');
    } else {
      setAdminPswError('Código de verificación incorrecto. Por favor verifique el mensaje de correo recibido.');
    }
  };

  const handleSaveAdminPsw = () => {
    if (!adminNewPsw || adminNewPsw.length < 4) {
      setAdminPswError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (adminNewPsw !== adminNewPswConfirm) {
      setAdminPswError('Las contraseñas no coinciden. Por favor inténtalo de nuevo.');
      return;
    }

    const updated = userList.map(u => {
      if (u.id === currentUser.id) {
        return { ...u, password: adminNewPsw.trim() };
      }
      return u;
    });

    setUserList(updated);
    saveUsers(updated);

    // Sync current session sessionStorage representations
    const updatedUserObj = { ...currentUser, password: adminNewPsw.trim() };
    sessionStorage.setItem('transf_current_user', JSON.stringify(updatedUserObj));

    addAuditLog(currentUser.nombre, 'Actualización de Contraseña Admin', `El Administrador actualizó su propia contraseña tras autenticación de doble factor (2FA).`);
    setAdminPswSuccess('¡Contraseña de Administrador actualizada con éxito!');
    setAdminPswError('');
    
    // Auto close after 2 seconds
    setTimeout(() => {
      setShowAdminPswModal(false);
    }, 2000);
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) {
      triggerAlert('Operación Denegada', 'No puedes eliminar tu propio usuario de sesión.', 'error');
      return;
    }
    const usr = userList.find(u => u.id === id);
    if (!usr) return;

    triggerConfirm(
      'Confirmar Eliminación',
      `¿Estás seguro de que deseas eliminar permanentemente al colaborador ${usr.nombre}?`,
      async () => {
        const updated = userList.filter(u => u.id !== id);
        setIsSavingUser(true);
        try {
          setUserList(updated);
          await saveUsers(updated);
          addAuditLog(currentUser.nombre, 'Eliminación de Colaborador', `Eliminado permanentemente el colaborador ${usr.nombre}`);
          triggerAlert('Colaborador Eliminado', `¡El colaborador "${usr.nombre}" ha sido eliminado exitosamente del sistema!`, 'success');
        } catch (error) {
          console.error(error);
          triggerAlert('Error', 'No se pudo guardar la eliminación en la base de datos.', 'error');
        } finally {
          setIsSavingUser(false);
        }
      },
      'danger'
    );
  };

  const handleToggleBlockUser = (id: string) => {
    if (id === currentUser.id) {
      triggerAlert('Operación Denegada', 'No puedes deshabilitar tu propio usuario de sesión.', 'error');
      return;
    }
    const usr = userList.find(u => u.id === id);
    if (!usr) return;

    const newStatus = !usr.isBlocked;
    const confirmMessage = newStatus 
      ? `¿Estás seguro de que deseas deshabilitar/bloquear el acceso a ${usr.nombre}?`
      : `¿Estás seguro de que deseas habilitar y reactivar el acceso a ${usr.nombre}?`;

    triggerConfirm(
      newStatus ? 'Bloquear Colaborador' : 'Habilitar Colaborador',
      confirmMessage,
      async () => {
        const updated = userList.map(u => {
          if (u.id === id) {
            return { ...u, isBlocked: newStatus };
          }
          return u;
        });
        setIsSavingUser(true);
        try {
          setUserList(updated);
          await saveUsers(updated);
          addAuditLog(currentUser.nombre, newStatus ? 'Deshabilitación' : 'Habilitación', `${newStatus ? 'Deshabilitado' : 'Habilitado'} colaborador ${usr.nombre}`);
          triggerAlert(
            newStatus ? 'Colaborador Bloqueado' : 'Colaborador Habilitado',
            `¡El colaborador "${usr.nombre}" ha sido ${newStatus ? 'bloqueado' : 'habilitado'} exitosamente!`,
            'success'
          );
        } catch (error) {
          console.error(error);
          triggerAlert('Error', 'No se pudo guardar el cambio de estado.', 'error');
        } finally {
          setIsSavingUser(false);
        }
      },
      newStatus ? 'warning' : 'success'
    );
  };

  const handleRevert = (id: string) => {
    triggerConfirm(
      'Confirmar Reversión',
      '¿Estás seguro de que deseas revertir este pago conciliado? Retornará a la sucursal asignada en estado Pendiente.',
      () => {
        const success = revertIdentification(id, currentUser.nombre);
        if (success) {
          onRefreshData();
          triggerAlert('Pago Revertido', 'La validación del pago ha sido revertida de forma exitosa.', 'success');
        }
      },
      'warning'
    );
  };

  // Monthly archive: downloads CSV and marks everything as historic
  const handleMonthlyArchive = () => {
    // 1. Double check there are payments in the database
    if (transactions.length === 0) {
      triggerAlert('Sin Datos', 'No hay ninguna transacción acumulada para archivar.', 'info');
      return;
    }

    triggerConfirm(
      'Limpieza y Cierre Mensual',
      '¿Desea ejecutar la LIMPIEZA MENSUAL del sistema?\n\nEsto descargará un archivo excel histórico conteniendo todas las transacciones vigentes con sus llaves de seguridad, y luego las archivará para que no entren en conflicto con el mes entrante.',
      () => {
        try {
          // 2. Prepare spreadsheet format
          const formattedData = transactions.map(tx => ({
            'Llave Unica': tx.llaveUnica,
            'Fecha': tx.fecha,
            'Hora': tx.hora,
            'Descripcion': tx.descripcion,
            'Valor COP': tx.valor,
            'Banco Cuenta': tx.cuenta,
            'Sede Fisica': tx.sede,
            'Identificada (S/N)': tx.identificada ? 'S' : 'N',
            'Asesor Responsable': tx.asesor || 'Ninguno',
            'Tipo Documento': tx.tipoDocumento || 'Ninguno',
            'Auxiliar Identificacion': tx.usuarioIdentificacion || 'Ninguno',
            'Fecha Validacion': tx.fechaIdentificacion || 'Ninguno',
            'Es Historico (S/N)': tx.esHistorico ? 'S' : 'N'
          }));

          // Create sheet and workbook
          const worksheet = XLSX.utils.json_to_sheet(formattedData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Historico_Transferencias');

          // Adjust column widths
          worksheet['!cols'] = [
            { wch: 45 }, // Llave
            { wch: 12 }, // Fecha
            { wch: 10 }, // Hora
            { wch: 30 }, // Descripcion
            { wch: 14 }, // Valor
            { wch: 18 }, // Cuenta
            { wch: 14 }, // Sede
            { wch: 16 }, // Identificada
            { wch: 20 }, // Asesor
            { wch: 15 }, // Documento
            { wch: 25 }, // Auxiliar
            { wch: 20 }, // Fecha Validacion
            { wch: 16 }  // Historico
          ];

          // Download file
          const dateStr = getColombiaDateTime().dateStr;
          XLSX.writeFile(workbook, `Historico_Transferencias_Cierre_${dateStr}.xlsx`);

          // 3. Mark active entries in state as esHistorico = true
          const res = executeMonthlyCleanup(currentUser.nombre);
          onRefreshData();

          triggerAlert(
            'Limpieza Completada',
            `¡Limpieza Mensual Completada!\n\nSe descargó el archivo 'Historico_Transferencias_Cierre_${dateStr}.xlsx' con ${res.totalArchived} registros y se limpiaron las sucursales para el nuevo período fiscal.`,
            'success'
          );

        } catch (err) {
          console.error('Error in cleanup export process', err);
          triggerAlert('Error', 'Error al realizar el cierre mensual y exportar el Excel.', 'error');
        }
      },
      'warning'
    );
  };

  const handleClearAll = () => {
    triggerConfirm(
      '⚠️ ADVERTENCIA CRÍTICA ⚠️',
      '¿Estás seguro de que deseas BORRAR COMPLETAMENTE toda la información del sistema? Esto eliminará de forma irreversible todas las transacciones bancarias, lotes y cierres de caja guardados.',
      () => {
        // Chained double confirmation
        triggerConfirm(
          'Confirmación Final de Borrado',
          '¿Confirmas la eliminación de toda la información de la plataforma? Esta acción NO se puede deshacer.',
          () => {
            clearAllDatabase(currentUser.nombre);
            onRefreshData();
            triggerAlert('Base de Datos Borrada', 'Toda la información, cierres de caja y Exceles subidos han sido eliminados de la base de datos.', 'success');
          },
          'danger'
        );
      },
      'danger'
    );
  };

  const handleAprobarDesbloqueo = (fecha: string, sede: Sede) => {
    triggerConfirm(
      'Aprobar Desbloqueo',
      `¿Estás seguro de que deseas aprobar la solicitud de desbloqueo para la Sede: ${sede} con Fecha: ${fecha}? Esto permitirá a la cajera volver a cuadrar la caja.`,
      () => {
        const success = aprobarDesbloqueoCierre(fecha, sede, currentUser.nombre);
        if (success) {
          triggerAlert('Desbloqueo Aprobado', `El cierre de la Sede: ${sede} el ${fecha} ha sido desbloqueado con éxito.`, 'success');
          setCierresCajaList(getCierresCaja());
          onRefreshData();
        } else {
          triggerAlert('Error', 'No se pudo aprobar el desbloqueo.', 'error');
        }
      }
    );
  };

  const handleRechazarDesbloqueo = (fecha: string, sede: Sede) => {
    triggerConfirm(
      'Rechazar Desbloqueo',
      `¿Estás seguro de que deseas rechazar la solicitud de desbloqueo para la Sede: ${sede} con Fecha: ${fecha}?`,
      () => {
        const success = rechazarDesbloqueoCierre(fecha, sede, currentUser.nombre);
        if (success) {
          triggerAlert('Solicitud Rechazada', 'Se ha rechazado la solicitud de desbloqueo.', 'info');
          setCierresCajaList(getCierresCaja());
          onRefreshData();
        } else {
          triggerAlert('Error', 'No se pudo rechazar la solicitud.', 'error');
        }
      }
    );
  };

  const handleGuardarCorreccionDirecta = (fecha: string, sede: Sede, nombreCajera: string) => {
    const valor = parseFloat(nuevoValorCierre.replace(/[^0-9.-]+/g, ''));
    if (isNaN(valor) || valor < 0) {
      triggerAlert('Valor Inválido', 'Por favor ingresa un valor numérico válido mayor o igual a cero.', 'error');
      return;
    }

    triggerConfirm(
      'Confirmar Corrección',
      `¿Confirmas corregir el valor declarado del cierre para la Sede: ${sede} el ${fecha} a $${valor.toLocaleString('es-CO')}?`,
      () => {
        registrarCierreCaja(fecha, sede, nombreCajera, valor);
        addAuditLog(currentUser.nombre, 'Corrección Directa de Cierre', `Sede: ${sede}, Fecha: ${fecha}, Nuevo valor: $${valor.toLocaleString('es-CO')}`);
        triggerAlert('Cierre Corregido', 'El valor del cierre de caja ha sido corregido con éxito.', 'success');
        setEditingCierreId(null);
        setNuevoValorCierre('');
        setCierresCajaList(getCierresCaja());
        onRefreshData();
      }
    );
  };

  const handleDesbloquearDirectamente = (fecha: string, sede: Sede) => {
    triggerConfirm(
      'Desbloquear Cierre de Caja',
      `¿Confirmas desbloquear directamente y borrar el registro de cierre para la Sede: ${sede} con Fecha: ${fecha}?`,
      () => {
        const success = aprobarDesbloqueoCierre(fecha, sede, currentUser.nombre);
        if (success) {
          triggerAlert('Desbloqueado Directamente', 'El cierre de caja ha sido eliminado y desbloqueado con éxito.', 'success');
          setCierresCajaList(getCierresCaja());
          onRefreshData();
        } else {
          triggerAlert('Error', 'No se pudo desbloquear la caja.', 'error');
        }
      }
    );
  };

  return (
    <div id="admin-module" className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      
      {/* Title */}
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-3xl font-black text-[#1A2D7C] italic uppercase font-space tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-[#1A2D7C] stroke-[2.5]" />
          CONSOLA DEL <span className="text-slate-350">/ ADMINISTRADOR</span>
        </h2>
        <p className="text-xs uppercase font-bold tracking-wider text-[#F47920] mt-1.5 font-mono">
          CONFIGURACIÓN ESTRICTA DE ROLES, AUDITORÍA OPERATIVA Y HISTÓRICOS
        </p>
      </div>

      {/* Sub menu selector */}
      <div className="flex flex-wrap border-2 border-slate-900 overflow-hidden rounded bg-slate-50 font-space text-[10px] uppercase tracking-wider font-black">
        {currentUser.role === 'Admin' && (
          <button
            id="btn-subtab-roles"
            onClick={() => setActiveSubTab('roles')}
            className={`flex-1 min-w-[120px] text-center px-4 py-3 transition-colors ${
              activeSubTab === 'roles' 
                ? 'bg-[#1A2D7C] text-white' 
                : 'text-slate-700 hover:bg-slate-150'
            }`}
          >
            Gestión de Roles
          </button>
        )}

        <button
          id="btn-subtab-revert"
          onClick={() => setActiveSubTab('reversiones')}
          className={`flex-1 min-w-[120px] text-center px-4 py-3 ${currentUser.role === 'Admin' ? 'border-l border-slate-900' : ''} transition-colors ${
            activeSubTab === 'reversiones' 
              ? 'bg-[#1A2D7C] text-white' 
              : 'text-slate-700 hover:bg-slate-150'
          }`}
        >
          Reversión ({identifiedTxs.length})
        </button>

        <button
          id="btn-subtab-desbloqueos"
          onClick={() => setActiveSubTab('desbloqueos')}
          className="flex-1 min-w-[120px] text-center px-4 py-3 border-l border-slate-900 transition-colors flex items-center justify-center gap-1 text-slate-700 hover:bg-slate-150"
          style={{
            backgroundColor: activeSubTab === 'desbloqueos' ? '#1A2D7C' : '',
            color: activeSubTab === 'desbloqueos' ? 'white' : ''
          }}
        >
          <span>Desbloqueos de Caja</span>
          {cierresCajaList.filter(c => c.solicitaDesbloqueo).length > 0 && (
            <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full text-[9px] font-black animate-pulse">
              {cierresCajaList.filter(c => c.solicitaDesbloqueo).length}
            </span>
          )}
        </button>

        <button
          id="btn-subtab-cleanup"
          onClick={() => setActiveSubTab('limpieza')}
          className={`flex-1 min-w-[120px] text-center px-4 py-3 border-l border-slate-900 transition-colors ${
            activeSubTab === 'limpieza' 
              ? 'bg-[#1A2D7C] text-white' 
              : 'text-slate-700 hover:bg-slate-150'
          }`}
        >
          Limpieza / Cierre
        </button>

        {currentUser.role === 'Admin' && (
          <button
            id="btn-subtab-logs"
            onClick={() => setActiveSubTab('logs')}
            className={`flex-1 min-w-[120px] text-center px-4 py-3 border-l border-slate-900 transition-colors ${
              activeSubTab === 'logs' 
                ? 'bg-[#1A2D7C] text-white' 
                : 'text-slate-700 hover:bg-slate-150'
            }`}
          >
            Logs Auditoría
          </button>
        )}
      </div>

      {/* Sub Views */}
      
      {/* 1. GESTION DE ROLES */}
      {activeSubTab === 'roles' && (
        <div id="subview-roles" className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm">Auxiliares y Permisos Activos</h3>
                {isSavingUser && (
                  <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full animate-pulse shadow-sm">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                    </span>
                    Guardando Cambios en la Nube...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                La tabla muestra los perfiles autorizados que tienen acceso al sistema con roles delimitados.
              </p>
            </div>
            <button
              id="btn-show-add-user"
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-[#1A2D7C] hover:bg-[#1A2D7C]/95 text-white py-1.5 px-3.5 rounded text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              Nuevo Colaborador
            </button>
          </div>

          {/* Admin Own security profile 2FA change action */}
          <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/10 rounded-lg text-[#F47920]">
                <Lock className="h-5.5 w-5.5" />
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-tight text-white mb-0.5">Seguridad de la Cuenta de Administrador</h4>
                <p className="text-[11px] text-slate-300">
                  La protección de tu acceso cuenta con seguridad obligatoria de Doble Factor (2FA). Actualiza tu clave de forma segura.
                </p>
              </div>
            </div>
            <button
              id="btn-trigger-admin-2fa-change"
              onClick={handleOpenAdminPswChange}
              className="bg-[#F47920] hover:bg-[#F47920]/90 text-white text-[11px] font-black uppercase tracking-wider px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Cambiar mi Contraseña (2FA)
            </button>
          </div>

          {/* Add User Modal-Form */}
          {showAddForm && (
            <form onSubmit={handleAddUser} className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-slide-down space-y-4">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-widest border-b pb-1.5 border-slate-200">
                Registrar Nuevo Colaborador Corporativo
              </h4>
              <div className="grid sm:grid-cols-5 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Nombre Completo</label>
                  <input
                    id="input-new-user-name"
                    type="text"
                    required
                    placeholder="Ej: Laura Tobón"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded p-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Correo Electrónico <span className="text-[#1A2D7C] font-black">*</span>
                  </label>
                  <input
                    id="input-new-user-email"
                    type="email"
                    required
                    placeholder="ejemplo@degrescolombia.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded p-2 bg-white focus:ring-1 focus:ring-[#1A2D7C]"
                  />
                  <span className="text-[9px] text-[#1A2D7C] font-bold mt-1 block uppercase tracking-wider">
                    Solo dominio @degrescolombia.com
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Rol Designado</label>
                  <select
                    id="select-new-user-role"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="w-full text-xs border border-slate-200 rounded p-2 bg-white"
                  >
                    <option value="Cajera">Cajera (Filtro por Sede)</option>
                    <option value="Tesorera">Tesorera (Carga de extractos)</option>
                    <option value="Admin">Administrador (Control total)</option>
                    <option value="Asesor">Asesor Comercial (Reportes)</option>
                  </select>
                </div>

                <div>
                  {newRole === 'Cajera' ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Sede de Caja</label>
                      <select
                        id="select-new-user-sede"
                        value={newSede}
                        onChange={(e) => setNewSede(e.target.value as Sede)}
                        className="w-full text-xs border border-slate-200 rounded p-2 bg-white"
                      >
                        <option value="Guayabal">Guayabal (***6519)</option>
                        <option value="Sabaneta">Sabaneta (***0916)</option>
                        <option value="Naranjal">Naranjal (***6807)</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">Sede de Caja</label>
                      <div className="text-slate-400 text-xs py-2 bg-slate-100 rounded border border-transparent text-center italic font-medium">No aplica Sede</div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Contraseña de Acceso</label>
                  <input
                    id="input-new-user-password"
                    type="text"
                    placeholder="Defecto: Degres123"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded p-2 bg-white"
                  />
                  <span className="text-[9px] text-slate-400 block mt-1">
                    Clave inicial asignada
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3 border-slate-200">
                <button
                  id="btn-cancel-new-user"
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-1.5 px-4 rounded text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-new-user"
                  type="submit"
                  className="bg-[#F47920] hover:bg-[#F47920]/90 text-white py-1.5 px-4 rounded text-xs font-bold shadow-sm transition-all"
                >
                  Registrar Colaborador
                </button>
              </div>
            </form>
          )}
          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[9px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Colaborador / Email</th>
                    <th className="p-3.5">Rol / Sucursal</th>
                    <th className="p-3.5">Contraseña de Acceso</th>
                    <th className="p-3.5 text-right">Acciones de cuenta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userList.map((usr) => {
                    const isEditing = editingUserId === usr.id;
                    const isVisible = visiblePasswords[usr.id];
                    return (
                      <tr key={usr.id} id={`user-row-${usr.id}`} className={`hover:bg-slate-50 transition-colors ${usr.isBlocked ? 'bg-rose-50/40 text-slate-400' : ''}`}>
                        {isEditing ? (
                          <>
                            {/* EDICIÓN DE VALORES */}
                            <td className="p-3.5 space-y-1.5 min-w-[200px]">
                              <div>
                                <label className="block text-[9px] uppercase font-bold text-slate-400">Nombre</label>
                                <input
                                  id={`edit-usr-name-${usr.id}`}
                                  type="text"
                                  value={editNombre}
                                  onChange={(e) => setEditNombre(e.target.value)}
                                  className="border border-slate-350 rounded px-2 py-1 text-xs bg-white text-slate-850 w-full focus:ring-1 focus:ring-[#1A2D7C]"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] uppercase font-bold text-slate-400">Correo @degrescolombia.com</label>
                                <input
                                  id={`edit-usr-email-${usr.id}`}
                                  type="email"
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  className="border border-slate-350 rounded px-2 py-1 text-xs bg-white text-slate-850 w-full focus:ring-1 focus:ring-[#1A2D7C]"
                                />
                              </div>
                            </td>

                            <td className="p-3.5 space-y-1.5 min-w-[150px]">
                              <div>
                                <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Rol</label>
                                <select
                                  id={`edit-usr-role-${usr.id}`}
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value as Role)}
                                  className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-800 w-full focus:border-[#1A2D7C]"
                                >
                                  <option value="Admin">Admin</option>
                                  <option value="Tesorera">Tesorera</option>
                                  <option value="Cajera">Cajera</option>
                                  <option value="Asesor">Asesor</option>
                                </select>
                              </div>

                              <div>
                                {editRole === 'Cajera' ? (
                                  <>
                                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Sede</label>
                                    <select
                                      id={`edit-usr-sede-${usr.id}`}
                                      value={editSede}
                                      onChange={(e) => setEditSede(e.target.value as Sede)}
                                      className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-800 w-full focus:border-[#1A2D7C]"
                                    >
                                      <option value="Guayabal">Guayabal (***6519)</option>
                                      <option value="Sabaneta">Sabaneta (***0916)</option>
                                      <option value="Naranjal">Naranjal (***6807)</option>
                                    </select>
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">Acceso Global</span>
                                )}
                              </div>
                            </td>

                            <td className="p-3.5">
                              {editRole !== 'Admin' ? (
                                <div>
                                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Asignar Contraseña</label>
                                  <input
                                    id={`edit-usr-password-${usr.id}`}
                                    type="text"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    placeholder="Clave para este colaborador"
                                    className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-800 w-full focus:border-[#1A2D7C]"
                                  />
                                </div>
                              ) : (
                                <div className="text-slate-500 font-mono text-[10px] bg-slate-100 p-2 rounded border border-slate-200">
                                  🔒 Protegida corporativamente (Cambio por 2FA)
                                </div>
                              )}
                            </td>

                            <td className="p-3.5 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  id={`btn-cancel-edit-usr-${usr.id}`}
                                  onClick={() => setEditingUserId(null)}
                                  className="px-2.5 py-1.5 border border-slate-300 text-slate-500 rounded text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  id={`btn-save-edit-usr-${usr.id}`}
                                  onClick={handleSaveEdit}
                                  className="px-3 py-1.5 bg-[#F47920] hover:bg-[#F47920]/90 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                                >
                                  Guardar
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* VISTA ESTÁNDAR CON CONTROL COMPLETO */}
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <div className={`font-semibold ${usr.isBlocked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                  {usr.nombre}
                                </div>
                                {usr.isBlocked && (
                                  <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Bloqueado
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{usr.email}</div>
                            </td>

                            <td className="p-3.5 space-y-1">
                              <div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  usr.role === 'Admin' ? 'bg-orange-100 text-orange-850' :
                                  usr.role === 'Tesorera' ? 'bg-blue-100 text-blue-805' :
                                  usr.role === 'Cajera' ? 'bg-indigo-100 text-indigo-805' :
                                  'bg-slate-150 text-slate-700'
                                }`}>
                                  {usr.role}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {usr.role === 'Cajera' ? (
                                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#F47920]"></span>
                                    Sede {usr.sede}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Acceso Global</span>
                                )}
                              </div>
                            </td>

                            <td className="p-3.5">
                              {usr.role !== 'Admin' ? (
                                <div className="flex items-center gap-2 font-mono">
                                  <span className="text-xs font-semibold text-slate-750">
                                    {isVisible ? (usr.password || 'Sin clave') : '••••••••'}
                                  </span>
                                  <button
                                    id={`btn-toggle-view-psw-${usr.id}`}
                                    onClick={() => setVisiblePasswords(prev => ({ ...prev, [usr.id]: !prev[usr.id] }))}
                                    className="p-1 text-slate-400 hover:text-[#1A2D7C] hover:bg-slate-100 rounded transition-all cursor-pointer"
                                    title={isVisible ? "Ocultar Contraseña" : "Mostrar Contraseña"}
                                  >
                                    {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px]">
                                  <Lock className="h-3 w-3 text-[#F47920]" />
                                  <span>Protegida (Control 2FA)</span>
                                </div>
                              )}
                            </td>

                            <td className="p-3.5">
                              <div className="flex gap-2 justify-end">
                                {/* Botón Editar */}
                                <button
                                  id={`btn-edit-usr-${usr.id}`}
                                  onClick={() => handleStartEdit(usr)}
                                  className="p-1 px-2.5 rounded text-blue-700 hover:bg-blue-50 hover:text-blue-900 border border-transparent hover:border-blue-200 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                  title="Editar nombre, correo, rol o sede"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  Editar / Clave
                                </button>

                                {/* Botón Deshabilitar/Habilitar */}
                                {usr.id !== currentUser.id ? (
                                  <button
                                    id={`btn-block-usr-${usr.id}`}
                                    onClick={() => handleToggleBlockUser(usr.id)}
                                    className={`p-1 px-2.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all border border-transparent cursor-pointer ${
                                      usr.isBlocked 
                                        ? 'text-emerald-700 hover:bg-emerald-50 hover:border-emerald-250'
                                        : 'text-rose-650 hover:bg-rose-50 hover:border-rose-150'
                                    }`}
                                    title={usr.isBlocked ? "Habilitar acceso" : "Deshabilitar acceso temporal"}
                                  >
                                    <Ban className="h-3 w-3" />
                                    {usr.isBlocked ? 'Habilitar' : 'Bloquear'}
                                  </button>
                                ) : null}

                                {/* Botón Eliminar */}
                                {usr.id !== currentUser.id ? (
                                  <button
                                    id={`btn-delete-usr-${usr.id}`}
                                    onClick={() => handleDeleteUser(usr.id)}
                                    className="p-1 px-2 rounded text-red-600 hover:bg-red-50 hover:text-red-900 hover:border-red-200 border border-transparent transition-all cursor-pointer"
                                    title="Eliminar permanentemente del sistema"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. REVERSION DE IDENTIFICACIONES */}
      {activeSubTab === 'reversiones' && (
        <div id="subview-revert" className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm">Corrección Manual de Transacciones</h3>
            <p className="text-xs text-slate-500 mt-1">
              ¿Una cajera relacionó erróneamente un pago con otro asesor o documento? Filtra aquí los pagos identificados para liberarlos y enviarlos de nuevo a la sucursal de validación.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {identifiedTxs.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <Undo2 className="h-10 w-10 text-slate-300 mx-auto mb-3 animate-pulse" />
                <p className="text-xs font-bold text-slate-700">No hay pagos validados este mes para revertir</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Las conciliaciones están al día. Ninguna transacción se encuentra marcada aún por parte de las cajeras.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[9px] border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Sede / Cuenta</th>
                      <th className="p-3.5">Concepto Original</th>
                      <th className="p-3.5">Asociaciones hechas</th>
                      <th className="p-3.5 text-right">Valor COP</th>
                      <th className="p-3.5 text-center">Acciones administrativas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {identifiedTxs.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-3.5">
                          <span className="font-bold text-slate-800">{tx.sede}</span>
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Cta: {tx.cuenta}</span>
                        </td>
                        <td className="p-3.5 max-w-[200px] truncate" title={tx.descripcion}>
                          <p className="font-medium text-slate-700">{tx.descripcion}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Llave: {tx.llaveUnica.slice(0, 18)}...</p>
                        </td>
                        <td className="p-3.5 bg-slate-50/50">
                          <div>
                            Doc: <span className="font-bold text-slate-800">{tx.tipoDocumento}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Asesor: <span className="font-semibold">{tx.asesor || 'No especificado'}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 mt-1">
                            Por: {tx.usuarioIdentificacion} el {tx.fechaIdentificacion?.slice(5, 16)}
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-600 font-mono text-sm">
                          {formatCOP(tx.valor)}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            id={`btn-admin-revert-action-${tx.id}`}
                            onClick={() => handleRevert(tx.id)}
                            className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 py-1.5 px-3.5 rounded text-xs font-bold inline-flex items-center gap-1 transition-colors"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            Revertir Validación
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. LIMPIEZA MENSUAL / CIERRE */}
      {activeSubTab === 'limpieza' && (
        <div className="space-y-6">
          <div id="subview-cleanup" className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-bold text-slate-900 text-base">Cierre y Limpieza del Mes</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Cada mes fiscal, para evitar congestiones y que las cajeras vean listados interminables del mes anterior, se debe ejecutar un proceso de archivo histórico.
              </p>
              <p className="text-xs text-amber-700 leading-relaxed bg-amber-50 rounded-lg p-3 border border-amber-100">
                <strong>¿Cómo funciona el resguardo?</strong> Antes de limpiar el mes y marcar las transacciones vigentes como archivadas/históricas, el sistema compilará y <strong>descargará automáticamente su base de datos completa como un archivo Excel editable (.xlsx)</strong> que contiene cada llave única. De esta forma, si se requiere conciliar reclamaciones futuras del mes clausurado, ese Excel se conserva como resguardo oficial y se puede re-utilizar sin duplicar movimientos actuales!
              </p>
            </div>

            <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center gap-4">
              <button
                id="btn-trigger-cleanup"
                onClick={handleMonthlyArchive}
                className="w-full sm:w-auto bg-[#1A2D7C] hover:bg-[#1A2D7C]/95 text-white py-3 px-6 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <Download className="h-4.5 w-4.5" />
                Ejecutar Cierre y Exportar Histórico Excel
              </button>
              <div className="text-[10px] text-slate-400 font-semibold italic">
                * Se generará un backup seguro e inalterable.
              </div>
            </div>
          </div>

          {/* DANGER ZONE - BORRAR TODO */}
          <div id="subview-danger-zone" className="bg-rose-50/50 p-8 rounded-xl border-2 border-dashed border-rose-200 shadow-sm space-y-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-rose-700 mb-2">
                <Trash2 className="h-5.5 w-5.5 text-rose-600 stroke-[2.5]" />
                <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-tight font-space">Zona de Peligro Administrativa: Borrado Total</h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed mb-4">
                Si deseas reiniciar por completo el sistema eliminando toda la base de datos de movimientos conciliados, movimientos cargados y el historial de cierres de caja (limpiando todos los lotes de Excel subidos), puedes realizar esta acción a continuación.
              </p>
              <p className="text-xs text-rose-800 leading-relaxed bg-rose-50 rounded-lg p-3 border border-rose-100 font-medium">
                <strong>¿Qué se borrará permanentemente?</strong> Se vaciará por completo la tabla de transferencias bancarias, todos los lotes de Excel subidos y las declaraciones de cierres de caja de todas las sedes. No afectará a las cuentas de usuario de tus colaboradores para que puedan continuar con su sesión.
              </p>
            </div>

            <div className="border-t border-rose-200/60 pt-6 flex flex-col sm:flex-row items-center gap-4">
              <button
                id="btn-trigger-full-wipe"
                onClick={handleClearAll}
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white py-3 px-6 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer uppercase tracking-wider font-space"
              >
                <Trash2 className="h-4.5 w-4.5" />
                Borrar toda la información y Exceles subidos
              </button>
              <div className="text-[10px] text-rose-600 font-semibold italic">
                * Requiere doble confirmación de seguridad.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. GESTIÓN DE DESBLOQUEOS Y CORRECCIÓN DE CIERRES */}
      {activeSubTab === 'desbloqueos' && (
        <div id="subview-desbloqueos" className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base font-space uppercase">Desbloqueo y Corrección de Cierres de Caja</h3>
              <p className="text-xs text-slate-500 mt-1">
                Administra las solicitudes de rectificación enviadas por las cajeras, o modifica directamente los saldos declarados en caso de error.
              </p>
            </div>
            <span className="bg-[#1A2D7C]/10 text-[#1A2D7C] text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg font-space border border-[#1A2D7C]/10">
              Total Cierres: {cierresCajaList.length}
            </span>
          </div>

          {/* SOLICITUDES PENDIENTES */}
          <div className="bg-white rounded-xl border-2 border-amber-450 overflow-hidden shadow-sm">
            <div className="bg-amber-50 px-5 py-4 border-b border-amber-200 flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              <h4 className="font-bold text-xs uppercase tracking-wider">Solicitudes de Desbloqueo Pendientes ({cierresCajaList.filter(c => c.solicitaDesbloqueo).length})</h4>
            </div>

            <div className="p-4">
              {cierresCajaList.filter(c => c.solicitaDesbloqueo).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-semibold italic">
                  No hay solicitudes de desbloqueo pendientes de revisión en este momento.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {cierresCajaList.filter(c => c.solicitaDesbloqueo).map(cierre => (
                    <div key={cierre.id} className="p-4 bg-amber-50/40 rounded-xl border border-amber-200 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                            {cierre.sede}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-700">
                            {formatDateHuman(cierre.fecha)}
                          </span>
                        </div>
                        <div className="mt-2.5">
                          <p className="text-xs font-medium text-slate-500">Cajera:</p>
                          <p className="text-xs font-black text-slate-900">{cierre.nombreCajera}</p>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs font-medium text-slate-500">Valor Declarado:</p>
                          <p className="text-sm font-black text-slate-900">{formatCOP(cierre.totalDeclarado)}</p>
                        </div>
                        <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200/60">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Motivo de Desbloqueo Justificado:</p>
                          <p className="text-xs text-slate-700 italic mt-1 leading-relaxed">"{cierre.motivoDesbloqueo || 'No proporcionado.'}"</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-2 border-t border-amber-200/40">
                        <button
                          onClick={() => handleAprobarDesbloqueo(cierre.fecha, cierre.sede)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Aprobar Desbloqueo
                        </button>
                        <button
                          onClick={() => handleRechazarDesbloqueo(cierre.fecha, cierre.sede)}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* HISTORIAL GENERAL Y CORRECCIÓN DIRECTA */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 font-space">
                Historial General de Cierres de Caja y Corrección Directa
              </h4>
              <span className="text-[9px] font-bold text-slate-400 uppercase italic">
                * Haz clic en "Corregir Saldo" para editar el valor reportado directamente.
              </span>
            </div>

            <div className="overflow-x-auto">
              {cierresCajaList.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 italic">
                  Aún no se han registrado cierres de caja en el sistema.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-space text-[10px] uppercase tracking-wider text-slate-500 font-black">
                      <th className="p-4">Sede</th>
                      <th className="p-4">Fecha de Cierre</th>
                      <th className="p-4">Cajera Responsable</th>
                      <th className="p-4 text-right">Valor Reportado</th>
                      <th className="p-4">Creado el</th>
                      <th className="p-4 text-center">Estado</th>
                      <th className="p-4 text-right">Acciones Administrativas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {cierresCajaList.map(cierre => {
                      const isEditing = editingCierreId === cierre.id;
                      return (
                        <tr key={cierre.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-black text-slate-900">{cierre.sede}</td>
                          <td className="p-4 font-mono font-semibold">{cierre.fecha}</td>
                          <td className="p-4 font-semibold text-slate-800">{cierre.nombreCajera}</td>
                          <td className="p-4 text-right font-mono font-black text-slate-900">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-slate-450">$</span>
                                <input
                                  type="text"
                                  value={nuevoValorCierre}
                                  onChange={(e) => setNuevoValorCierre(e.target.value)}
                                  placeholder="Ej: 500,000"
                                  className="w-28 p-1 text-xs text-right border-2 border-[#1A2D7C] rounded font-black focus:outline-none focus:ring-1 focus:ring-[#1A2D7C]"
                                />
                              </div>
                            ) : (
                              formatCOP(cierre.totalDeclarado)
                            )}
                          </td>
                          <td className="p-4 text-slate-400 text-[10px] font-mono">{cierre.fechaCreacion || 'N/A'}</td>
                          <td className="p-4 text-center">
                            {cierre.solicitaDesbloqueo ? (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse">
                                Solicitud Pendiente
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                                Consolidado
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleGuardarCorreccionDirecta(cierre.fecha, cierre.sede, cierre.nombreCajera)}
                                  className="bg-[#1A2D7C] hover:bg-[#1A2D7C]/90 text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Check className="h-3 w-3" />
                                  Guardar
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCierreId(null);
                                    setNuevoValorCierre('');
                                  }}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingCierreId(cierre.id);
                                    setNuevoValorCierre(cierre.totalDeclarado.toString());
                                  }}
                                  className="text-[#1A2D7C] hover:text-[#1A2D7C]/80 font-black uppercase text-[10px] tracking-wider border border-[#1A2D7C]/20 hover:border-[#1A2D7C] px-2 py-1 rounded transition-all cursor-pointer"
                                >
                                  Corregir Saldo
                                </button>
                                <button
                                  onClick={() => handleDesbloquearDirectamente(cierre.fecha, cierre.sede)}
                                  className="text-rose-600 hover:text-rose-700 font-black uppercase text-[10px] tracking-wider border border-rose-200 hover:border-rose-300 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-0.5"
                                >
                                  <Unlock className="h-3 w-3" />
                                  Desbloquear
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. LOGS DE AUDITORIA */}
      {activeSubTab === 'logs' && (
        <div id="subview-logs" className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Historial de Auditoría de Sistemas</h3>
              <p className="text-xs text-slate-500 mt-1">
                Logs de seguridad de Firestore relativos a cargas de archivos, inicio de sesión y validaciones de cajas físicas.
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Historial Reciente</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden font-mono text-[11px] leading-relaxed">
            <div className="max-h-[380px] overflow-y-auto">
              <div className="bg-slate-900 text-slate-300 p-4 divide-y divide-slate-800">
                {getAuditLogs().map((log) => (
                  <div key={log.id} className="py-2 flex flex-col md:flex-row md:items-start gap-2.5">
                    <span className="text-slate-500 font-bold flex-shrink-0">[{log.timestamp}]</span>
                    <span className="text-indigo-400 font-bold flex-shrink-0 truncate w-[130px]">{log.usuario}</span>
                    <span className="text-amber-500 font-semibold flex-shrink-0 w-[140px]">{log.accion} —</span>
                    <span className="text-slate-200 flex-1">{log.detalles}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DOBLE FACTOR (2FA) PARA CAMBIO DE CONTRASEÑA ADMIN */}
      {showAdminPswModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-scale-up">
            <div className="bg-slate-950 p-6 text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#F47920] to-[#e06612] rounded-lg">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight text-white">Autenticación de Clave</h3>
                <p className="text-[10px] text-slate-400">Verificación de Doble Factor Obligatoria (2FA)</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {adminPswError && (
                <div className="bg-rose-50 text-rose-800 text-xs p-3 rounded-lg flex items-start gap-2 border border-rose-100">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-700 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">{adminPswError}</span>
                </div>
              )}

              {adminPswSuccess && (
                <div className="bg-emerald-50 text-emerald-800 text-xs p-3.5 rounded-lg flex items-center gap-2 border border-emerald-100">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="font-black leading-relaxed">{adminPswSuccess}</span>
                </div>
              )}

              {/* STAGE 1: REQUEST 2FA */}
              {adminPsw2FAStage === 'request' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-650 leading-relaxed text-center">
                    Para resguardar el control maestro del sistema Degres, el cambio de contraseña del Administrador requiere la emisión de un código de verificación de 6 dígitos que se te simulará enviar.
                  </p>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">CORREO REGISTRADO</span>
                    <span className="block text-xs font-mono font-bold text-slate-750 text-center mt-1 select-all">{currentUser.email}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      id="btn-admin-2fa-cancel"
                      type="button"
                      onClick={() => setShowAdminPswModal(false)}
                      className="flex-1 py-2 px-4 rounded text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                    <button
                      id="btn-admin-2fa-send"
                      type="button"
                      onClick={handleSend2FACode}
                      className="flex-1 py-2 px-4 rounded text-xs font-bold text-white bg-[#F47920] hover:bg-[#F47920]/95 transition-all shadow-sm cursor-pointer text-center"
                    >
                      Solicitar Clave 2FA
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 2: VERIFY 2FA */}
              {adminPsw2FAStage === 'verify' && (
                <div className="space-y-4">
                  {/* EMULATION BANNER */}
                  <div className="bg-neutral-900 text-slate-100 p-4 rounded-xl border border-neutral-950 space-y-2.5 font-mono text-[10px] shadow-inner select-none">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[9px] text-[#F47920] font-black uppercase tracking-widest">
                      <span>📧 [SIMULANTE DE SERVIDOR DE CORREOS]</span>
                      <span className="bg-rose-900/50 text-rose-300 px-1.5 py-0.2 rounded font-sans text-[8px] animate-pulse">PRUEBAS</span>
                    </div>
                    <div>
                      <span className="text-slate-450">De:</span> seguridad@degrescolombia.com
                    </div>
                    <div>
                      <span className="text-slate-450">Para:</span> {currentUser.email}
                    </div>
                    <div>
                      <span className="text-slate-450">Asunto:</span> Código de Verificación 2FA - Cambio Contraseña admin
                    </div>
                    <div className="border-t border-white/5 pt-2 text-slate-300 leading-normal bg-neutral-950/80 p-2.5 rounded text-xs text-center">
                      Tu código verificador temporal de un solo uso es:
                      <div className="text-base font-black tracking-widest text-[#F47920] my-1 bg-neutral-900 py-1.5 rounded border border-neutral-800">
                        {adminPsw2FACode}
                      </div>
                      <span className="text-[9px] text-slate-500 block leading-tight">Por seguridad, no compartas este código con colaboradores.</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="block text-[10px] font-bold text-slate-600">Ingrese el código verificador:</label>
                    <input
                      id="input-2fa-verify-code"
                      type="text"
                      maxLength={6}
                      placeholder="------"
                      value={adminPswInputCode}
                      onChange={(e) => setAdminPswInputCode(e.target.value)}
                      className="w-full text-center tracking-widest font-mono text-lg font-black border border-slate-300 rounded p-2 focus:ring-2 focus:ring-[#1A2D7C]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      id="btn-admin-2fa-verify-back"
                      type="button"
                      onClick={() => setAdminPsw2FAStage('request')}
                      className="flex-1 py-1.5 px-3 rounded text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer text-center"
                    >
                      Atrás
                    </button>
                    <button
                      id="btn-admin-2fa-verify-submit"
                      type="button"
                      onClick={handleVerify2FACode}
                      className="flex-1 py-1.5 px-3 rounded text-xs font-bold text-white bg-[#1A2D7C] hover:bg-[#1A2D7C]/95 transition-all shadow-sm cursor-pointer text-center"
                    >
                      Verificar Código
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 3: NEW PASSWORD LAYOUT */}
              {adminPsw2FAStage === 'new-password' && !adminPswSuccess && (
                <div className="space-y-4 animate-slide-down">
                  <div className="bg-amber-50/80 p-3 rounded-lg border border-amber-200 text-[11px] text-amber-800 leading-normal flex gap-1.5">
                    <Lock className="h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-700" />
                    <span><strong>Acceso Autorizado.</strong> Ingrese y confirme la nueva clave del Administrador corporativo.</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-600">Nueva Contraseña:</label>
                    <input
                      id="input-admin-new-password"
                      type="password"
                      required
                      placeholder="Nueva contraseña de acceso"
                      value={adminNewPsw}
                      onChange={(e) => setAdminNewPsw(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-600">Confirmar Nueva Contraseña:</label>
                    <input
                      id="input-admin-new-password-confirm"
                      type="password"
                      required
                      placeholder="Re-ingrese nueva contraseña"
                      value={adminNewPswConfirm}
                      onChange={(e) => setAdminNewPswConfirm(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-slate-900 bg-white"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      id="btn-admin-verify-cancel-all"
                      type="button"
                      onClick={() => setShowAdminPswModal(false)}
                      className="flex-1 py-2 px-3 border border-slate-250 rounded text-xs font-bold text-slate-650 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                    <button
                      id="btn-admin-verify-save"
                      type="button"
                      onClick={handleSaveAdminPsw}
                      className="flex-1 py-2 px-3 rounded text-xs font-bold text-white bg-[#F47920] hover:bg-[#F47920]/95 transition-all shadow-sm cursor-pointer text-center"
                    >
                      Guardar Contraseña
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM DIALOGS FOR EXCELLENT IFRAME COMPATIBILITY --- */}
      {/* 1. Custom Confirmation Dialog */}
      {customConfirm && (
        <div id="custom-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-6">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${customConfirm.type === 'danger' ? 'text-rose-600' : 'text-amber-500'}`} />
                {customConfirm.title}
              </h3>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {customConfirm.message}
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex gap-3 justify-end border-t border-slate-100">
              <button
                id="btn-custom-confirm-cancel"
                onClick={() => setCustomConfirm(null)}
                className="px-4 py-2 bg-white border border-slate-250 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-custom-confirm-submit"
                onClick={() => {
                  const currentConfirm = customConfirm;
                  setCustomConfirm(null);
                  currentConfirm.onConfirm();
                }}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  customConfirm.type === 'danger' 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : customConfirm.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-[#1A2D7C] hover:bg-[#1A2D7C]/95'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Custom Alert Dialog */}
      {customAlert && (
        <div id="custom-alert-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-scale-up">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 bg-slate-50">
                {customAlert.type === 'success' ? (
                  <Check className="h-6 w-6 text-emerald-600" />
                ) : customAlert.type === 'error' ? (
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                {customAlert.title || 'Aviso del Sistema'}
              </h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed whitespace-pre-line">
                {customAlert.message}
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 text-center">
              <button
                id="btn-custom-alert-close"
                onClick={() => setCustomAlert(null)}
                className="w-full py-2 bg-[#1A2D7C] hover:bg-[#1A2D7C]/95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
