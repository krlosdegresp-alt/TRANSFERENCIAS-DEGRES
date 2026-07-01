import React, { useState, useRef, useEffect } from 'react';
import { uploadBankTransactions, getTransactions, getUploadBatches, revertUploadBatch, subscribeToDatabase } from '../firebase';
import { parseExcelBankFile, esMovimientoIrrelevante, detectarSede } from '../utils/parser-excel';
import JSZip from 'jszip';
import { formatCOP, formatDateHuman } from '../utils/formato';
import { Transaction, Sede, User, UploadBatch } from '../types';
import { 
  FileSpreadsheet, 
  Upload, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  HelpCircle,
  Sparkles,
  Info,
  History,
  Calendar,
  User as UserIcon,
  XCircle,
  RefreshCw,
  X,
  Lock,
  Check
} from 'lucide-react';


interface CargaProps {
  currentUser: User;
  onRefreshData: () => void;
}

export default function Carga({ currentUser, onRefreshData }: CargaProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetSede, setTargetSede] = useState<Sede>('Desconocida');
  const [parsedQueue, setParsedQueue] = useState<Transaction[]>([]);
  const [uploadSummary, setUploadSummary] = useState<{ imported: number; duplicates: number } | null>(null);
  const [batches, setBatches] = useState<UploadBatch[]>(getUploadBatches());
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Subscribe to updates so that local batches are always updated reactively
  useEffect(() => {
    setBatches(getUploadBatches());
    const unsubscribe = subscribeToDatabase(() => {
      setBatches(getUploadBatches());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Global drag-and-drop listener to allow drop ANYWHERE on the screen
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(true);
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only deactivate if leaving the browser viewport
      if (e.clientX === 0 && e.clientY === 0) {
        setDragActive(false);
      }
    };

    const handleGlobalDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleParseFile(e.dataTransfer.files[0]);
      }
    };

    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('dragleave', handleGlobalDragLeave);
    window.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('dragleave', handleGlobalDragLeave);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, [targetSede]);

  // Local drop handler as backup
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadSummary(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleParseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadSummary(null);
    if (e.target.files && e.target.files[0]) {
      handleParseFile(e.target.files[0]);
    }
  };

  const handleParseFile = async (file: File) => {
    setLoading(true);
    setParsedQueue([]);
    setUploadSummary(null);

    try {
      let buffer: ArrayBuffer;
      let finalFile = file;

      // Check if file is a ZIP archive
      if (file.name.toLowerCase().endsWith('.zip')) {
        const zip = new JSZip();
        const arrayBuffer = await file.arrayBuffer();
        const loadedZip = await zip.loadAsync(arrayBuffer);
        
        // Find the first excel or csv file in the zip
        const targetFileKey = Object.keys(loadedZip.files).find(key => {
          const lower = key.toLowerCase();
          return (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) && !key.includes('__MACOSX');
        });

        if (!targetFileKey) {
          throw new Error('No se encontró ningún archivo de Excel (.xlsx, .xls) o CSV dentro del archivo ZIP de la carpeta del banco.');
        }

        const zipFile = loadedZip.files[targetFileKey];
        const extractedBuffer = await zipFile.async('arraybuffer');
        const extractedFileName = zipFile.name.split('/').pop() || zipFile.name;
        
        buffer = extractedBuffer;
        
        // Simulate a real File object for the preview representation
        finalFile = new File([extractedBuffer], extractedFileName, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
      } else {
        buffer = await file.arrayBuffer();
      }

      setSelectedFile(finalFile);

      // Parse spreadsheet using the custom parser
      const list = parseExcelBankFile(buffer, targetSede);
      setParsedQueue(list);
    } catch (err: any) {
      console.error('Error parsing spreadsheet file', err);
      const msg = err?.message || 'Asegúrate de subir un archivo de formato .xlsx, .xls, .csv o un .zip válido.';
      triggerAlert('Error de Lectura', `Error al leer el archivo: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCommitQueue = () => {
    if (parsedQueue.length === 0) return;

    // Trigger upload with duplication filter, passing real filename
    const res = uploadBankTransactions(parsedQueue, currentUser.nombre, selectedFile?.name || 'archivo_movimientos.xlsx');
    setUploadSummary(res);
    setParsedQueue([]);
    setSelectedFile(null);
    setBatches(getUploadBatches()); // Update local file upload history
    onRefreshData();
  };

  const handleDeleteBatch = (batchId: string, fileName: string) => {
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Tesorera') {
      triggerAlert('Acceso Denegado', 'Solo la Tesorera o el Administrador pueden eliminar archivos cargados.', 'error');
      return;
    }
    triggerConfirm(
      'Eliminar Archivo',
      `¿Estás seguro de que deseas eliminar la carga del archivo "${fileName}"?\n\nEsta acción removerá de forma segura todas las transacciones importadas por este archivo que aún se encuentren en el sistema.`,
      () => {
        const success = revertUploadBatch(batchId, currentUser.nombre);
        if (success) {
          triggerAlert('Archivo Eliminado', `¡Archivo "${fileName}" eliminado!\nSe removieron las transacciones asociadas de la base de datos.`, 'success');
          setBatches(getUploadBatches()); // Refresh local batch view
          onRefreshData(); // Refresh app data
        } else {
          triggerAlert('Error', 'No se pudo encontrar o revertir el archivo cargado.', 'error');
        }
      },
      'danger'
    );
  };

  const handleClearQueue = () => {
    setParsedQueue([]);
    setSelectedFile(null);
  };


  return (
    <div id="carga-module" className="p-6 md:p-10 max-w-7xl mx-auto space-y-6 relative">
      {/* Global Drag and Drop Overlay */}
      {dragActive && (
        <div 
          className="fixed inset-0 bg-[#1A2D7C]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center text-white p-6 transition-all duration-300"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleParseFile(e.dataTransfer.files[0]);
            }
          }}
        >
          <div className="bg-white/10 p-8 rounded-full border-2 border-dashed border-white/40 mb-6 animate-bounce">
            <Upload className="h-16 w-16 text-white stroke-[2]" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight font-space text-center">¡Suelta tu archivo aquí!</h2>
          <p className="text-white/80 mt-2 text-center max-w-md font-medium text-sm leading-relaxed">
            Puedes soltar tu archivo de Excel, CSV o un archivo comprimido <strong className="text-[#F47920] font-black font-mono bg-white/10 px-1.5 py-0.5 rounded">.ZIP</strong> en cualquier parte de la pantalla. Extraeremos y analizaremos los movimientos automáticamente.
          </p>
        </div>
      )}

      {/* Module Title */}
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-3xl font-black text-[#1A2D7C] italic uppercase font-space tracking-tight flex items-center gap-3">
          <Upload className="h-8 w-8 text-[#1A2D7C] stroke-[2.5]" />
          CARGA DE EXTRACTOS <span className="text-slate-350">/ BANCARIOS</span>
        </h2>
        <p className="text-xs uppercase font-bold tracking-wider text-[#F47920] mt-1.5 font-mono">
          INGESTA Y PROCESAMIENTO AUTOMÁTICO DE SUCURSALES FISICAS
        </p>
      </div>

      {uploadSummary && (
        <div id="upload-success-banner" className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-200 flex items-start gap-4">
          <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-black text-emerald-900 text-sm uppercase tracking-wider font-space">¡Archivo Procesado e Ingerido Correctamente!</h4>
            <p className="text-emerald-700 text-xs mt-1">
              La base de datos de transferencias en tiempo real de Firestore se actualizó con los siguientes resultados:
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider font-space">
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded">
                ✓ {uploadSummary.imported} Nuevos movimientos guardados
              </span>
              <span className={`px-3 py-1 rounded ${uploadSummary.duplicates > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                ⚠ {uploadSummary.duplicates} Duplicados detectados y omitidos
              </span>
            </div>
            <p className="text-slate-500 text-[10px] mt-2.5 font-mono uppercase">
              * El sistema genera una llave única combinando (cuenta+fecha+hora+valor+descripción) previniendo cualquier duplicación involuntaria.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left pane: File drag and drop + presets */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
            <h3 className="text-xs uppercase font-black tracking-widest text-[#1A2D7C] mb-4 font-space">PARÁMETROS DE IMPORTACIÓN</h3>
            
            {/* Sede selector override */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Forzar Identificación de Sede (Opcional):
              </label>
              <select
                id="select-override-sede"
                value={targetSede}
                onChange={(e) => setTargetSede(e.target.value as Sede)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:border-[#1A2D7C] outline-none"
              >
                <option value="Desconocida">Detectar por cuenta automáticamente</option>
                <option value="Guayabal">Guayabal (Forzar cuenta ***6519)</option>
                <option value="Sabaneta">Sabaneta (Forzar cuenta ***0916)</option>
                <option value="Naranjal">Naranjal (Forzar cuenta ***6807)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Si el Excel no contiene columnas que identifiquen la cuenta o sede, selecciona una sede para asignarla a todos los créditos.
              </p>
            </div>

            {/* Drag & Drop Canvas */}
            <div
              id="drag-drop-zone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-[#1A2D7C] bg-blue-50/50' 
                  : 'border-slate-300 hover:border-[#1A2D7C]/60 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.zip"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-slate-100 rounded-full text-slate-600 group-hover:bg-[#1A2D7C]/10">
                  <FileSpreadsheet className="h-6 w-6 text-[#1A2D7C]" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Sube un archivo Excel (.xlsx, .xls), CSV o ZIP
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Arrastra aquí (¡o en cualquier parte de la pantalla!) o haz click para explorar
                  </p>
                </div>
              </div>
            </div>

            {selectedFile && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  id="btn-delete-uploaded"
                  onClick={handleClearQueue}
                  className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                  title="Eliminar archivo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Parser Queue Preview before committing */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col justify-between">
            <div>
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">Vista Previa de Registros a Guardar</h3>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {parsedQueue.length} Registros parsed
                  </span>
                </div>
                {parsedQueue.length > 0 && (
                  <button
                    id="btn-clear-queue-preview"
                    onClick={handleClearQueue}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Descartar Todo
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-3">
                  <Loader2 className="h-8 w-8 text-[#1A2D7C] animate-spin" />
                  <p className="text-xs font-semibold text-slate-500">Analizando el archivo de movimientos del banco...</p>
                </div>
              ) : parsedQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center text-slate-400">
                  <FileSpreadsheet className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-xs font-semibold">No hay ningún archivo cargado en cola</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Usa el panel de la izquierda para arrastrar o examinar el archivo de extracto de la cuenta de ahorros empresarial de Bancolombia.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[360px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[9px] border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-3">Sede Detectada</th>
                        <th className="p-3">Fecha/Hora</th>
                        <th className="p-3">Descripción</th>
                        <th className="p-3 text-right">Valor COP</th>
                        <th className="p-3">Cuenta Asoc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedQueue.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.sede === 'Guayabal' ? 'bg-indigo-50 text-indigo-700' :
                              tx.sede === 'Sabaneta' ? 'bg-orange-50 text-orange-700' :
                              tx.sede === 'Naranjal' ? 'bg-teal-50 text-teal-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {tx.sede}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 font-mono">
                            <div>{formatDateHuman(tx.fecha)}</div>
                            {tx.hora && <div className="text-[9px]">{tx.hora}</div>}
                          </td>
                          <td className="p-3 font-medium text-slate-700 truncate max-w-[140px]" title={tx.descripcion}>
                            {tx.descripcion}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-600 font-mono">
                            {formatCOP(tx.valor)}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[10px]">
                            {tx.cuenta}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {parsedQueue.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                  <Info className="h-3.5 w-3.5 text-[#1A2D7C]" />
                  <span>Se filtrarán duplicados e impuestos antes de insertar.</span>
                </div>
                <button
                  id="btn-commit-to-firestore"
                  onClick={handleCommitQueue}
                  className="w-full sm:w-auto bg-[#1A2D7C] hover:bg-[#1A2D7C]/90 text-white font-bold text-xs py-2 px-5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirmar y Registrar en Firestore
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historial de Excels Cargados */}
      <div id="historial-cargas-section" className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
          <div>
            <h3 className="text-sm font-black text-[#1A2D7C] uppercase font-space tracking-wider flex items-center gap-2">
              <History className="h-5 w-5 text-[#F47920]" />
              Historial de Archivos Cargados (Auditoría de Ingestas)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Monitorea los Excels procesados en el sistema. Puedes eliminar un archivo cargado repetido para remover automáticamente sus movimientos.
            </p>
          </div>
          <button
            onClick={() => {
              setBatches(getUploadBatches());
            }}
            className="self-end sm:self-auto flex items-center gap-1.5 text-[11px] font-bold text-[#1A2D7C] bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors uppercase tracking-wider cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            Actualizar Historial
          </button>
        </div>

        {batches.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto stroke-[1.5] mb-2" />
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">No se han registrado cargas</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Sube extractos en el panel superior para comenzar el seguimiento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#1A2D7C]/5 text-[#1A2D7C] uppercase font-black text-[9px] border-b border-slate-150">
                <tr>
                  <th className="p-4 rounded-tl-xl">Nombre del Archivo</th>
                  <th className="p-4">Fecha de Carga</th>
                  <th className="p-4">Usuario</th>
                  <th className="p-4 text-center">Registros Leídos</th>
                  <th className="p-4 text-center">Nuevos Ingeridos</th>
                  <th className="p-4 text-center">Duplicados Omitidos</th>
                  <th className="p-4 text-center rounded-tr-xl">Acciones de Limpieza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => {
                  const canDelete = currentUser.role === 'Admin' || currentUser.role === 'Tesorera';

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-850 min-w-[220px] break-all">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0" />
                          <span title={batch.nombreArchivo} className="whitespace-normal">
                            {batch.nombreArchivo}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-500 font-medium">
                        {batch.fechaCarga}
                      </td>
                      <td className="p-4 text-slate-650 font-bold">
                        <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
                          {batch.usuario}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-600">
                        {batch.totalLeidos}
                      </td>
                      <td className="p-4 text-center font-mono">
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded font-bold border border-emerald-150">
                          +{batch.totalImportados}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono">
                        <span className={`px-2.5 py-0.5 rounded font-bold border ${
                          batch.totalDuplicados > 0 
                            ? 'bg-amber-50 text-amber-700 border-amber-150' 
                            : 'bg-slate-50 text-slate-400 border-slate-150'
                        }`}>
                          {batch.totalDuplicados}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {canDelete ? (
                          <button
                            onClick={() => handleDeleteBatch(batch.id, batch.nombreArchivo)}
                            className="bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-650 font-black uppercase text-[9px] tracking-wider py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Eliminar e Invertir</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic flex items-center justify-center gap-1 font-medium">
                            <Lock className="h-3.5 w-3.5 text-slate-450" />
                            Sin privilegios
                          </span>
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
