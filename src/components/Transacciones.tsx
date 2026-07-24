import React, { useState, useEffect } from 'react';
import { 
  getTransactions, 
  identifyTransaction, 
  revertIdentification, 
  getAdvisors, 
  getCierresCaja, 
  registrarCierreCaja,
  solicitarDesbloqueoCierre,
  aprobarDesbloqueoCierre,
  rechazarDesbloqueoCierre,
  subscribeToDatabase,
  requestTransactionChange,
  resolveTransactionChange
} from '../firebase';
import { formatCOP, formatDateHuman, getColombiaDateTime, formatDateTime12h } from '../utils/formato';
import { Transaction, User, Sede, CierreCaja } from '../types';
import { 
  FileCheck2, 
  Search, 
  Check, 
  Lock, 
  Undo2, 
  UserSquare, 
  Receipt, 
  HelpCircle,
  Building2,
  ListFilter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Unlock,
  Send,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface TransaccionesProps {
  currentUser: User;
  transactions: Transaction[];
  onRefreshData: () => void;
}

export default function Transacciones({ currentUser, transactions, onRefreshData }: TransaccionesProps) {
  const advisors = getAdvisors();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendientes' | 'identificadas'>('pendientes');
  
  // Set default sede filter based on Cajera's bound branch for instant task localization
  const [sedeFilter, setSedeFilter] = useState<Sede | 'Todas'>(
    currentUser.role === 'Cajera' && currentUser.sede ? currentUser.sede : 'Todas'
  );

  // New Filters states
  const [montoMinFilter, setMontoMinFilter] = useState('');
  const [montoMaxFilter, setMontoMaxFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [cuentaFilter, setCuentaFilter] = useState<string>('Todas');

  // Editing state for validation inline submission
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [docType, setDocType] = useState<'Recibo' | 'Remisión' | 'Ignorado'>('Remisión');
  const [justificacion, setJustificacion] = useState('');
  const [nroReciboCaja, setNroReciboCaja] = useState('');

  // States for cashier requesting change/unlock
  const [requestChangeTxId, setRequestChangeTxId] = useState<string | null>(null);
  const [requestChangeReason, setRequestChangeReason] = useState<string>('');

  // States for admin correcting a transaction
  const [adminCorrectingTxId, setAdminCorrectingTxId] = useState<string | null>(null);
  const [adminSelectedAdvisor, setAdminSelectedAdvisor] = useState<string>('');
  const [adminDocType, setAdminDocType] = useState<'Recibo' | 'Remisión' | 'Ignorado'>('Remisión');
  const [adminJustificacion, setAdminJustificacion] = useState<string>('');

  // Cierre de caja state
  const [cierreFecha, setCierreFecha] = useState('');
  const [cierreSede, setCierreSede] = useState<Sede>(
    currentUser.role === 'Cajera' && currentUser.sede ? currentUser.sede : 'Guayabal'
  );
  const [valorCierre, setValorCierre] = useState('');
  const [motivoDesbloqueoLocal, setMotivoDesbloqueoLocal] = useState('');
  const [mostrarFormSolicitud, setMostrarFormSolicitud] = useState(false);
  const [cierresCajaList, setCierresCajaList] = useState<CierreCaja[]>(() => getCierresCaja());
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [coincideSeleccion, setCoincideSeleccion] = useState<boolean | null>(true);
  const [motivoDiferenciaInput, setMotivoDiferenciaInput] = useState('');

  // Subscription to keep closures state synchronized with Firestore events
  useEffect(() => {
    const unsubscribe = subscribeToDatabase(() => {
      setCierresCajaList(getCierresCaja());
    });
    return () => unsubscribe();
  }, []);

  // Automatically default closing date to the most recent transaction's date to match active operations context
  useEffect(() => {
    if (transactions.length > 0 && !cierreFecha) {
      const active = transactions.filter(t => !t.esHistorico && (currentUser.role !== 'Cajera' || t.sede === currentUser.sede));
      if (active.length > 0) {
        const maxDate = active.reduce((max, t) => t.fecha > max ? t.fecha : max, active[0].fecha);
        setCierreFecha(maxDate);
      } else {
        setCierreFecha(getColombiaDateTime().dateStr);
      }
    }
  }, [transactions, currentUser.role, currentUser.sede]);

  // Synchronize input with saved closures on date/sede change or database updates
  useEffect(() => {
    if (cierreFecha && cierreSede) {
      const found = cierresCajaList.find(c => c.fecha === cierreFecha && c.sede === cierreSede);
      setValorCierre(found ? found.totalDeclarado.toString() : '');
    }
  }, [cierreFecha, cierreSede, cierresCajaList]);

  // Filter transactions
  // Exclude archived/historical transactions unless we're searching explicitly.
  const filteredTransactions = transactions.filter(tx => {
    // Hide historic records in active validation screen
    if (tx.esHistorico) return false;

    const matchesSearch = 
      tx.llaveUnica.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.valor.toString().includes(searchTerm) ||
      tx.cuenta.includes(searchTerm);

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'pendientes' && !tx.identificada) ||
      (statusFilter === 'identificadas' && tx.identificada);

    const valMin = parseFloat(montoMinFilter);
    const matchesMin = isNaN(valMin) || tx.valor >= valMin;

    const valMax = parseFloat(montoMaxFilter);
    const matchesMax = isNaN(valMax) || tx.valor <= valMax;

    const matchesFecha = !fechaFilter || tx.fecha === fechaFilter;

    const txCuentaClean = (tx.cuenta || '').toLowerCase();
    let matchesCuenta = false;
    if (cuentaFilter === 'Todas') {
      matchesCuenta = true;
    } else if (cuentaFilter === '6519') {
      matchesCuenta = txCuentaClean.includes('6519') || tx.sede === 'Guayabal';
    } else if (cuentaFilter === '0916') {
      matchesCuenta = txCuentaClean.includes('0916') || tx.sede === 'Sabaneta';
    } else if (cuentaFilter === '6807') {
      matchesCuenta = txCuentaClean.includes('6807') || tx.sede === 'Naranjal';
    } else {
      matchesCuenta = txCuentaClean.includes(cuentaFilter.toLowerCase());
    }

    const matchesSede = 
      sedeFilter === 'Todas' || 
      tx.sede === sedeFilter ||
      (cuentaFilter !== 'Todas' && matchesCuenta);

    return matchesSearch && matchesStatus && matchesSede && matchesMin && matchesMax && matchesFecha && matchesCuenta;
  });

  const handleStartIdentification = (tx: Transaction) => {
    setActiveEditingId(tx.id);
    setSelectedAdvisor('');
    setDocType('Remisión');
    setJustificacion('');
    setNroReciboCaja('');
  };

  const handleConfirmIdentification = (id: string) => {
    if (docType === 'Ignorado') {
      if (!justificacion || justificacion.trim() === '') {
        alert('Por favor proporcione o seleccione una justificación de por qué desea ignorar este pago.');
        return;
      }
      const success = identifyTransaction(id, null, 'Ignorado', currentUser.nombre, null, justificacion);
      if (success) {
        setActiveEditingId(null);
        onRefreshData();
      } else {
        alert('Hubo un error al marcar la transacción.');
      }
    } else {
      if (!selectedAdvisor || selectedAdvisor.trim() === '') {
        alert('Por favor seleccione un asesor responsable.');
        return;
      }
      const success = identifyTransaction(id, selectedAdvisor, docType, currentUser.nombre);
      if (success) {
        setActiveEditingId(null);
        onRefreshData();
      } else {
        alert('Hubo un error al marcar la transacción.');
      }
    }
  };

  const handleRevert = (id: string) => {
    if (confirm('¿Está seguro de que desea revertir la identificación de este pago? Esta acción requerida por cajeros ha sido limitada a Administradores/Tesorería.')) {
      const success = revertIdentification(id, currentUser.nombre, currentUser.role);
      if (success) {
        onRefreshData();
      }
    }
  };

  // Calculations for Cierre de Caja
  const bankPaymentsForDate = transactions.filter(
    t => t.fecha === cierreFecha && t.sede === cierreSede && !t.esHistorico
  );
  const identifiedPaymentsForDate = bankPaymentsForDate.filter(t => t.identificada);

  const numIdentificadosCierre = identifiedPaymentsForDate.length;
  const totalIdentificadoCierre = identifiedPaymentsForDate.reduce((sum, tx) => sum + tx.valor, 0);
  const totalAplicativoCierre = bankPaymentsForDate.reduce((sum, tx) => sum + tx.valor, 0);
  const diferenciaCierre = totalIdentificadoCierre - totalAplicativoCierre;

  const activeCierres = cierresCajaList;
  const currentCierre = activeCierres.find(c => c.fecha === cierreFecha && c.sede === cierreSede);
  const isAlreadyClosed = !!currentCierre;

  const handleGuardarCierre = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadyClosed) {
      alert('Este cierre de caja ya se encuentra registrado y bloqueado para esta fecha y sede.');
      return;
    }

    if (coincideSeleccion === null) {
      alert('Por favor selecciona si el valor identificado coincide con el aplicativo (SÍ o NO).');
      return;
    }

    if (coincideSeleccion === false && !motivoDiferenciaInput.trim()) {
      alert('Por favor ingresa el motivo / observaciones de por qué no coincide el cierre.');
      return;
    }

    const confirmMessage = `¿Está seguro de que desea guardar y bloquear el cierre de caja?\n\n` +
      `- Sede: ${cierreSede}\n` +
      `- Fecha: ${cierreFecha}\n` +
      `- N° Transacciones Identificadas: ${numIdentificadosCierre}\n` +
      `- Valor Total Identificado: ${formatCOP(totalIdentificadoCierre)}\n` +
      `- Valor en Aplicativo: ${formatCOP(totalAplicativoCierre)}\n` +
      `- Coincide con Aplicativo: ${coincideSeleccion ? 'SÍ' : 'NO'}\n` +
      (coincideSeleccion ? '' : `- Motivo / Observaciones: ${motivoDiferenciaInput.trim()}\n`) +
      `\nEsta acción guardará y bloqueará el cierre de caja.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    registrarCierreCaja(
      cierreFecha, 
      cierreSede, 
      currentUser.nombre, 
      numIdentificadosCierre,
      totalIdentificadoCierre,
      totalAplicativoCierre,
      coincideSeleccion,
      coincideSeleccion ? null : motivoDiferenciaInput.trim(),
      true
    );

    alert(`¡Cierre de caja guardado y bloqueado con éxito!\n\nSede: ${cierreSede}\nFecha: ${cierreFecha}\nIdentificados: ${numIdentificadosCierre} (${formatCOP(totalIdentificadoCierre)})\nAplicativo: ${formatCOP(totalAplicativoCierre)}\nCoincide: ${coincideSeleccion ? 'SÍ' : 'NO'}`);
    setCierresCajaList(getCierresCaja());
    onRefreshData();
    setShowCierreModal(false);
  };

  const handleSolicitarDesbloqueo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoDesbloqueoLocal.trim()) {
      alert('Por favor ingresa un motivo para solicitar el desbloqueo.');
      return;
    }
    const success = solicitarDesbloqueoCierre(cierreFecha, cierreSede, motivoDesbloqueoLocal, currentUser.nombre);
    if (success) {
      alert('¡Solicitud de desbloqueo enviada con éxito! El administrador o tesorera revisará tu solicitud.');
      setMotivoDesbloqueoLocal('');
      setMostrarFormSolicitud(false);
      setCierresCajaList(getCierresCaja());
      onRefreshData();
    } else {
      alert('Hubo un error al enviar la solicitud.');
    }
  };

  const handleAprobarDesbloqueo = () => {
    if (confirm(`¿Estás seguro de que deseas desbloquear y habilitar la edición del cierre de caja de la Sede ${cierreSede} para la fecha ${cierreFecha}?`)) {
      const success = aprobarDesbloqueoCierre(cierreFecha, cierreSede, currentUser.nombre);
      if (success) {
        alert('Cierre de caja desbloqueado con éxito. Ahora se encuentra habilitado para editar y guardar.');
        setCierresCajaList(getCierresCaja());
        onRefreshData();
      } else {
        alert('Hubo un error al procesar el desbloqueo.');
      }
    }
  };

  const handleRechazarDesbloqueo = () => {
    if (confirm('¿Estás seguro de que deseas rechazar la solicitud de desbloqueo?')) {
      const success = rechazarDesbloqueoCierre(cierreFecha, cierreSede, currentUser.nombre);
      if (success) {
        alert('Solicitud de desbloqueo rechazada.');
        setCierresCajaList(getCierresCaja());
        onRefreshData();
      } else {
        alert('Hubo un error al rechazar la solicitud.');
      }
    }
  };

  return (
    <div id="transacciones-module" className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      {/* Title & Stats summary banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-black text-[#1A2D7C] italic uppercase font-space tracking-tight flex items-center gap-3">
            <FileCheck2 className="h-8 w-8 text-[#1A2D7C] stroke-[2.5]" />
            TRANSACCIONES <span className="text-slate-350">/ EN TIEMPO REAL</span>
          </h2>
          <p className="text-xs uppercase font-bold tracking-wider text-[#F47920] mt-1.5 font-mono">
            CRÉDITOS Y CONCILIACIONES CON CAJAS QR DE TIENDAS FÍSICAS
          </p>
        </div>

        {/* Counter Summary & Action Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border-2 border-slate-200 px-5 py-2.5 rounded-2xl text-right min-w-[130px] shadow-sm">
            <p className="text-[9.5px] uppercase text-slate-400 font-extrabold tracking-widest leading-none">PENDIENTES HOY</p>
            <p id="stat-pending-count" className="text-xl font-black text-[#F47920] font-space mt-1 leading-none">
              {transactions.filter(t => !t.identificada && !t.esHistorico).length.toString().padStart(2, '0')}
            </p>
          </div>
          <div className="bg-[#1A2D7C] text-white px-5 py-2.5 rounded-2xl text-right min-w-[130px] shadow-lg">
            <p className="text-[9.5px] uppercase text-white/70 font-extrabold tracking-widest leading-none">IDENTIFICADAS</p>
            <p id="stat-solved-count" className="text-xl font-black text-white font-space mt-1 leading-none">
              {transactions.filter(t => t.identificada && !t.esHistorico).length.toString().padStart(2, '0')}
            </p>
          </div>

          <button
            id="btn-diligenciar-cierre-caja"
            onClick={() => setShowCierreModal(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] border border-emerald-400/30 cursor-pointer"
          >
            <Receipt className="h-5 w-5 text-emerald-200" />
            <span>Diligenciar Cierre de Caja</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN DE SOLICITUDES DE CAMBIO PENDIENTES (Solo visible para Admin o Tesorera) */}
      {(currentUser.role === 'Admin' || currentUser.role === 'Tesorera') && (
        (() => {
          const pendingRequests = transactions.filter(t => t.solicitudCambio === 'pendiente' && !t.esHistorico);
          if (pendingRequests.length === 0) return null;
          
          return (
            <div className="bg-gradient-to-r from-[#1A2D7C] to-[#2B3F94] rounded-2xl p-5 border border-amber-500/30 shadow-lg text-white space-y-4 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Solicitudes de Cambio / Corrección Pendientes ({pendingRequests.length})
                  </h3>
                </div>
                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                  Requiere Atención
                </span>
              </div>
              
              <div className="divide-y divide-white/10 max-h-[350px] overflow-y-auto pr-2 space-y-3.5">
                {pendingRequests.map(tx => (
                  <div key={tx.id} className="pt-3.5 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-black bg-white/10 px-2 py-0.5 rounded text-white border border-white/5">
                          ID: {tx.llaveUnica.slice(-8).toUpperCase()}
                        </span>
                        <span className="text-xs font-black text-amber-300">{formatCOP(tx.valor)}</span>
                        <span className="text-[10px] bg-slate-850 border border-white/10 px-2 py-0.5 rounded uppercase font-bold">{tx.sede}</span>
                        <span className="text-[10px] text-slate-300 font-mono font-semibold">{formatDateHuman(tx.fecha)}</span>
                      </div>
                      <p className="text-xs text-white/90 font-medium">
                        Solicitado por: <strong className="text-amber-400">{tx.solicitudUsuario}</strong> en <span className="font-mono text-[10.5px] text-white/70">{tx.solicitudFecha}</span>
                      </p>
                      <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                        <p className="text-xs text-slate-200 font-bold leading-relaxed">
                          💬 Motivo: <span className="font-medium text-white italic">"{tx.solicitudMotivo}"</span>
                        </p>
                        <p className="text-[10px] text-slate-300 mt-1">
                          Estado actual del pago: <span className="font-semibold text-white uppercase">{tx.tipoDocumento} ({tx.asesor || 'Sin Asesor'})</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => {
                          if (confirm(`¿Estás seguro de liberar/desbloquear esta transacción? Volverá al estado Pendiente para que ${tx.solicitudUsuario} la identifique de nuevo.`)) {
                            resolveTransactionChange(tx.id, 'liberar', currentUser.nombre, undefined, currentUser.role);
                            onRefreshData();
                          }
                        }}
                        className="py-2 px-3 bg-[#0F9D58] hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase transition-all shadow flex items-center gap-1 cursor-pointer"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Liberar Pago
                      </button>
                      <button
                        onClick={() => {
                          setAdminCorrectingTxId(tx.id);
                          setAdminSelectedAdvisor(tx.asesor || '');
                          setAdminDocType(tx.tipoDocumento || 'Remisión');
                          setAdminJustificacion(tx.justificacionIgnorado || '');
                        }}
                        className="py-2 px-3 bg-[#F47920] hover:bg-[#F47920]/90 text-white rounded-xl text-[11px] font-black uppercase transition-all shadow flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Corregir Directamente
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}

      {/* Filter Bar */}
      <div id="filter-bar" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
        
        {/* Top filter row: Search Term and Account Selection */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Text Filter Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              id="input-filter-search"
              type="text"
              placeholder="Buscar por Valor, Descripción, Cuenta o Llave Única..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A2D7C]/20 focus:border-[#1A2D7C] font-semibold"
            />
          </div>

          {/* Cuenta Filter Dropdown */}
          <div className="relative md:w-64">
            <select
              id="filter-cuenta-select"
              value={cuentaFilter}
              onChange={(e) => {
                const val = e.target.value;
                setCuentaFilter(val);
                if (val === '6519') {
                  setSedeFilter('Guayabal');
                } else if (val === '0916') {
                  setSedeFilter('Sabaneta');
                } else if (val === '6807') {
                  setSedeFilter('Naranjal');
                }
              }}
              className="w-full text-xs font-bold uppercase tracking-wider border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1A2D7C]/20 focus:border-[#1A2D7C] bg-white text-slate-700 outline-none cursor-pointer"
            >
              <option value="Todas">TODAS LAS CUENTAS</option>
              <option value="6519">Bancolombia Guayabal (***6519)</option>
              <option value="0916">Bancolombia Sabaneta (***0916)</option>
              <option value="6807">Bancolombia Naranjal (***6807)</option>
              <option value="Ahorros">Cuentas Ahorros</option>
              <option value="Corriente">Cuentas Corriente</option>
            </select>
          </div>
        </div>

        {/* Bottom filter row: Sede, Fecha, Rango Montos, Estado, Limpiar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <ListFilter className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 font-space">FILTRAR POR:</span>
          </div>

          {/* Sede Dropdown Filter (Available to Cajeras as well, defaulting to theirs on start) */}
          <select
            id="select-filter-sede"
            value={sedeFilter}
            onChange={(e) => setSedeFilter(e.target.value as Sede | 'Todas')}
            className="text-xs font-bold uppercase tracking-wider border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[#1A2D7C]/20 focus:border-[#1A2D7C] bg-white text-slate-700 outline-none cursor-pointer"
          >
            <option value="Todas">TODAS LAS SEDES</option>
            <option value="Guayabal">Guayabal (6519)</option>
            <option value="Sabaneta">Sabaneta (0916)</option>
            <option value="Naranjal">Naranjal (6807)</option>
            <option value="Desconocida">Sedes Desconocidas</option>
          </select>

          {/* Date Filter */}
          <div className="relative">
            <input
              id="filter-date-input"
              type="date"
              value={fechaFilter}
              onChange={(e) => setFechaFilter(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-[#1A2D7C]/20 focus:border-[#1A2D7C] outline-none cursor-pointer"
            />
          </div>

          {/* Monto Mínimo Filter */}
          <div className="relative">
            <span className="absolute left-2.5 top-2.5 text-[9px] font-black text-slate-400">Min $</span>
            <input
              id="filter-min-monto"
              type="number"
              placeholder="Mínimo"
              value={montoMinFilter}
              onChange={(e) => setMontoMinFilter(e.target.value)}
              className="text-xs font-bold pl-12 pr-2 py-2 border border-slate-200 rounded-xl w-28 focus:ring-2 focus:ring-[#1A2D7C]/20 focus:border-[#1A2D7C] bg-white text-slate-700 outline-none"
            />
          </div>

          {/* Monto Máximo Filter */}
          <div className="relative">
            <span className="absolute left-2.5 top-2.5 text-[9px] font-black text-slate-400">Max $</span>
            <input
              id="filter-max-monto"
              type="number"
              placeholder="Máximo"
              value={montoMaxFilter}
              onChange={(e) => setMontoMaxFilter(e.target.value)}
              className="text-xs font-bold pl-12 pr-2 py-2 border border-slate-200 rounded-xl w-28 focus:ring-2 focus:ring-[#1A2D7C]/20 focus:border-[#1A2D7C] bg-white text-slate-700 outline-none"
            />
          </div>

          {/* Status buttons */}
          <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
              id="btn-filter-status-pending"
              className={`px-4 py-2 text-xs uppercase tracking-widest font-extrabold transition-all ${statusFilter === 'pendientes' ? 'bg-[#1A2D7C] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setStatusFilter('pendientes')}
            >
              Pendientes
            </button>
            <button
              id="btn-filter-status-solved"
              className={`px-4 py-2 text-xs uppercase tracking-widest font-extrabold transition-all ${statusFilter === 'identificadas' ? 'bg-[#1A2D7C] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setStatusFilter('identificadas')}
            >
              Identificadas
            </button>
            <button
              id="btn-filter-status-all"
              className={`px-4 py-2 text-xs uppercase tracking-widest font-extrabold transition-all ${statusFilter === 'all' ? 'bg-[#1A2D7C] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setStatusFilter('all')}
            >
              Todos
            </button>
          </div>

          {/* Clear Filters Button */}
          {(searchTerm || sedeFilter !== (currentUser.role === 'Cajera' && currentUser.sede ? currentUser.sede : 'Todas') || statusFilter !== 'pendientes' || montoMinFilter || montoMaxFilter || fechaFilter || cuentaFilter !== 'Todas') && (
            <button
              id="btn-clear-filters"
              onClick={() => {
                setSearchTerm('');
                setSedeFilter(currentUser.role === 'Cajera' && currentUser.sede ? currentUser.sede : 'Todas');
                setStatusFilter('pendientes');
                setMontoMinFilter('');
                setMontoMaxFilter('');
                setFechaFilter('');
                setCuentaFilter('Todas');
              }}
              className="text-[10px] font-black uppercase tracking-wider text-rose-650 hover:text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2 transition-all cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Cajera branch highlight banner */}
      {currentUser.role === 'Cajera' && currentUser.sede && (
        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-150 flex items-center justify-between">
          <p className="text-[11px] text-indigo-950 font-bold uppercase tracking-wider flex items-center gap-2 font-space">
            <Building2 className="h-4 w-4 text-[#1A2D7C]" />
            Sede Predeterminada: <span className="text-[#1A2D7C] font-black">{currentUser.sede.toUpperCase()}</span> — Se ha filtrado por defecto tu sede, pero puedes buscar consignaciones de otras sedes en el selector superior.
          </p>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-xl">
        {filteredTransactions.length === 0 ? (
          <div className="p-20 text-center text-slate-400">
            <FileCheck2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-black uppercase text-slate-700 tracking-wider">No se encontraron movimientos conciliables</p>
            <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
              Trata de ajustar los filtros arriba (por ejemplo a 'Identificadas' o 'Todos') para ver transacciones cargadas históricas o de otras sucursales.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1A2D7C]/5 border-b-2 border-slate-200">
                <tr className="text-[10px] uppercase font-black text-slate-500 tracking-widest font-space">
                  <th className="px-6 py-4.5">Estado / Llave</th>
                  <th className="px-6 py-4.5">Sede Destinataria</th>
                  <th className="px-6 py-4.5">Fecha y Hora</th>
                  <th className="px-6 py-4.5"># Comprobante / Ref</th>
                  <th className="px-6 py-4.5">Descripción de Movimiento</th>
                  <th className="px-6 py-4.5 text-right">Valor COP</th>
                  <th className="px-6 py-4.5 text-center">Acciones de Validación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTransactions.map((tx) => {
                  const isEditing = activeEditingId === tx.id;
                  
                  return (
                    <tr key={tx.id} id={`row-tx-${tx.id}`} className={`hover:bg-[#1A2D7C]/5 transition-colors group ${tx.identificada ? 'bg-slate-50/80' : ''}`}>
                      
                      {/* State & unique ID metadata */}
                      <td className="px-6 py-4.5 font-sans">
                        <div className="flex items-center gap-2">
                          {tx.identificada ? (
                            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg" title="Conciliado">
                              <Check className="h-3.5 w-3.5 font-bold" />
                            </div>
                          ) : (
                            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg animate-pulse" title="Pendiente">
                              <Clock className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <div>
                            <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded ${tx.identificada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {tx.identificada ? 'CONCILIADO' : 'PENDIENTE'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono block mt-1 tracking-wider uppercase font-bold" title={tx.llaveUnica}>
                              ID: {tx.llaveUnica.slice(-8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Sede badge / Account */}
                      <td className="px-6 py-4.5 font-space">
                        <div>
                          <p className="font-bold text-xs uppercase tracking-wider text-slate-700">{tx.sede}</p>
                          <span className="text-[10px] text-slate-500 font-mono block mt-1">Cta: {tx.cuenta}</span>
                        </div>
                      </td>

                      {/* Date & Hour */}
                      <td className="px-6 py-4.5 text-slate-600 font-mono">
                        <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">{formatDateHuman(tx.fecha)}</div>
                        {tx.hora && <div className="text-[10px] mt-0.5 text-slate-400 font-bold">{tx.hora}</div>}
                      </td>

                      {/* Dedicated # Comprobante / Ref Column */}
                      <td className="px-6 py-4.5 font-mono">
                        {tx.comprobante ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-block bg-orange-100 text-[#D95D00] border border-orange-300 px-2.5 py-1 rounded-lg text-xs font-black tracking-wider shadow-xs" title="Número de comprobante bancario">
                              #{tx.comprobante}
                            </span>
                            {tx.oficina && (
                              <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                OFIC: {tx.oficina}
                              </span>
                            )}
                          </div>
                        ) : tx.oficina ? (
                          <span className="inline-block bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg text-[11px] font-bold">
                            OFIC: {tx.oficina}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold italic">Sin # Comp</span>
                        )}
                      </td>

                      {/* Concept & Core metadata */}
                      <td className="px-6 py-4.5 max-w-[230px]" title={tx.descripcion}>
                        <p className="text-[11px] font-mono text-slate-500 uppercase leading-snug break-words font-medium">{tx.descripcion}</p>
                        <div className="flex flex-wrap items-center gap-1 md:gap-1.5 mt-1.5 font-mono">
                          {(tx.esQR || tx.descripcion.toUpperCase().includes('QR') || tx.descripcion.toUpperCase().includes('COBRU')) && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-black tracking-wider uppercase" title="Identificado automáticamente como Pago QR">
                              PAGO QR
                            </span>
                          )}
                          {!tx.oficina && !tx.comprobante && !(tx.esQR || tx.descripcion.toUpperCase().includes('QR') || tx.descripcion.toUpperCase().includes('COBRU')) && (
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-space">ABONO REGULAR</p>
                          )}
                        </div>
                      </td>

                      {/* Currency amount */}
                      <td className="px-6 py-4.5 text-right font-mono">
                        <span className="font-black text-lg text-slate-900 block">{formatCOP(tx.valor)}</span>
                      </td>

                      {/* Validation metadata column */}
                      <td className="p-3.5">
                        {isEditing ? (
                          /* Inline form to complete metadata assignment */
                          <div id={`editing-panel-${tx.id}`} className="bg-slate-50 p-3 rounded-lg border border-[#1A2D7C]/30 space-y-2.5 max-w-[240px] ml-auto text-left animate-in fade-in duration-200">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">Tipo de Registro:</label>
                              <div className="flex gap-1 flex-wrap">
                                <button
                                  id={`btn-regtype-remis-${tx.id}`}
                                  type="button"
                                  onClick={() => {
                                    setDocType('Remisión');
                                    setSelectedAdvisor('');
                                    setJustificacion('');
                                  }}
                                  className={`flex-1 text-[9px] py-1 px-1.5 font-extrabold rounded cursor-pointer transition-colors text-center ${docType === 'Remisión' ? 'bg-[#1A2D7C] text-white font-black' : 'bg-white text-slate-700 border border-slate-200'}`}
                                >
                                  Remisión
                                </button>
                                <button
                                  id={`btn-regtype-recibo-${tx.id}`}
                                  type="button"
                                  onClick={() => {
                                    setDocType('Recibo');
                                    setSelectedAdvisor('');
                                    setJustificacion('');
                                  }}
                                  className={`flex-1 text-[9px] py-1 px-1.5 font-extrabold rounded cursor-pointer transition-colors text-center ${docType === 'Recibo' ? 'bg-[#1A2D7C] text-white font-black' : 'bg-white text-slate-700 border border-slate-200'}`}
                                >
                                  Recibo
                                </button>
                                <button
                                  id={`btn-regtype-ignorado-${tx.id}`}
                                  type="button"
                                  onClick={() => {
                                    setDocType('Ignorado');
                                    setSelectedAdvisor('');
                                    setJustificacion('');
                                  }}
                                  className={`flex-1 text-[9px] py-1 px-1.5 font-extrabold rounded cursor-pointer transition-colors text-center ${docType === 'Ignorado' ? 'bg-rose-750 text-white font-black' : 'bg-white text-rose-700 border border-rose-200'}`}
                                >
                                  Ignorar
                                </button>
                              </div>
                            </div>

                            {docType === 'Ignorado' ? (
                              <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                                <label className="block text-[10px] font-bold text-rose-800 mb-0.5">Motivo de Descarte *:</label>
                                <select
                                  id={`select-reason-${tx.id}`}
                                  value={
                                    ['Pagado directamente en la caja por QR', 'Pagado directamente en la caja con tarjeta'].includes(justificacion)
                                      ? justificacion
                                      : (justificacion ? 'Otro' : '')
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'Otro') {
                                      setJustificacion('');
                                    } else {
                                      setJustificacion(val);
                                    }
                                  }}
                                  className="w-full border border-slate-200 rounded p-1.5 text-[11px] bg-white font-bold text-slate-700 focus:outline-none focus:border-rose-600"
                                >
                                  <option value="">-- Seleccionar Motivo --</option>
                                  <option value="Pagado directamente en la caja por QR">Se pagó directamente en caja por QR</option>
                                  <option value="Pagado directamente en la caja con tarjeta">Se pagó directamente en caja con tarjeta</option>
                                  <option value="Otro">Otro (Escribir justificación...)</option>
                                </select>
                                
                                {(!['Pagado directamente en la caja por QR', 'Pagado directamente en la caja con tarjeta'].includes(justificacion) || justificacion === '') && (
                                  <textarea
                                    placeholder="Ingresa la justificación obligatoria..."
                                    value={justificacion}
                                    onChange={(e) => setJustificacion(e.target.value)}
                                    rows={2}
                                    className="w-full border border-slate-200 rounded p-1.5 text-[11px] bg-white font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-rose-600 leading-snug"
                                    required
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="animate-in slide-in-from-top-1 duration-200">
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Asesor Responsable *:</label>
                                <select
                                  id={`select-advisor-${tx.id}`}
                                  value={selectedAdvisor}
                                  onChange={(e) => setSelectedAdvisor(e.target.value)}
                                  className="w-full border border-slate-200 rounded p-1.5 text-[11px] bg-white font-bold text-slate-700 focus:outline-none focus:border-[#1A2D7C]"
                                >
                                  <option value="">-- Seleccionar Asesor --</option>
                                  {advisors.map(adv => (
                                    <option key={adv} value={adv}>{adv}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="flex gap-2 pt-1.5 border-t border-slate-200">
                              <button
                                id={`btn-cancel-ident-${tx.id}`}
                                onClick={() => setActiveEditingId(null)}
                                className="flex-1 py-1 text-[10px] text-slate-500 hover:bg-slate-200 font-bold rounded cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                id={`btn-confirm-ident-${tx.id}`}
                                onClick={() => handleConfirmIdentification(tx.id)}
                                className="flex-1 py-1 text-[10px] bg-[#F47920] hover:bg-[#F47920]/95 text-white font-bold rounded shadow-sm cursor-pointer"
                              >
                                Confirmar
                              </button>
                            </div>
                          </div>
                        ) : tx.identificada ? (
                          /* Conciliated receipt metadata display */
                          <div className={`p-2.5 rounded-lg max-w-[280px] ml-auto space-y-1.5 text-left border ${
                            tx.tipoDocumento === 'Ignorado'
                              ? 'bg-rose-50/70 border-rose-100 text-rose-800'
                              : 'bg-emerald-50/50 border-emerald-100 text-slate-600'
                          }`}>
                            <p className="text-[10px] font-bold flex items-center gap-1">
                              {tx.tipoDocumento === 'Ignorado' ? (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                                  <span className="text-rose-900">PAGO IGNORADO</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  <span className="text-emerald-900 font-extrabold">CONCILIADO OK</span>
                                </>
                              )}
                            </p>
                            <div className="text-[9px] space-y-1 font-mono">
                              {tx.tipoDocumento === 'Ignorado' ? (
                                <div>
                                  <span className="text-rose-700 font-bold block">Justificación:</span>
                                  <span className="text-rose-950 font-sans block mt-0.5 break-words bg-white/70 p-1.5 rounded border border-rose-100 font-medium italic leading-relaxed">
                                    {tx.justificacionIgnorado || 'Sin justificación'}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <div>Doc: <strong className="text-slate-800 uppercase font-black">{tx.tipoDocumento}</strong></div>
                                  <div>Asesor: <strong className="text-slate-800 font-bold">{tx.asesor || 'No asignado'}</strong></div>
                                </>
                              )}
                            </div>
                            <p className="text-[8.5px] text-slate-500 mt-1 font-semibold leading-relaxed">
                              Sede: <span className="text-[#F47920] font-black">{tx.sede}</span> • Aprobado por: <span className="text-slate-700 font-bold">{tx.usuarioIdentificacion}</span>
                            </p>
                            <p className="text-[8.5px] text-[#1A2D7C] mt-0.5 font-mono font-bold uppercase tracking-wider">
                              Fecha/Hora: {formatDateTime12h(tx.fechaIdentificacion)}
                            </p>

                            {/* Revert and Change Request controls */}
                            {currentUser.role === 'Admin' || currentUser.role === 'Tesorera' ? (
                              <div className="space-y-1.5">
                                <button
                                  id={`btn-revert-tx-${tx.id}`}
                                  onClick={() => handleRevert(tx.id)}
                                  className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1 text-[9px] bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold rounded transition-colors cursor-pointer"
                                >
                                  <Undo2 className="h-2.5 w-2.5" />
                                  Revertir Validación (Admin/Tesorera)
                                </button>
                                
                                {tx.solicitudCambio === 'pendiente' && (
                                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-left space-y-1.5">
                                    <p className="text-[10px] font-bold text-amber-850 flex items-center gap-1">
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                      </span>
                                      Solicitud de Cambio:
                                    </p>
                                    <p className="text-[9.5px] text-slate-600 font-medium italic">
                                      "{tx.solicitudMotivo}"
                                    </p>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => {
                                          if (confirm(`¿Liberar esta transacción?`)) {
                                            resolveTransactionChange(tx.id, 'liberar', currentUser.nombre, undefined, currentUser.role);
                                            onRefreshData();
                                          }
                                        }}
                                        className="flex-1 text-[9px] bg-teal-600 hover:bg-teal-700 text-white font-bold py-1 px-1.5 rounded cursor-pointer transition-colors text-center"
                                      >
                                        Liberar
                                      </button>
                                      <button
                                        onClick={() => {
                                          setAdminCorrectingTxId(tx.id);
                                          setAdminSelectedAdvisor(tx.asesor || '');
                                          setAdminDocType(tx.tipoDocumento || 'Remisión');
                                          setAdminJustificacion(tx.justificacionIgnorado || '');
                                        }}
                                        className="flex-1 text-[9px] bg-[#F47920] hover:bg-orange-650 text-white font-bold py-1 px-1.5 rounded cursor-pointer transition-colors text-center"
                                      >
                                        Corregir
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="mt-1.5 space-y-1.5">
                                {tx.solicitudCambio === 'pendiente' ? (
                                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-left animate-pulse">
                                    <p className="text-[9.5px] font-extrabold text-amber-800">
                                      ⏳ Solicitud Enviada
                                    </p>
                                    <p className="text-[9px] text-slate-500 font-medium leading-relaxed mt-0.5">
                                      Pendiente de aprobación por Admin.
                                    </p>
                                    <p className="text-[9.5px] text-slate-700 italic font-medium mt-1">
                                      💬 "{tx.solicitudMotivo}"
                                    </p>
                                  </div>
                                ) : tx.solicitudCambio === 'corregido' ? (
                                  <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-left">
                                    <p className="text-[9.5px] font-extrabold text-emerald-800">
                                      ✅ Corrección Aplicada
                                    </p>
                                    <p className="text-[9px] text-slate-500 leading-relaxed mt-0.5">
                                      El Administrador corrigió esta transacción directamente.
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center justify-center gap-1 text-[8px] text-slate-400 italic bg-slate-100/50 rounded py-0.5 border border-dashed">
                                      <Lock className="h-2 w-2" />
                                      Bloqueado para Cajeras
                                    </div>
                                    
                                    {requestChangeTxId === tx.id ? (
                                      <div className="p-2 bg-slate-50 rounded border border-slate-200 space-y-2 text-left animate-in slide-in-from-top-1 duration-150">
                                        <label className="block text-[9px] uppercase font-black text-slate-500 tracking-wider">Describa el Cambio Solicitado *</label>
                                        <textarea
                                          value={requestChangeReason}
                                          onChange={(e) => setRequestChangeReason(e.target.value)}
                                          placeholder="Ej: Era Remisión con asesor Pedro, no Recibo"
                                          className="w-full text-[10px] font-bold p-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-[#1A2D7C]"
                                          rows={2}
                                          required
                                        />
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => setRequestChangeTxId(null)}
                                            className="flex-1 py-1 text-[9px] bg-slate-200 hover:bg-slate-300 font-bold rounded text-slate-600 transition-colors cursor-pointer"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (!requestChangeReason.trim()) {
                                                alert('Por favor ingrese el motivo del cambio solicitado.');
                                                return;
                                              }
                                              requestTransactionChange(tx.id, currentUser, requestChangeReason);
                                              setRequestChangeTxId(null);
                                              setRequestChangeReason('');
                                              onRefreshData();
                                              alert('Ya se le notificó al administrador de que tiene una reversión pendiente.');
                                            }}
                                            className="flex-1 py-1 text-[9px] bg-[#F47920] hover:bg-[#F47920]/90 font-bold rounded text-white shadow transition-colors cursor-pointer"
                                          >
                                            Enviar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        id={`btn-solicitar-cambio-${tx.id}`}
                                        onClick={() => {
                                          setRequestChangeTxId(tx.id);
                                          setRequestChangeReason('');
                                        }}
                                        className="w-full py-1.5 text-[9px] bg-orange-50 hover:bg-orange-100 text-[#F47920] border border-orange-100 hover:border-orange-200 font-black rounded uppercase transition-all tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <HelpCircle className="h-3 w-3" />
                                        Solicitar Cambio
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Initial action button for unconciliated entry */
                          <div className="text-right">
                            <button
                              id={`btn-start-ident-${tx.id}`}
                              onClick={() => handleStartIdentification(tx)}
                              className="bg-[#1A2D7C] hover:bg-[#1A2D7C]/95 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                            >
                              <FileCheck2 className="h-3.5 w-3.5" />
                              Marcar Identificada
                            </button>
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE CORRECCIÓN DIRECTA POR ADMIN */}
      {adminCorrectingTxId && (() => {
        const tx = transactions.find(t => t.id === adminCorrectingTxId);
        if (!tx) return null;
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-[#1A2D7C]">
                  <FileCheck2 className="h-5 w-5" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Corrección Directa (Admin)</h3>
                </div>
                <button 
                  onClick={() => setAdminCorrectingTxId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl mb-4 text-xs space-y-1 border border-slate-100">
                <p className="font-bold text-slate-700">Detalles de Transacción:</p>
                <div className="grid grid-cols-2 gap-2 text-slate-500 font-mono text-[10.5px]">
                  <div>ID: {tx.llaveUnica.slice(-8).toUpperCase()}</div>
                  <div className="text-right font-bold text-slate-800">{formatCOP(tx.valor)}</div>
                  <div>Sede: {tx.sede}</div>
                  <div className="text-right">{formatDateHuman(tx.fecha)}</div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Solicitante: <strong className="text-[#1A2D7C]">{tx.solicitudUsuario}</strong>
                </p>
                <p className="text-[10px] text-amber-700 font-semibold bg-amber-50 p-1.5 rounded mt-1.5 leading-relaxed border border-amber-100 italic">
                  💬 Motivo: "{tx.solicitudMotivo}"
                </p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (adminDocType === 'Ignorado') {
                  if (!adminJustificacion.trim()) {
                    alert('Por favor ingrese la justificación para ignorar este pago.');
                    return;
                  }
                } else {
                  if (!adminSelectedAdvisor) {
                    alert('Por favor seleccione un asesor responsable.');
                    return;
                  }
                }
                
                resolveTransactionChange(tx.id, 'corregir', currentUser.nombre, {
                  asesor: adminSelectedAdvisor,
                  tipoDocumento: adminDocType,
                  justificacionIgnorado: adminJustificacion
                }, currentUser.role);
                
                setAdminCorrectingTxId(null);
                onRefreshData();
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">Tipo de Registro:</label>
                  <div className="flex gap-2">
                    {['Remisión', 'Recibo', 'Ignorado'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setAdminDocType(type as any);
                          if (type === 'Ignorado') {
                            setAdminSelectedAdvisor('');
                          } else {
                            setAdminJustificacion('');
                          }
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${adminDocType === type ? 'bg-[#1A2D7C] text-white shadow' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {adminDocType === 'Ignorado' ? (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-rose-800 uppercase">Motivo de Descarte *:</label>
                    <textarea
                      placeholder="Indique los detalles de la corrección o por qué se descarta..."
                      value={adminJustificacion}
                      onChange={(e) => setAdminJustificacion(e.target.value)}
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 font-bold text-slate-700 placeholder:text-slate-450 placeholder:font-normal focus:outline-none focus:border-rose-600"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Asesor Responsable *:</label>
                    <select
                      value={adminSelectedAdvisor}
                      onChange={(e) => setAdminSelectedAdvisor(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 font-bold text-slate-700 focus:outline-none focus:border-[#1A2D7C]"
                    >
                      <option value="">-- Seleccionar Asesor --</option>
                      {advisors.map(adv => (
                        <option key={adv} value={adv}>{adv}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdminCorrectingTxId(null)}
                    className="flex-1 py-3 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 uppercase cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    Aplicar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL DILIGENCIAR CIERRE DE CAJA */}
      {showCierreModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 md:p-8 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Top decorative stripe */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-600 to-[#1A2D7C]" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3 text-[#1A2D7C]">
                <div className="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <Receipt className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight font-space">Diligenciar Cierre de Caja</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">CONCILIACIÓN DIARIA DE RECAUDO Y CAJA FÍSICA</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCierreModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Selectors for Fecha & Sede */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-[#1A2D7C]" />
                  Sede Física:
                </label>
                <select
                  value={cierreSede}
                  onChange={(e) => setCierreSede(e.target.value as Sede)}
                  disabled={currentUser.role === 'Cajera' && !!currentUser.sede}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#1A2D7C]"
                >
                  <option value="Guayabal">Guayabal</option>
                  <option value="Sabaneta">Sabaneta</option>
                  <option value="Naranjal">Naranjal</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-[#1A2D7C]" />
                  Fecha de Cierre:
                </label>
                <input
                  type="date"
                  value={cierreFecha}
                  onChange={(e) => setCierreFecha(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#1A2D7C]"
                />
              </div>
            </div>

            {isAlreadyClosed && currentCierre ? (
              /* LOCKED CLOSURE STATE VIEW */
              <div className="space-y-4">
                <div className="bg-amber-50 border-2 border-amber-200/80 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 border-b border-amber-200 pb-2">
                    <Lock className="h-5 w-5 text-amber-600" />
                    <span className="font-black text-xs uppercase tracking-wider">Cierre Guardado y Bloqueado</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Cajera / Usuario:</span>
                      <span className="font-black text-slate-800">{currentCierre.nombreCajera}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">N° Identificados:</span>
                      <span className="font-mono font-black text-emerald-700">{currentCierre.numeroIdentificados ?? numIdentificadosCierre} txs</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Identificado:</span>
                      <span className="font-mono font-black text-emerald-700">{formatCOP(currentCierre.totalIdentificado ?? currentCierre.totalDeclarado)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Aplicativo:</span>
                      <span className="font-mono font-black text-[#1A2D7C]">{formatCOP(currentCierre.totalAplicativo ?? totalAplicativoCierre)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 uppercase">¿Coincidió con Aplicativo?:</span>
                    <span className={`font-black px-2.5 py-0.5 rounded-full uppercase text-[10px] ${currentCierre.coincide !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {currentCierre.coincide !== false ? 'SÍ, COINCIDIÓ' : 'NO COINCIDIÓ'}
                    </span>
                  </div>

                  {currentCierre.motivoDiferencia && (
                    <div className="bg-white p-3 rounded-xl border border-amber-200 text-xs">
                      <span className="font-bold text-slate-500 uppercase text-[9.5px] block mb-0.5">Motivo / Observaciones:</span>
                      <p className="text-slate-700 italic font-semibold">{currentCierre.motivoDiferencia}</p>
                    </div>
                  )}
                </div>

                {/* Request unlock option */}
                {!mostrarFormSolicitud ? (
                  <button
                    onClick={() => setMostrarFormSolicitud(true)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Unlock className="h-4 w-4 text-amber-600" />
                    Solicitar Desbloqueo de Cierre al Administrador
                  </button>
                ) : (
                  <form onSubmit={handleSolicitarDesbloqueo} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <label className="block text-[10px] font-black uppercase text-slate-600 tracking-wider">
                      Motivo del Desbloqueo *:
                    </label>
                    <textarea
                      value={motivoDesbloqueoLocal}
                      onChange={(e) => setMotivoDesbloqueoLocal(e.target.value)}
                      placeholder="Ej: Se identificó una transacción adicional del día..."
                      rows={2}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#1A2D7C]"
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMostrarFormSolicitud(false)}
                        className="flex-1 py-2 bg-slate-200 text-slate-600 font-bold text-xs rounded-xl uppercase cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-[#1A2D7C] text-white font-bold text-xs rounded-xl uppercase shadow flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Enviar Solicitud
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* ACTIVE CLOSURE FORM */
              <form onSubmit={handleGuardarCierre} className="space-y-6">
                {/* Information Card */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md border border-indigo-900/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-widest">INFORMACIÓN DETECTADA</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                      {numIdentificadosCierre} Identificados
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-300 uppercase block">Total Identificado ({numIdentificadosCierre} txs):</span>
                      <span className="text-xl font-black font-mono text-emerald-400 block mt-0.5">{formatCOP(totalIdentificadoCierre)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-300 uppercase block">Total en Aplicativo (Banco):</span>
                      <span className="text-xl font-black font-mono text-amber-300 block mt-0.5">{formatCOP(totalAplicativoCierre)}</span>
                    </div>
                  </div>
                </div>

                {/* Coincidence Check Radio / Buttons */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                    ¿Coincide este valor con el cierre del aplicativo? *
                  </label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCoincideSeleccion(true)}
                      className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        coincideSeleccion === true
                          ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-500 ring-offset-2'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      SÍ, COINCIDE
                    </button>

                    <button
                      type="button"
                      onClick={() => setCoincideSeleccion(false)}
                      className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        coincideSeleccion === false
                          ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-500 ring-offset-2'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      NO COINCIDE
                    </button>
                  </div>

                  {coincideSeleccion === true && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <span>El monto total identificado coincide perfectamente con el cierre del aplicativo.</span>
                    </div>
                  )}

                  {coincideSeleccion === false && (
                    <div className="space-y-3 pt-1 animate-in slide-in-from-top-2 duration-200">
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                        <span>Diferencia detectada: <strong className="font-mono underline">{formatCOP(Math.abs(diferenciaCierre))}</strong></span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-rose-800 tracking-wider mb-1">
                          ¿Por qué no coincide? (Motivo / Observaciones del descuadre) *:
                        </label>
                        <textarea
                          value={motivoDiferenciaInput}
                          onChange={(e) => setMotivoDiferenciaInput(e.target.value)}
                          placeholder="Ej: Falta comprobante de 1 cliente por $150.000 / Transferencia recibida fuera de horario de caja..."
                          rows={3}
                          className="w-full bg-white border border-rose-300 rounded-xl p-3 text-xs font-bold text-slate-800 placeholder:font-normal focus:outline-none focus:border-rose-600"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Action Button */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCierreModal(false)}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="flex-[2] py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs rounded-2xl shadow-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <Lock className="h-4 w-4" />
                    Guardar y Bloquear Cierre
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
