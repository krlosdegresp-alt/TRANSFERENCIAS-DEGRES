import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, Sede, User } from '../types';
import { formatCOP, formatDateHuman, getColombiaDateTime, formatDateTime12h } from '../utils/formato';
import { getAdvisors, getCierresCaja } from '../firebase';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  Building2, 
  DollarSign, 
  FileCheck,
  AlertCircle,
  Users,
  Search,
  Lock,
  Download,
  FileSpreadsheet
} from 'lucide-react';

interface ReportesProps {
  transactions: Transaction[];
  currentUser: User;
}

export default function Reportes({ transactions, currentUser }: ReportesProps) {
  const todayStr = getColombiaDateTime().dateStr;

  // Filters State
  const [startDate, setStartDate] = useState(''); // start with empty to auto-detect once active transactions loaded
  const [endDate, setEndDate] = useState('');
  const [sedeFilter, setSedeFilter] = useState<Sede | 'Todas'>(
    currentUser.role === 'Cajera' && currentUser.sede ? currentUser.sede : 'Todas'
  );
  const [minVal, setMinVal] = useState('');
  const [maxVal, setMaxVal] = useState('');

  // Advisor Specific Filters and Variables
  const [asesorDate, setAsesorDate] = useState('');
  const [asesorSede, setAsesorSede] = useState<Sede | 'Todas'>('Todas');
  const [asesorSearchQuery, setAsesorSearchQuery] = useState('');
  const [asesorNameFilter, setAsesorNameFilter] = useState<string>(
    currentUser.role === 'Asesor' ? currentUser.nombre : 'Todos'
  );
  const [asesorStatusFilter, setAsesorStatusFilter] = useState<'Todas' | 'Conciliado' | 'Pendiente'>('Todas');

  // Automatically update the date range once active transactions are loaded/refreshed
  useEffect(() => {
    if (transactions.length > 0 && (!startDate || !endDate)) {
      const active = transactions.filter(t => !t.esHistorico && (currentUser.role !== 'Cajera' || t.sede === currentUser.sede));
      if (active.length > 0) {
        const minDate = active.reduce((min, t) => t.fecha < min ? t.fecha : min, active[0].fecha);
        const maxDate = active.reduce((max, t) => t.fecha > max ? t.fecha : max, active[0].fecha);
        setStartDate(prev => prev || minDate);
        setEndDate(prev => prev || maxDate);
      } else {
        setStartDate(prev => prev || todayStr);
        setEndDate(prev => prev || todayStr);
      }
    }
  }, [transactions, currentUser.role, currentUser.sede]);

  // Active non-archived transactions
  const activeTxs = transactions.filter(t => !t.esHistorico);

  // Filter transactions matching criteria
  const filteredTxs = activeTxs.filter(tx => {
    // Secure lockdown: Cajera can NEVER see transactions of other branches in reports
    if (currentUser.role === 'Cajera' && tx.sede !== currentUser.sede) {
      return false;
    }

    // Date filter matching
    if (startDate && tx.fecha < startDate) return false;
    if (endDate && tx.fecha > endDate) return false;

    // Sede filter matching
    if (sedeFilter !== 'Todas' && tx.sede !== sedeFilter) return false;

    // Min value filter
    if (minVal && tx.valor < parseFloat(minVal)) return false;

    // Max value filter
    if (maxVal && tx.valor > parseFloat(maxVal)) return false;

    return true;
  });

  // KPI Calculations
  // 1. Total Daily transfers (Specifically for today or the selected startDate if it's single-day, or the entire period if it's not)
  const isSingleDay = startDate === endDate;
  const targetDateForDaily = startDate || todayStr;
  
  const dailyTransfers = activeTxs.filter(tx => {
    if (currentUser.role === 'Cajera' && tx.sede !== currentUser.sede) return false;
    if (isSingleDay) {
      return tx.fecha === targetDateForDaily;
    } else {
      return tx.fecha >= startDate && tx.fecha <= endDate;
    }
  });
  const totalDailyValue = dailyTransfers.reduce((acc, current) => acc + current.valor, 0);

  // 2. Consolidated Filtered Sums
  const totalFilteredValue = filteredTxs.reduce((acc, current) => acc + current.valor, 0);
  const totalFilteredIdentified = filteredTxs.filter(t => t.identificada).reduce((acc, t) => acc + t.valor, 0);
  const totalFilteredPending = filteredTxs.filter(t => !t.identificada).reduce((acc, t) => acc + t.valor, 0);

  // Percent of reconciliation
  const countFiltered = filteredTxs.length;
  const countIdentified = filteredTxs.filter(t => t.identificada).length;
  const pctIdentified = countFiltered > 0 ? Math.round((countIdentified / countFiltered) * 100) : 0;

  // Sede Aggregations (Guayabal vs Sabaneta vs Naranjal)
  const calculateSedeVolume = (sede: Sede) => {
    const list = filteredTxs.filter(tx => tx.sede === sede);
    const sum = list.reduce((acc, curr) => acc + curr.valor, 0);
    return { count: list.length, sum };
  };

  const guayabalAggr = calculateSedeVolume('Guayabal');
  const sabanetaAggr = calculateSedeVolume('Sabaneta');
  const naranjalAggr = calculateSedeVolume('Naranjal');
  const dscAggr = calculateSedeVolume('Desconocida');

  const maxBranchVal = Math.max(guayabalAggr.sum, sabanetaAggr.sum, naranjalAggr.sum, dscAggr.sum, 1);

  // Advisor Aggregations
  const advisorStats = getAdvisors().map(adv => {
    const list = filteredTxs.filter(tx => tx.identificada && tx.asesor === adv);
    const sum = list.reduce((acc, curr) => acc + curr.valor, 0);
    return { name: adv, count: list.length, total: sum };
  }).sort((a, b) => b.total - a.total);

  // Advisor Specific Variables and Filtering Logic
  const advisorsList = getAdvisors();
  
  // Filter active transactions for the personal metrics, respecting active filters (date, branch, search)
  const myFilteredActiveTxs = activeTxs.filter(tx => {
    // Must belong to the current logged in advisor
    if (tx.asesor !== currentUser.nombre) return false;

    // Respect date filter
    if (asesorDate && tx.fecha !== asesorDate) return false;

    // Respect Sede filter
    if (asesorSede !== 'Todas' && tx.sede !== asesorSede) return false;

    // Respect search query
    if (asesorSearchQuery.trim()) {
      const q = asesorSearchQuery.toLowerCase();
      const matchValor = tx.valor.toString().includes(q);
      const matchDesc = tx.descripcion.toLowerCase().includes(q);
      const matchCuenta = tx.cuenta.toLowerCase().includes(q);
      if (!matchValor && !matchDesc && !matchCuenta) return false;
    }

    return true;
  });

  // Calculate my performance metrics (for the logged in advisor, or overall) based on current filtered state
  const myTotalValidatedCount = myFilteredActiveTxs.filter(t => t.identificada).length;
  const myTotalValidatedAmount = myFilteredActiveTxs.filter(t => t.identificada).reduce((sum, t) => sum + t.valor, 0);
  const myTotalPendingCount = myFilteredActiveTxs.filter(t => !t.identificada).length;

  const advisorFilteredTxs = activeTxs.filter(tx => {
    // 1. Date filter matching (Exact day search or YYYY-MM-DD match)
    if (asesorDate && tx.fecha !== asesorDate) return false;

    // 2. Sede filter matching
    if (asesorSede !== 'Todas' && tx.sede !== asesorSede) return false;

    // 3. Status filter matching
    if (asesorStatusFilter === 'Conciliado' && !tx.identificada) return false;
    if (asesorStatusFilter === 'Pendiente' && tx.identificada) return false;

    // 4. Advisor name filter matching
    if (asesorNameFilter !== 'Todos' && tx.asesor !== asesorNameFilter) return false;

    // 5. Search query (by value or description or account or advisor name)
    if (asesorSearchQuery.trim()) {
      const q = asesorSearchQuery.toLowerCase();
      const matchValor = tx.valor.toString().includes(q);
      const matchDesc = tx.descripcion.toLowerCase().includes(q);
      const matchAsesor = (tx.asesor || '').toLowerCase().includes(q);
      const matchCuenta = tx.cuenta.toLowerCase().includes(q);
      if (!matchValor && !matchDesc && !matchAsesor && !matchCuenta) return false;
    }

    return true;
  });

  const handleDescargarExcel = () => {
    try {
      const activeCierres = getCierresCaja();

      // 1. Filtered Transactions data
      const formattedTxs = filteredTxs.map(tx => {
        // Find if there was a cash closing for this transaction's date and branch
        const matchingCierre = activeCierres.find(c => c.fecha === tx.fecha && c.sede === tx.sede);

        return {
          'Llave Única': tx.llaveUnica,
          'Fecha': tx.fecha,
          'Hora': tx.hora || 'No especificada',
          'Descripción': tx.descripcion,
          'Valor COP': tx.valor,
          'Banco Cuenta': tx.cuenta,
          'Sede Física': tx.sede,
          'Estado Conciliación': tx.identificada ? 'CONCILIADO' : 'PENDIENTE',
          'Asesor Responsable': tx.asesor || 'Ninguno',
          'Tipo Documento': tx.tipoDocumento || 'Ninguno',
          'Auxiliar Validación': tx.usuarioIdentificacion || 'Ninguno',
          'Fecha de Validación': tx.fechaIdentificacion || 'Ninguno',
          'Cierre Caja Declarado (Día/Sede)': matchingCierre ? matchingCierre.totalDeclarado : 'Sin Cierre Registrado',
          'Nombre Cajera Cierre': matchingCierre ? matchingCierre.nombreCajera : 'N/A'
        };
      });

      // 2. Filtered Daily Closures data
      const filteredCierres = activeCierres.filter(c => {
        if (sedeFilter !== 'Todas' && c.sede !== sedeFilter) return false;
        if (startDate && c.fecha < startDate) return false;
        if (endDate && c.fecha > endDate) return false;
        return true;
      });

      const formattedCierres = filteredCierres.map(c => {
        // Recalculate dynamic bank total for that date/sede
        const totalBancoCierre = transactions.filter(
          t => t.fecha === c.fecha && t.sede === c.sede && !t.esHistorico
        ).reduce((sum, tx) => sum + tx.valor, 0);
        const dif = c.totalDeclarado - totalBancoCierre;

        return {
          'Sede Física': c.sede,
          'Fecha Cierre': c.fecha,
          'Nombre Cajera': c.nombreCajera,
          'Monto Declarado (Caja Diaria Individual)': c.totalDeclarado,
          'Total Banco Recibido (Aplicativo)': totalBancoCierre,
          'Diferencia (Descuadre Caja)': dif,
          'Estado del Cuadre': dif === 0 ? 'CONCILIADO' : (dif > 0 ? 'SOBRANTE' : 'FALTANTE'),
          'Fecha Registro Real': c.fechaCreacion.replace('T', ' ').slice(0, 19)
        };
      });

      // Create worksheets and workbook
      const wsTxs = XLSX.utils.json_to_sheet(formattedTxs);
      const wsCierres = XLSX.utils.json_to_sheet(formattedCierres);
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, wsTxs, 'Movimientos_Filtrados');
      XLSX.utils.book_append_sheet(workbook, wsCierres, 'Cierres_de_Caja_Conciliados');

      // Add simple custom column widths to make things legible
      wsTxs['!cols'] = [
        { wch: 45 }, // Llave
        { wch: 12 }, // Fecha
        { wch: 18 }, // Hora
        { wch: 30 }, // Descripcion
        { wch: 16 }, // Valor
        { wch: 18 }, // Cuenta
        { wch: 15 }, // Sede
        { wch: 16 }, // Estado
        { wch: 20 }, // Asesor
        { wch: 15 }, // Documento
        { wch: 20 }, // Auxiliar
        { wch: 20 }, // Fecha Val
        { wch: 32 }, // Cierre Caja Declarado (Día/Sede)
        { wch: 25 }  // Nombre Cajera Cierre
      ];

      wsCierres['!cols'] = [
        { wch: 15 }, // Sede
        { wch: 15 }, // Fecha
        { wch: 25 }, // Cajera
        { wch: 30 }, // Monto Declarado
        { wch: 25 }, // Total Banco
        { wch: 22 }, // Diferencia
        { wch: 18 }, // Estado cuadre
        { wch: 20 }  // Fecha registro
      ];

      const ranDate = getColombiaDateTime().dateStr;
      XLSX.writeFile(workbook, `Reporte_Conciliatorio_Tesoreria_${ranDate}.xlsx`);
      alert(`¡Reporte Descargado Exitosamente!\nSe guardó el archivo con ${formattedTxs.length} transacciones y ${formattedCierres.length} cierres de caja conciliados.`);
    } catch (err) {
      console.error(err);
      alert('Error al generar el reporte Excel de Tesorería.');
    }
  };

  if (currentUser.role === 'Asesor') {
    return (
      <div id="reportes-module-asesor" className="p-6 md:p-10 max-w-7xl mx-auto space-y-6 font-sans">
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-3xl font-black text-[#1A2D7C] italic uppercase font-space tracking-tight flex items-center gap-3">
              <Search className="h-8 w-8 text-[#1A2D7C] stroke-[2.5]" />
              CONSULTA DE PAGOS <span className="text-slate-350">/ ASESOR</span>
            </h2>
            <p className="text-xs uppercase font-bold tracking-wider text-[#F47920] mt-1.5 font-mono">
              ESTADO DE APROBACIÓN DE RECAUDOS EN TIEMPO REAL
            </p>
          </div>
          <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-bold uppercase tracking-wider">
            Socio Comercial: <span className="text-[#1A2D7C]">{currentUser.nombre}</span>
          </div>
        </div>

        {/* Advisor Personal Stats Card ("Cómo llevas tus transferencias") */}
        <div id="advisor-personal-metrics" className="bg-gradient-to-br from-[#1A2D7C] to-indigo-950 text-white p-6 rounded-2xl shadow-xl border border-indigo-900/30">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <h3 className="text-xs uppercase font-black tracking-widest text-indigo-200 font-space flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#F47920]" />
              CÓMO LLEVAS TUS TRANSFERENCIAS
            </h3>
            <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase">RENDIMIENTO PERSONAL</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3.5">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <FileCheck className="h-6 w-6 text-emerald-400 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] text-indigo-200 block uppercase font-bold tracking-wide">PAGOS APROBADOS</span>
                <span className="text-2xl font-black font-space text-white">{myTotalValidatedCount}</span>
                <span className="text-[9px] text-emerald-400 block font-semibold mt-0.5 font-sans">Conciliados en caja</span>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3.5">
              <div className="p-3 bg-[#F47920]/20 text-[#F47920] rounded-xl">
                <DollarSign className="h-6 w-6 text-[#F47920] stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] text-indigo-200 block uppercase font-bold tracking-wide">TOTAL RECAUDADO (APROBADO)</span>
                <span className="text-2xl font-black font-space text-white">{formatCOP(myTotalValidatedAmount)}</span>
                <span className="text-[9px] text-[#F47920] block font-semibold mt-0.5 font-sans">Monto conciliado</span>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-3.5">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
                <AlertCircle className="h-6 w-6 text-amber-400 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] text-indigo-200 block uppercase font-bold tracking-wide">PAGOS PENDIENTES</span>
                <span className="text-2xl font-black font-space text-white">{myTotalPendingCount}</span>
                <span className="text-[9px] text-amber-400 block font-semibold mt-0.5 font-sans">En espera de validación</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel for Advisors */}
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs uppercase font-black tracking-widest text-[#1A2D7C] flex items-center gap-2 font-space">
            <Calendar className="h-4.5 w-4.5 text-[#F47920]" />
            FILTROS DE BÚSQUEDA Y CONSULTA
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Fecha de Pago (Día/Mes/Año)</label>
              <input
                id="input-asesor-date"
                type="date"
                value={asesorDate}
                onChange={(e) => setAsesorDate(e.target.value)}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-[#1A2D7C]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Sede Física</label>
              <select
                id="select-asesor-sede"
                value={asesorSede}
                onChange={(e) => setAsesorSede(e.target.value as Sede | 'Todas')}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-[#1A2D7C] uppercase"
              >
                <option value="Todas">Todas las sedes</option>
                <option value="Guayabal">Guayabal (***6519)</option>
                <option value="Sabaneta">Sabaneta (***0916)</option>
                <option value="Naranjal">Naranjal (***6807)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Asesor Comercial</label>
              <select
                id="select-asesor-name"
                value={asesorNameFilter}
                onChange={(e) => setAsesorNameFilter(e.target.value)}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-[#1A2D7C]"
              >
                <option value="Todos">Todos los Asesores</option>
                {advisorsList.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Estado de Aprobación</label>
              <select
                id="select-asesor-status"
                value={asesorStatusFilter}
                onChange={(e) => setAsesorStatusFilter(e.target.value as any)}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-[#1A2D7C]"
              >
                <option value="Todas">Todos los Estados</option>
                <option value="Conciliado">Aprobado / Conciliado</option>
                <option value="Pendiente">Pendiente de Conciliación</option>
              </select>
            </div>
          </div>

          {/* Lupa / Search box by text or amount */}
          <div className="relative pt-2">
            <label className="block text-[10px] font-bold text-slate-600 mb-1.5">Búsqueda rápida (Lupa)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                id="input-asesor-search"
                type="text"
                value={asesorSearchQuery}
                onChange={(e) => setAsesorSearchQuery(e.target.value)}
                placeholder="Busca por saldo / monto exacto (ej. 250000), banco, o descripción..."
                className="w-full pl-10 text-xs font-bold p-3 border border-slate-300 rounded-xl focus:outline-none focus:border-[#1A2D7C] placeholder:text-slate-400 placeholder:font-normal"
              />
              {asesorSearchQuery && (
                <button
                  onClick={() => setAsesorSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs uppercase font-black tracking-widest text-[#1A2D7C] font-space flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-[#F47920]" />
              PAGOS REGISTRADOS EN SISTEMA ({advisorFilteredTxs.length})
            </h4>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Sincronizado</span>
          </div>

          <div className="overflow-x-auto">
            {advisorFilteredTxs.length === 0 ? (
              <div className="p-12 text-center">
                <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-500 italic">No se encontraron transferencias con los filtros aplicados.</p>
                <p className="text-[10px] text-slate-400 mt-1">Prueba cambiando el día, la sede, o reduciendo el término de búsqueda.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-[10px] font-black uppercase text-slate-400 bg-slate-50/50">
                    <th className="p-4 font-space">Sede</th>
                    <th className="p-4 font-space">Fecha & Hora</th>
                    <th className="p-4 font-space">Banco/Cuenta</th>
                    <th className="p-4 font-space">Monto / Saldo</th>
                    <th className="p-4 font-space">Asesor Responsable</th>
                    <th className="p-4 font-space text-center">Estado Aprobación</th>
                    <th className="p-4 font-space">Descripción / Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {advisorFilteredTxs.map((tx) => {
                    const isMyTx = tx.asesor === currentUser.nombre;
                    return (
                      <tr 
                        key={tx.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isMyTx ? 'bg-indigo-50/20' : ''
                        }`}
                      >
                        <td className="p-4">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${
                            tx.sede === 'Guayabal' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            tx.sede === 'Sabaneta' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                            tx.sede === 'Naranjal' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                            'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {tx.sede}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-slate-700">
                          <div>{formatDateHuman(tx.fecha)}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.hora || 'No registrada'}</div>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-600">
                          {tx.cuenta}
                        </td>
                        <td className="p-4 font-black text-slate-900 font-mono text-sm">
                          {formatCOP(tx.valor)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold ${isMyTx ? 'text-indigo-850' : 'text-slate-750'}`}>
                              {tx.asesor || 'No asignado'}
                            </span>
                            {isMyTx && (
                              <span className="bg-[#1A2D7C] text-white text-[8px] font-black uppercase px-1 rounded">
                                Tú
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {tx.identificada ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                APROBADO
                              </span>
                              {tx.usuarioIdentificacion && (
                                <div className="text-[8.5px] text-slate-500 mt-1 font-semibold leading-tight text-center">
                                  <div>Por: {tx.usuarioIdentificacion}</div>
                                  {tx.fechaIdentificacion && (
                                    <div className="text-[#1A2D7C] font-mono font-bold mt-0.5 text-[8.5px] uppercase">
                                      {formatDateTime12h(tx.fechaIdentificacion)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-amber-200 shadow-sm">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                              PENDIENTE
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 text-xs font-medium max-w-xs truncate" title={tx.descripcion}>
                          <div>{tx.descripcion}</div>
                          {tx.tipoDocumento && (
                            <span className="inline-block mt-1 bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-150">
                              Doc: {tx.tipoDocumento}
                            </span>
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
    );
  }

  return (
    <div id="reportes-module" className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-black text-[#1A2D7C] italic uppercase font-space tracking-tight flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-[#1A2D7C] stroke-[2.5]" />
            CONSOLIDACIÓN ANALÍTICA <span className="text-slate-350">/ DE CAJAS</span>
          </h2>
          <p className="text-xs uppercase font-bold tracking-wider text-[#F47920] mt-1.5 font-mono">
            MONITOR DE EFICACIA CONCILIARIA Y RENDIMIENTO EN TIEMPO REAL
          </p>
        </div>

        {/* Excel Export Button */}
        {(currentUser.role === 'Admin' || currentUser.role === 'Tesorera') && (
          <button
            id="btn-export-tesoreria-excel"
            onClick={handleDescargarExcel}
            className="flex items-center gap-2 bg-[#1A2D7C] hover:bg-[#1A2D7C]/95 text-white py-3 px-6 rounded-2xl text-xs uppercase tracking-widest font-black font-space transition-all cursor-pointer shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            <FileSpreadsheet className="h-4.5 w-4.5 text-white stroke-[2.5]" />
            <span>Descargar Informe Consolidado</span>
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
        <h3 className="text-xs uppercase font-black tracking-widest text-[#1A2D7C] mb-4 flex items-center gap-2 font-space">
          <Calendar className="h-4.5 w-4.5 text-[#F47920]" />
          GENERAL FILTROS DE CONSULTA
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Fecha de Inicio</label>
            <input
              id="input-rep-startdate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:border-[#1A2D7C]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Fecha de Fin</label>
            <input
              id="input-rep-enddate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:border-[#1A2D7C]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Sede Física</label>
            {currentUser.role === 'Cajera' ? (
              <div className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-100 text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
                <Lock className="h-3 w-3 text-[#1A2D7C]" />
                <span>{currentUser.sede}</span>
              </div>
            ) : (
              <select
                id="select-rep-sede"
                value={sedeFilter}
                onChange={(e) => setSedeFilter(e.target.value as Sede | 'Todas')}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:border-[#1A2D7C]"
              >
                <option value="Todas">Todas las sedes</option>
                <option value="Guayabal">Guayabal (***6519)</option>
                <option value="Sabaneta">Sabaneta (***0916)</option>
                <option value="Naranjal">Naranjal (***6807)</option>
                <option value="Desconocida">Sedes Desconocidas</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Valor Mínimo COP</label>
            <input
              id="input-rep-minval"
              type="number"
              placeholder="Ej: 50000"
              value={minVal}
              onChange={(e) => setMinVal(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:border-[#1A2D7C]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Valor Máximo COP</label>
            <input
              id="input-rep-maxval"
              type="number"
              placeholder="Ej: 2000000"
              value={maxVal}
              onChange={(e) => setMaxVal(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:border-[#1A2D7C]"
            />
          </div>
        </div>
      </div>

      {/* KPI Rows */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Recuadro Obligatorio: "Total transferencias del día" */}
        <div id="kpi-daily-transfers" className="bg-[#1A2D7C] text-white p-6 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/5 blur-lg"></div>
          
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black text-indigo-200 tracking-widest font-space">CIERRE DE CONCILIACIÓN</span>
              <span className="bg-[#F47920] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded font-space">Requerido</span>
            </div>
            <h4 className="text-lg font-black uppercase italic font-space text-white mt-1">Caja Diaria {isSingleDay ? 'Individual' : 'Período'}</h4>
            <p className="text-[10px] text-slate-300 font-mono mt-0.5 uppercase tracking-wide">Fecha: {formatDateHuman(targetDateForDaily)}</p>
          </div>

          <div className="mt-6 mb-2">
            <span className="text-3xl font-black font-space tracking-tight text-white block">
              {formatCOP(totalDailyValue)}
            </span>
            <span className="text-[10px] text-indigo-200 mt-1.5 block uppercase tracking-wider font-bold">
              CON ADMISIÓN DE {dailyTransfers.length} INGRESOS REGISTRADOS
            </span>
          </div>

          <div className="border-t border-white/10 pt-3 mt-3 flex items-center justify-between text-[10px] text-slate-300 font-bold uppercase tracking-wider font-space">
            <span>Identificadas: {dailyTransfers.filter(t => t.identificada).length}</span>
            <span>Pendientes: {dailyTransfers.filter(t => !t.identificada).length}</span>
          </div>
        </div>

        {/* Consolidado Filtrado KPI */}
        <div id="kpi-consolidated-filtered" className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase font-black tracking-widest font-space">BAJO FILTROS ACTIVOS</span>
              <DollarSign className="h-4.5 w-4.5 text-[#1A2D7C] stroke-[2.5]" />
            </div>
            <h4 className="text-lg font-black uppercase italic font-space text-slate-900 mt-1">Suma Consolidada</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Suma de las transferencias listadas</p>
          </div>

          <div className="my-4">
            <span className="text-3xl font-black text-[#1A2D7C] font-space block leading-none">
              {formatCOP(totalFilteredValue)}
            </span>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200 text-[10px] uppercase tracking-wider font-bold font-space">
              <div>
                <span className="text-emerald-600 block">Identificados</span>
                <span className="font-mono text-slate-700">{formatCOP(totalFilteredIdentified)}</span>
              </div>
              <div>
                <span className="text-[#F47920] block">Pendientes</span>
                <span className="font-mono text-slate-700">{formatCOP(totalFilteredPending)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* reconciliation rate KPI */}
        <div id="kpi-reconciliation-rate" className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase font-black tracking-widest font-space">EFICACIA CONCILIARIA</span>
              <FileCheck className="h-4.5 w-4.5 text-emerald-500 stroke-[2.5]" />
            </div>
            <h4 className="text-lg font-black uppercase italic font-space text-slate-900 mt-1">Sincronización</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Porcentaje de transacciones identificadas</p>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-emerald-600 font-space leading-none">{pctIdentified}%</span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-black font-space">({countIdentified} de {countFiltered})</span>
            </div>
            
            {/* Visual Progress bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full mt-4 overflow-hidden border border-slate-200">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${pctIdentified}%` }}
              ></div>
            </div>
          </div>
        </div>

      </div>

      {/* Graphical section / Branch distribution */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Branch distribution bar density */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-xs uppercase font-black tracking-widest text-[#1A2D7C] flex items-center gap-1.5 font-space">
              <Building2 className="h-4.5 w-4.5 text-[#F47920]" />
              PARTICIPACIÓN POR SEDE FISICA
            </h4>
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">FLUJO FILTRADO</span>
          </div>

          <div className="space-y-4 pt-2">
            {/* Sede Guayabal Bar */}
            {(currentUser.role !== 'Cajera' || currentUser.sede === 'Guayabal') && (
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide font-space">
                  <span>Guayabal (***6519)</span>
                  <span className="font-mono text-slate-800">{formatCOP(guayabalAggr.sum)} ({guayabalAggr.count} txs)</span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-sm overflow-hidden border border-slate-250">
                  <div 
                    className="h-full bg-indigo-600"
                    style={{ width: `${(guayabalAggr.sum / maxBranchVal) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Sede Sabaneta Bar */}
            {(currentUser.role !== 'Cajera' || currentUser.sede === 'Sabaneta') && (
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide font-space">
                  <span>Sabaneta (***0916)</span>
                  <span className="font-mono text-slate-800">{formatCOP(sabanetaAggr.sum)} ({sabanetaAggr.count} txs)</span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-sm overflow-hidden border border-slate-250">
                  <div 
                    className="h-full bg-orange-500"
                    style={{ width: `${(sabanetaAggr.sum / maxBranchVal) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Sede Naranjal Bar */}
            {(currentUser.role !== 'Cajera' || currentUser.sede === 'Naranjal') && (
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide font-space">
                  <span>Naranjal (***6807)</span>
                  <span className="font-mono text-slate-800">{formatCOP(naranjalAggr.sum)} ({naranjalAggr.count} txs)</span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-sm overflow-hidden border border-slate-250">
                  <div 
                    className="h-full bg-teal-500"
                    style={{ width: `${(naranjalAggr.sum / maxBranchVal) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Unknown source */}
            {currentUser.role !== 'Cajera' && dscAggr.sum > 0 && (
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide font-space">
                  <span>Sin Sede Definida</span>
                  <span className="font-mono text-slate-850">{formatCOP(dscAggr.sum)} ({dscAggr.count} txs)</span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-sm overflow-hidden border border-slate-250">
                  <div 
                    className="h-full bg-slate-400"
                    style={{ width: `${(dscAggr.sum / maxBranchVal) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Advisers table consolidated */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-xs uppercase font-black tracking-widest text-[#1A2D7C] flex items-center gap-1.5 font-space">
              <Users className="h-4.5 w-4.5 text-[#F47920]" />
              RENDIMIENTO DE ASESORES
            </h4>
            <span className="text-[10px] uppercase font-bold text-[#F47920] font-mono">CONCILIACIONES</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-2.5 font-space">Asesor Comercial</th>
                  <th className="py-2.5 text-center font-space">Pagos Validados</th>
                  <th className="py-2.5 text-right font-space">Monto Recaudado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {advisorStats.map((adv, i) => (
                  <tr key={adv.name} className="hover:bg-slate-50">
                    <td className="py-3 font-space font-bold text-slate-700 flex items-center gap-2">
                      <span className="text-[10px] font-black bg-slate-150 text-slate-800 rounded h-5.5 w-5.5 flex items-center justify-center border border-slate-300">
                        {i + 1}
                      </span>
                      {adv.name}
                    </td>
                    <td className="py-3 text-center text-slate-600 font-mono font-bold text-xs">
                      {adv.count}
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900 font-mono text-sm">
                      {formatCOP(adv.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
