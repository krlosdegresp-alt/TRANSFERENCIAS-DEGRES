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
  subscribeToDatabase
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

  // Editing state for validation inline submission
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [docType, setDocType] = useState<'Recibo' | 'Remisión' | 'Ignorado'>('Remisión');
  const [justificacion, setJustificacion] = useState('');
  const [nroReciboCaja, setNroReciboCaja] = useState('');

  // Cierre de caja state
  const [cierreFecha, setCierreFecha] = useState('');
  const [cierreSede, setCierreSede] = useState<Sede>(
    currentUser.role === 'Cajera' && currentUser.sede ? currentUser.sede : 'Guayabal'
  );
  const [valorCierre, setValorCierre] = useState('');
  const [motivoDesbloqueoLocal, setMotivoDesbloqueoLocal] = useState('');
  const [mostrarFormSolicitud, setMostrarFormSolicitud] = useState(false);
  const [cierresCajaList, setCierresCajaList] = useState<CierreCaja[]>(() => getCierresCaja());

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

    // Secure lockdown: Cajera can NEVER see transactions of other branches
    if (currentUser.role === 'Cajera' && tx.sede !== currentUser.sede) {
      return false;
    }

    const matchesSearch = 
      tx.llaveUnica.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.valor.toString().includes(searchTerm) ||
      tx.cuenta.includes(searchTerm);

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'pendientes' && !tx.identificada) ||
      (statusFilter === 'identificadas' && tx.identificada);

    const matchesSede = 
      currentUser.role === 'Cajera'
        ? tx.sede === currentUser.sede
        : (sedeFilter === 'Todas' || tx.sede === sedeFilter);

    return matchesSearch && matchesStatus && matchesSede;
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
    if (confirm('¿Está seguro de que desea revertir la identificación de este pago? Esta acción requerida por cajeros ha sido limitada a Administradores.')) {
      const success = revertIdentification(id, currentUser.nombre);
      if (success) {
        onRefreshData();
      }
    }
  };

  // Calculations for Cierre de Caja
  const bankPaymentsForDate = transactions.filter(
    t => t.fecha === cierreFecha && t.sede === cierreSede && !t.esHistorico
  );
  const totalBanco = bankPaymentsForDate.reduce((sum, tx) => sum + tx.valor, 0);
  const valorDeclaradoNum = valorCierre ? parseFloat(valorCierre) : 0;
  const noDeclaradoAun = valorCierre === '';
  const diferencia = valorDeclaradoNum - totalBanco;
  const activeCierres = cierresCajaList;
  const currentCierre = activeCierres.find(c => c.fecha === cierreFecha && c.sede === cierreSede);
  const isAlreadyClosed = !!currentCierre;

  const handleGuardarCierre = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadyClosed) {
      alert('Este cierre de caja ya se encuentra registrado y bloqueado para esta fecha y sede.');
      return;
    }
    if (isNaN(valorDeclaradoNum) || valorDeclaradoNum < 0) {
      alert('Por favor ingresa un monto válido (mayor o igual a 0).');
      return;
    }

    const confirmMessage = `¿Está seguro de que desea guardar el cierre de caja?\n\n` +
      `- Sede: ${cierreSede}\n` +
      `- Fecha: ${cierreFecha}\n` +
      `- Monto Declarado (Sistema Interno): ${formatCOP(valorDeclaradoNum)}\n` +
      `- Total Banco (Aplicativo): ${formatCOP(totalBanco)}\n` +
      `- Diferencia (Descuadre): ${(diferencia >= 0 ? '+' : '')}${formatCOP(diferencia)}\n\n` +
      `¿Desea registrar esta información en el sistema de conciliación?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    registrarCierreCaja(cierreFecha, cierreSede, currentUser.nombre, valorDeclaradoNum);
    alert(`¡Cierre de caja guardado con éxito!\n\nSede: ${cierreSede}\nFecha: ${cierreFecha}\nTotal Declarado (Sistema Interno): ${formatCOP(valorDeclaradoNum)}\nTotal Banco (Aplicativo): ${formatCOP(totalBanco)}\nDiferencia: ${formatCOP(diferencia)}`);
    setCierresCajaList(getCierresCaja());
    onRefreshData();
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

        {/* Counter Summary */}
        <div className="flex gap-4">
          <div className="bg-white border-2 border-slate-200 px-6 py-3 rounded-2xl text-right min-w-[140px] shadow-sm">
            <p className="text-[10px] uppercase text-slate-400 font-extrabold tracking-widest leading-none">PENDIENTES HOY</p>
            <p id="stat-pending-count" className="text-2xl font-black text-[#F47920] font-space mt-1 leading-none">
              {transactions.filter(t => !t.identificada && !t.esHistorico).length.toString().padStart(2, '0')}
            </p>
          </div>
          <div className="bg-[#1A2D7C] text-white px-6 py-3 rounded-2xl text-right min-w-[140px] shadow-lg">
            <p className="text-[10px] uppercase text-white/70 font-extrabold tracking-widest leading-none">IDENTIFICADAS</p>
            <p id="stat-solved-count" className="text-2xl font-black text-white font-space mt-1 leading-none">
              {transactions.filter(t => t.identificada && !t.esHistorico).length.toString().padStart(2, '0')}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div id="filter-bar" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Text Filter Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            id="input-filter-search"
            type="text"
            placeholder="Buscar por Valor, Descripción, Cuenta o Llave Única..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A2D7C]/20 focus:border-[#1A2D7C] font-medium"
          />
        </div>

        {/* Filters Selectors Group */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <ListFilter className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 font-space">FILTRAR POR:</span>
          </div>

          {/* Sede Dropdown Filter */}
          {currentUser.role === 'Cajera' ? (
            <div className="flex items-center gap-1.5 bg-slate-100 border-2 border-slate-200 px-3 py-2.5 rounded-xl text-slate-605 text-xs font-bold uppercase tracking-wider font-space">
              <Lock className="h-3.5 w-3.5 text-[#1A2D7C]" />
              <span>Sede: {currentUser.sede} (Fija)</span>
            </div>
          ) : (
            <select
              id="select-filter-sede"
              value={sedeFilter}
              onChange={(e) => setSedeFilter(e.target.value as Sede | 'Todas')}
              className="text-xs font-bold uppercase tracking-wider border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[#1A2D7C]/20 focus:border-[#1A2D7C] bg-white text-slate-700 outline-none"
            >
              <option value="Todas">TODAS LAS SEDES</option>
              <option value="Guayabal">Guayabal (6519)</option>
              <option value="Sabaneta">Sabaneta (0916)</option>
              <option value="Naranjal">Naranjal (6807)</option>
              <option value="Desconocida">Sedes Desconocidas</option>
            </select>
          )}

          {/* Status buttons */}
          <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
              id="btn-filter-status-pending"
              className={`px-4 py-2.5 text-xs uppercase tracking-widest font-extrabold transition-all ${statusFilter === 'pendientes' ? 'bg-[#1A2D7C] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setStatusFilter('pendientes')}
            >
              Pendientes
            </button>
            <button
              id="btn-filter-status-solved"
              className={`px-4 py-2.5 text-xs uppercase tracking-widest font-extrabold transition-all ${statusFilter === 'identificadas' ? 'bg-[#1A2D7C] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setStatusFilter('identificadas')}
            >
              Identificadas
            </button>
            <button
              id="btn-filter-status-all"
              className={`px-4 py-2.5 text-xs uppercase tracking-widest font-extrabold transition-all ${statusFilter === 'all' ? 'bg-[#1A2D7C] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setStatusFilter('all')}
            >
              Todos
            </button>
          </div>
        </div>
      </div>

      {/* Cajera branch highlight banner */}
      {currentUser.role === 'Cajera' && currentUser.sede && (
        <div className="p-4 bg-indigo-50 rounded-2xl border-2 border-indigo-200 flex items-center justify-between">
          <p className="text-[11px] text-indigo-900 font-bold uppercase tracking-wider flex items-center gap-2 font-space">
            <Lock className="h-4 w-4 text-[#1A2D7C] stroke-[2.5]" />
            Sede Fija Asignada: <span className="text-[#1A2D7C] font-black">{currentUser.sede.toUpperCase()}</span> — Solo tienes privilegios de visibilidad para tu caja física.
          </p>
        </div>
      )}

      {/* Diligenciar Cierre de Caja Section */}
      {(currentUser.role === 'Cajera' || currentUser.role === 'Admin' || currentUser.role === 'Tesorera') && (
        <div id="section-cierre-caja" className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h3 className="text-sm font-black text-[#1A2D7C] uppercase font-space tracking-wider flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#F47920] animate-pulse"></span>
                Diligenciar Cierre de Caja Diario (Pagos Electrónicos)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Registra y compara el consolidado diario de tu sistema interno con lo reflejado en las cuentas bancarias.
              </p>
            </div>
            {isAlreadyClosed && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800 font-mono flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-rose-600 stroke-[2.5]" />
                Cierre Guardado & Bloqueado
              </span>
            )}
          </div>

          <form onSubmit={handleGuardarCierre} className="grid lg:grid-cols-12 gap-6 items-start">
            
            {/* Inputs Panel */}
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Fecha de Cierre</label>
                <input
                  id="cierre-fecha-input"
                  type="date"
                  required
                  value={cierreFecha}
                  onChange={(e) => setCierreFecha(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#1A2D7C]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Sede Física</label>
                {currentUser.role === 'Cajera' ? (
                  <div className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-100 text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-[#1A2D7C]" />
                    <span>Sede: {cierreSede} (Asignada)</span>
                  </div>
                ) : (
                  <select
                    id="cierre-sede-select"
                    value={cierreSede}
                    onChange={(e) => setCierreSede(e.target.value as Sede)}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-[#1A2D7C] uppercase tracking-wider"
                  >
                    <option value="Guayabal">Guayabal (6519)</option>
                    <option value="Sabaneta">Sabaneta (0916)</option>
                    <option value="Naranjal">Naranjal (6807)</option>
                    <option value="Desconocida">Otra / Sin Sede</option>
                  </select>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Monto Total Registrado en Sistema Interno (Caja Diaria Individual COP)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-xs font-black text-slate-400">COP $</span>
                  <input
                    id="cierre-monto-input"
                    type="number"
                    step="any"
                    disabled={isAlreadyClosed}
                    placeholder={isAlreadyClosed ? "Cierre ya guardado..." : "Escribe el total acumulado en tu sistema interno para pagos electrónicos..."}
                    value={valorCierre}
                    onChange={(e) => setValorCierre(e.target.value)}
                    className={`w-full pl-14 pr-4 py-2.5 text-xs font-bold border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A2D7C]/20 focus:border-[#1A2D7C] ${
                      isAlreadyClosed ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1 leading-normal">
                  Ingresa la sumatoria de todas las transacciones de transferencias/QR/datafonos que tienes registradas en tu POS o sistema administrativo interno para esta sucursal en esta fecha.
                </p>
              </div>
            </div>

            {/* Verification Tally Panel */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between self-stretch">
              <div className="space-y-3.5">
                <h4 className="text-[10px] uppercase font-black text-slate-450 tracking-widest font-space border-b border-slate-200 pb-2 flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-[#F47920]" />
                  RESULTADO DEL CUADRE DE CAJA
                </h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium font-space uppercase text-[10px]">1. Total en Cuentas Banco:</span>
                    <span className="font-mono font-bold text-slate-800">{formatCOP(totalBanco)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium font-space uppercase text-[10px]">2. Monto Declarado (Turno):</span>
                    <span className="font-mono font-bold text-slate-800">
                      {noDeclaradoAun ? '(Sin declarar)' : formatCOP(valorDeclaradoNum)}
                    </span>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide font-space text-[10px]">Diferencia (Descuadre):</span>
                    <span className={`text-sm font-black font-mono ${
                      noDeclaradoAun ? 'text-slate-400' :
                      diferencia === 0 ? 'text-emerald-600' :
                      diferencia > 0 ? 'text-orange-500 font-bold' :
                      'text-red-650'
                    }`}>
                      {noDeclaradoAun ? '--' : (diferencia >= 0 ? '+' : '') + formatCOP(diferencia)}
                    </span>
                  </div>
                </div>

                {/* Status indicator alert */}
                <div className="pt-1.5">
                  {noDeclaradoAun ? (
                    <div className="p-3 bg-slate-200/50 border border-slate-300 text-slate-600 rounded-xl text-center text-[11px] font-black uppercase tracking-wider font-space">
                      Pendiente por Diligenciar
                    </div>
                  ) : diferencia === 0 ? (
                    <div className="p-3 bg-emerald-600 text-white rounded-xl text-center text-[11px] font-black uppercase tracking-wider font-space flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                      Caja Cuadrada Perfectamente
                    </div>
                  ) : diferencia > 0 ? (
                    <div className="p-3 bg-orange-100 border border-orange-200 text-orange-850 rounded-xl text-center text-[10.5px] font-black uppercase tracking-wider font-space flex flex-col items-center">
                      <span>DIFERENCIA CON SOBRANTE</span>
                      <span className="font-mono mt-0.5 text-xs text-orange-900">Se declararon demás {formatCOP(diferencia)}</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-100 border border-red-200 text-red-850 rounded-xl text-center text-[10.5px] font-black uppercase tracking-wider font-space flex flex-col items-center">
                      <span>DIFERENCIA CON FALTANTE</span>
                      <span className="font-mono mt-0.5 text-xs text-red-900">Faltan por ingresar {formatCOP(Math.abs(diferencia))}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-200 flex flex-col gap-3">
                <button
                  id="btn-guardar-cierre-caja"
                  type="submit"
                  disabled={isAlreadyClosed}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest font-black font-space transition-all flex items-center justify-center gap-2 ${
                    isAlreadyClosed 
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none border border-slate-300' 
                      : 'bg-[#1A2D7C] hover:bg-[#1A2D7C]/95 text-white hover:shadow cursor-pointer'
                  }`}
                >
                  {isAlreadyClosed ? (
                    <>
                      <Lock className="h-4 w-4 text-slate-500" />
                      Cierre Guardado & Bloqueado
                    </>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4 text-white" />
                      Guardar Cierre de Caja
                    </>
                  )}
                </button>

                {isAlreadyClosed && (
                  <div className="space-y-3">
                    {/* CASE A: User is Cajera */}
                    {currentUser.role === 'Cajera' && (
                      <div className="border-t border-slate-200 pt-3 text-left">
                        {currentCierre?.solicitaDesbloqueo ? (
                          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 shadow-sm">
                            <p className="text-[10.5px] font-bold text-amber-950 flex items-center gap-1.5 font-space uppercase">
                              <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                              Desbloqueo Solicitado al Admin
                            </p>
                            <p className="text-[10.5px] text-amber-850 italic leading-relaxed break-words bg-white/60 p-2 rounded border border-amber-100 font-medium">
                              "Motivo: {currentCierre.motivoDesbloqueo}"
                            </p>
                            <p className="text-[9.5px] text-amber-600 font-medium">
                              Espera a que un Administrador o Tesorera apruebe tu solicitud de corrección para volver a guardar.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {!mostrarFormSolicitud ? (
                              <button
                                type="button"
                                onClick={() => setMostrarFormSolicitud(true)}
                                className="w-full py-2.5 px-4 border-2 border-dashed border-[#F47920] hover:bg-[#F47920]/5 text-[#F47920] font-black uppercase text-[10px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-sm"
                              >
                                <Unlock className="h-3.5 w-3.5 text-[#F47920]" />
                                ¿Corregir Error? Solicitar Desbloqueo
                              </button>
                            ) : (
                              <div className="space-y-2 bg-slate-100 p-3.5 rounded-xl border border-slate-200 animate-in fade-in duration-200">
                                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Motivo del Error (Justificación) *</label>
                                <textarea
                                  value={motivoDesbloqueoLocal}
                                  onChange={(e) => setMotivoDesbloqueoLocal(e.target.value)}
                                  placeholder="Explica detalladamente por qué necesitas desbloquear y corregir el cierre de caja de hoy (por ejemplo: ingresé mal un dígito, olvidé un QR, etc.)..."
                                  className="w-full text-[11px] font-bold p-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-[#F47920] placeholder:text-slate-400 placeholder:font-normal leading-relaxed"
                                  rows={2}
                                  required
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMostrarFormSolicitud(false);
                                      setMotivoDesbloqueoLocal('');
                                    }}
                                    className="flex-1 py-1.5 text-[10px] text-slate-600 bg-white border border-slate-200 rounded-lg font-black uppercase tracking-wider hover:bg-slate-50 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleSolicitarDesbloqueo(e as any)}
                                    className="flex-1 py-1.5 text-[10px] bg-[#F47920] hover:bg-[#F47920]/95 text-white rounded-lg font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                                  >
                                    <Send className="h-2.5 w-2.5 text-white" />
                                    Enviar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASE B: User is Admin or Tesorera */}
                    {(currentUser.role === 'Admin' || currentUser.role === 'Tesorera') && (
                      <div className="border-t border-slate-200 pt-3 text-left space-y-2.5">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1 font-space">
                          <Unlock className="h-3.5 w-3.5 text-[#1A2D7C]" />
                          Controles de Desbloqueo (Admin)
                        </p>

                        {currentCierre?.solicitaDesbloqueo ? (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5">
                            <p className="text-[10px] font-bold text-amber-950 flex items-center gap-1.5 font-space uppercase">
                              <AlertTriangle className="h-4 w-4 text-amber-600 animate-pulse" />
                              Solicitud de Desbloqueo de {currentCierre.nombreCajera}
                            </p>
                            <p className="text-[11px] text-amber-950 italic leading-relaxed break-words bg-white/70 p-2.5 rounded-lg border border-amber-100 font-medium">
                              "{currentCierre.motivoDesbloqueo}"
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleRechazarDesbloqueo}
                                className="flex-1 py-1.5 px-2 text-[9.5px] bg-white text-rose-750 border border-rose-200 hover:bg-rose-50 rounded-lg font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Rechazar
                              </button>
                              <button
                                type="button"
                                onClick={handleAprobarDesbloqueo}
                                className="flex-1 py-1.5 px-2 text-[9.5px] bg-[#1A2D7C] hover:bg-[#1A2D7C]/95 text-white rounded-lg font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                              >
                                <Check className="h-3.5 w-3.5 text-white" />
                                Aprobar & Desbloquear
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleAprobarDesbloqueo}
                            className="w-full py-2 px-3 bg-[#1A2D7C]/10 hover:bg-[#1A2D7C]/20 text-[#1A2D7C] border border-[#1A2D7C]/30 font-black uppercase text-[9.5px] tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-sm"
                          >
                            <Unlock className="h-3.5 w-3.5 text-[#1A2D7C]" />
                            Desbloquear Cierre Directamente
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

          </form>

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

                      {/* Concept & Core metadata */}
                      <td className="px-6 py-4.5 max-w-[230px]" title={tx.descripcion}>
                        <p className="text-[11px] font-mono text-slate-500 uppercase leading-snug break-words font-medium">{tx.descripcion}</p>
                        <div className="flex flex-wrap items-center gap-1 md:gap-1.5 mt-1.5 font-mono">
                          {(tx.esQR || tx.descripcion.toUpperCase().includes('QR') || tx.descripcion.toUpperCase().includes('COBRU')) && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-black tracking-wider uppercase" title="Identificado automáticamente como Pago QR">
                              PAGO QR
                            </span>
                          )}
                          {tx.oficina && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold" title="Código de Oficina del Banco">
                              OFIC: {tx.oficina}
                            </span>
                          )}
                          {tx.comprobante && (
                            <span className="text-[9px] bg-orange-50 text-[#F47920] border border-orange-100 px-1.5 py-0.5 rounded font-bold" title="Número de comprobante bancario">
                              COMP: {tx.comprobante}
                            </span>
                          )}
                          {!tx.oficina && !tx.comprobante && !(tx.esQR || tx.descripcion.toUpperCase().includes('QR') || tx.descripcion.toUpperCase().includes('COBRU')) && (
                            <p className="text-[9px] text-[#F47920] font-bold uppercase tracking-wider font-space">ABONO REGULAR</p>
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
                              Aprobado por: <span className="text-slate-700 font-bold">{tx.usuarioIdentificacion}</span>
                            </p>
                            <p className="text-[8.5px] text-[#1A2D7C] mt-0.5 font-mono font-bold uppercase tracking-wider">
                              {formatDateTime12h(tx.fechaIdentificacion)}
                            </p>

                            {/* Revert controls ONLY for Admin roles */}
                            {currentUser.role === 'Admin' ? (
                              <button
                                id={`btn-revert-tx-${tx.id}`}
                                onClick={() => handleRevert(tx.id)}
                                className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1 text-[9px] bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold rounded transition-colors cursor-pointer"
                              >
                                <Undo2 className="h-2.5 w-2.5" />
                                Revertir Validación (Admin)
                              </button>
                            ) : (
                              <div className="mt-1 flex items-center justify-center gap-1 text-[8px] text-slate-400 italic bg-slate-100/50 rounded py-0.5 border border-dashed">
                                <Lock className="h-2 w-2" />
                                Bloqueado para Cajeras
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
    </div>
  );
}
