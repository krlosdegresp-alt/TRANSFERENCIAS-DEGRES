import * as XLSX from 'xlsx';
import { Transaction, Sede, CierreCaja } from '../types';
import { generarLlaveUnica } from './llave-unica';

/**
 * Parses numeric strings formatted with Colombian conventions (dots for thousands, commas for decimals).
 * It preserves the exact decimal value safely.
 */
export function parseColombianNumber(val: any): number {
  if (val === undefined || val === null) return NaN;
  if (typeof val === 'number') return val;

  // Remove currency symbols, common letters, and spaces
  let str = String(val).trim().replace(/[$\s]/g, '');
  if (!str) return NaN;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    const commaIndex = str.lastIndexOf(',');
    const dotIndex = str.lastIndexOf('.');
    if (commaIndex > dotIndex) {
      // Comma is the decimal separator (e.g. "1.500.250,50")
      str = str.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // Dot is the decimal separator (e.g. "1,500,250.50")
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only commas exist. Check if it looks like a decimal separator or thousands
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(/,/g, '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasDot) {
    // Only dots exist. E.g., "1.500.000" or "1500.50"
    const parts = str.split('.');
    if (parts.length > 2) {
      // e.g. "1.500.000"
      str = str.replace(/\./g, '');
    } else {
      // Single dot. E.g. "1250.50" or "1.500"
      const afterDot = parts[1];
      if (afterDot.length === 3) {
        str = str.replace(/\./g, '');
      } else {
        // Keep the dot as decimal
      }
    }
  }

  return parseFloat(str);
}

/**
 * Normalizes dates parsed from Excel. Handles:
 * - YYYYMMDD format without separators (e.g., 20260617)
 * - Excel serial date numbers (e.g., 45180)
 * - Raw string formats ("19/06/2026 14:30:00", "2026-06-19", etc.)
 */
function parseExcelDate(val: any): string {
  if (val === undefined || val === null) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // If it's a raw JS Date object:
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();
  if (!str) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Try to parse number YYYYMMDD (e.g. 20260617)
  const matchYYYYMMDD = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (matchYYYYMMDD) {
    return `${matchYYYYMMDD[1]}-${matchYYYYMMDD[2]}-${matchYYYYMMDD[3]}`;
  }

  if (typeof val === 'number') {
    // Check if the number itself is in the format YYYYMMDD (e.g. 20260617)
    if (val >= 20000000 && val <= 20991231) {
      const numStr = String(val);
      return `${numStr.slice(0, 4)}-${numStr.slice(4, 6)}-${numStr.slice(6, 8)}`;
    }

    // If it's a serial date number
    try {
      const date = XLSX.SSF.parse_date_code(val);
      const y = date.y;
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } catch {
      // fallback
    }
  }

  // Extract the date part from any combined string (e.g. "19/06/2026 14:35:00" -> "19/06/2026")
  const dateStrPart = str.split(/[\sT]+/)[0];

  // Try matches for format DD/MM/YYYY or DD/MM/YY
  const matchSlash = dateStrPart.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (matchSlash) {
    const day = matchSlash[1].padStart(2, '0');
    const month = matchSlash[2].padStart(2, '0');
    let year = matchSlash[3];
    if (year.length === 2) {
      year = '20' + year; // Convert 26 to 2026
    }
    return `${year}-${month}-${day}`;
  }

  // Try matches for format YYYY/MM/DD or YY/MM/DD
  const matchYearFirst = dateStrPart.match(/^(\d{2,4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (matchYearFirst) {
    let year = matchYearFirst[1];
    if (year.length === 2) {
      year = '20' + year;
    }
    const month = matchYearFirst[2].padStart(2, '0');
    const day = matchYearFirst[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fallback to today if unparseable
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Normalizes times parsed from Excel. Handles:
 * - Decimals representing fractions of a day (e.g., 0.3854 = 09:15:00)
 * - Raw string formats ("09:15:32", "14:30")
 */
function parseExcelTime(val: any): string {
  if (typeof val === 'number' && val < 1) {
    try {
      let seconds = Math.round(val * 24 * 60 * 60);
      const hours = Math.floor(seconds / 3600);
      seconds %= 3600;
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } catch {
      // fallback
    }
  }

  const str = String(val).trim();
  const matchTime = str.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(\s*(am|pm))?/i);
  if (matchTime) {
    let hr = parseInt(matchTime[1], 10);
    const min = matchTime[2].padStart(2, '0');
    const sec = (matchTime[3] || '00').padStart(2, '0');
    const ampm = matchTime[5];
    
    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && hr < 12) hr += 12;
      if (ampm.toLowerCase() === 'am' && hr === 12) hr = 0;
    }
    return `${String(hr).padStart(2, '0')}:${min}:${sec}`;
  }

  return '12:00:00'; // Default stable midpoint
}

/**
 * Robustly extracts the time portion from a combined date/datetime input.
 */
function extractExcelTime(val: any): string | null {
  if (val === undefined || val === null) return null;
  
  if (typeof val === 'number') {
    const fraction = val - Math.floor(val);
    if (fraction > 1e-5) {
      return parseExcelTime(fraction);
    }
  }

  const str = String(val).trim();
  // Check if string contains a time (e.g. "19/06/2026 14:35:20" -> extract "14:35:20")
  const matchWithSpace = str.match(/(?:[\sT]+)(\d{1,2}:\d{1,2}(?::\d{1,2})?(\s*(?:am|pm))?)/i);
  if (matchWithSpace) {
    return parseExcelTime(matchWithSpace[1]);
  }

  return null;
}

/**
 * Identifies Sede by checking the last digits of account number.
 */
export function detectarSede(cuentaStr: string): Sede {
  if (!cuentaStr) return 'Desconocida';
  
  // Clean clean string and sanitize whitespaces
  const clean = String(cuentaStr).replace(/\s+/g, '').trim();
  if (!clean) return 'Desconocida';

  // Direct includes check on the cleaned string
  if (clean.includes('6519')) return 'Guayabal';
  if (clean.includes('0916')) return 'Sabaneta';
  if (clean.includes('6807')) return 'Naranjal';

  // Stripping all non-digits to see if the core digits exist
  // This solves case where XLSX formats numbers and exports float-like suffix (e.g. .0 or ,00)
  const onlyDigits = clean.replace(/[^0-9]/g, '');
  if (onlyDigits.includes('6519')) return 'Guayabal';
  if (onlyDigits.includes('0916')) return 'Sabaneta';
  if (onlyDigits.includes('6807')) return 'Naranjal';

  // Sede name case-insensitive check
  const lower = clean.toLowerCase();
  if (lower.includes('guayabal')) return 'Guayabal';
  if (lower.includes('sabaneta')) return 'Sabaneta';
  if (lower.includes('naranjal')) return 'Naranjal';

  return 'Desconocida';
}

/**
 * Checks if a transaction description corresponds to bank taxes, commissions, or negative values.
 */
export function esMovimientoIrrelevante(valor: number, descripcion: string): boolean {
  if (valor === 0 || isNaN(valor)) return true;
  
  const desc = (descripcion || '').toUpperCase();
  const wordsToDiscard = [
    '4X1.000',
    '4X1000',
    'GMF',
    'GRAVAMEN',
    'COBRO DE IVA',
    'COBRO COMISION',
    'IVA COMISION',
    'IVA TRANS',
    'COMISION',
    'RETEFUENTE',
    'RETEICA',
    'COBRO INTERES',
    'SALDO EN CONTRA',
    'INTERES DEBITO',
    'EGRESO',
    'ABONO'
  ];

  return wordsToDiscard.some(word => desc.includes(word));
}

/**
 * Detects if a description matches standard Colombia bank QR transfer descriptors (Bancolombia, Cobru, etc.)
 */
export function esPagoQR(descripcion: string): boolean {
  const desc = (descripcion || '').toUpperCase();
  return (
    desc.includes('QR') || 
    desc.includes('COBRU') || 
    desc.includes('TRANS. INST') ||
    desc.includes('INSTANTANEA') ||
    desc.includes('PAGO RECI')
  );
}

/**
 * Parses raw file workbook array buffer and converts to list of mapped Transaction items
 * strictly matching the client's Excel layout structure:
 * - Columna A (0): Fecha YYYYMMDD string or number (e.g., 20260617)
 * - Columna B (1): Descripción de la transacción
 * - Columna C (2): OFICINA
 * - Columna D (3): Cuenta (los últimos 4 dígitos vinculados a las sedes)
 * - Columna E (4): Valor
 * - Columna F (5): Comprobante (número de comprobante)
 */
export function parseExcelBankFile(
  arrayBuffer: ArrayBuffer,
  fallbackSede: Sede = 'Desconocida'
): Transaction[] {
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert sheet to list of arrays to handle files with and without headers easily
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  if (rawRows.length === 0) return [];

  const currentTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Check if this is an exported report from our application
  let isExportedReport = false;
  let reportHeaderIdx = -1;

  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const row = rawRows[r];
    if (row && row.some(cell => String(cell || '').trim() === 'Llave Única')) {
      isExportedReport = true;
      reportHeaderIdx = r;
      break;
    }
  }

  if (isExportedReport) {
    const headerRow = rawRows[reportHeaderIdx];
    const llaveCol = headerRow.findIndex((c: any) => String(c || '').trim() === 'Llave Única');
    const fechaCol = headerRow.findIndex((c: any) => String(c || '').trim() === 'Fecha');
    const horaCol = headerRow.findIndex((c: any) => String(c || '').trim() === 'Hora');
    const descCol = headerRow.findIndex((c: any) => String(c || '').trim() === 'Descripción');
    const valorCol = headerRow.findIndex((c: any) => String(c || '').trim().startsWith('Valor'));
    const cuentaCol = headerRow.findIndex((c: any) => String(c || '').trim().startsWith('Banco Cuenta'));
    const sedeCol = headerRow.findIndex((c: any) => String(c || '').trim().startsWith('Sede'));
    const estadoCol = headerRow.findIndex((c: any) => String(c || '').trim().startsWith('Estado'));
    const asesorCol = headerRow.findIndex((c: any) => String(c || '').trim().startsWith('Asesor'));
    const tipoDocCol = headerRow.findIndex((c: any) => String(c || '').trim().startsWith('Tipo'));
    const auxiliarCol = headerRow.findIndex((c: any) => String(c || '').trim().startsWith('Auxiliar'));
    const fechaValCol = headerRow.findIndex((c: any) => String(c || '').trim().startsWith('Fecha de'));

    const list: Transaction[] = [];

    for (let r = reportHeaderIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length < 2) continue;

      const llave = String(row[llaveCol] || '').trim();
      if (!llave || llave === 'Llave Única') continue;

      let fechaStr = parseExcelDate(row[fechaCol]);
      let horaStr = String(row[horaCol] || '').trim();
      if (horaStr === 'No especificada') {
        horaStr = '';
      }

      const desc = String(row[descCol] || '').trim().toUpperCase();
      const valor = parseColombianNumber(row[valorCol]);
      if (isNaN(valor) || valor <= 0) continue;

      const cuenta = String(row[cuentaCol] || '').trim();
      const sede = (String(row[sedeCol] || '').trim() || fallbackSede) as Sede;

      const estadoStr = String(row[estadoCol] || '').trim().toUpperCase();
      const identificada = estadoStr === 'CONCILIADO' || estadoStr === 'IDENTIFICADA';

      const asesorVal = String(row[asesorCol] || '').trim();
      const asesor = (asesorVal && asesorVal !== 'Ninguno') ? asesorVal : null;

      const tipoDocVal = String(row[tipoDocCol] || '').trim();
      const tipoDocumento = (tipoDocVal && tipoDocVal !== 'Ninguno') ? tipoDocVal as any : null;

      const auxiliarVal = String(row[auxiliarCol] || '').trim();
      const usuarioIdentificacion = (auxiliarVal && auxiliarVal !== 'Ninguno') ? auxiliarVal : null;

      const fechaValVal = String(row[fechaValCol] || '').trim();
      const fechaIdentificacion = (fechaValVal && fechaValVal !== 'Ninguno') ? fechaValVal : null;

      list.push({
        id: llave,
        llaveUnica: llave,
        fecha: fechaStr,
        hora: horaStr,
        descripcion: desc,
        valor,
        cuenta,
        sede,
        identificada,
        fechaIdentificacion,
        usuarioIdentificacion,
        asesor,
        tipoDocumento,
        fechaCarga: currentTimestamp,
        esHistorico: false
      });
    }

    return list;
  }

  // Define constant column indices as per client specification
  const fechaColIdx = 0;
  const descColIdx = 1;
  const oficinaColIdx = 2;
  const cuentaColIdx = 3;
  const valorColIdx = 4;
  const comprobanteColIdx = 5;

  const list: Transaction[] = [];

  // Keep track of occurrences of (cuenta + fecha + valor + desc + comprobante) in this file to build stable unique keys
  const occurrenceCounts: Record<string, number> = {};

  // Parse each row
  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length < 2) continue;

    // Check if the first cell (Fecha) is empty or is the header descriptor "fecha" or "fec"
    const firstCellVal = row[fechaColIdx];
    if (firstCellVal === undefined || firstCellVal === null) continue;
    
    const firstCellStr = String(firstCellVal).toLowerCase().trim();
    if (
      firstCellStr === '' || 
      firstCellStr.includes('fecha') || 
      firstCellStr.includes('fec') || 
      firstCellStr.includes('date')
    ) {
      continue; // Skip header/empty rows
    }

    // Parse Oficina - DO NOT skip oficina '236' since it originates valid payments too
    const oficina = String(row[oficinaColIdx] || '').trim();

    // Parse Valor
    const valRaw = row[valorColIdx];
    if (valRaw === undefined || valRaw === null) continue;

    const valor = parseColombianNumber(valRaw);
    if (isNaN(valor) || valor <= 0) continue;

    // Parse Descripción
    const desc = String(row[descColIdx] || 'TRANSFERENCIA BANCARIA').trim();

    // Skip irrelevant taxes or fees by keyword
    if (esMovimientoIrrelevante(valor, desc)) {
      continue;
    }

    // Parse date & hour
    const fecha = parseExcelDate(row[fechaColIdx]);
    
    // Extract real time from Excel date cell if available.
    // If Excel doesn't provide an hour, keep it empty ('') as requested by user.
    const hora = extractExcelTime(row[fechaColIdx]) || '';

    // Parse account
    let cuenta = String(row[cuentaColIdx] || '').trim();
    
    // Determine Sede
    let sede = detectarSede(cuenta);
    
    // Row scanning fallback: if the designated account column is unspecified or unknown,
    // search in any other cell of the current row for the account numbers or branch keywords!
    if (sede === 'Desconocida') {
      for (let i = 0; i < row.length; i++) {
        if (row[i] !== undefined && row[i] !== null && i !== valorColIdx && i !== fechaColIdx) {
          const cellsede = detectarSede(String(row[i]));
          if (cellsede !== 'Desconocida') {
            sede = cellsede;
            cuenta = String(row[i]).trim();
            break;
          }
        }
      }
    }

    if (sede === 'Desconocida') {
      // If no account field or unknown, check if the backup account is available or fallbackSede
      if (fallbackSede !== 'Desconocida') {
        sede = fallbackSede;
        cuenta = fallbackSede === 'Guayabal' ? '...6519' : fallbackSede === 'Sabaneta' ? '...0916' : '...6807';
      } else {
        sede = 'Desconocida';
        cuenta = cuenta || 'CODI_TRANS';
      }
    }

    // Parse Comprobante
    const comprobante = String(row[comprobanteColIdx] || '').trim();

    // Increment and retrieve occurrence count for this exact signature
    const sig = `${cuenta}_${fecha}_${valor}_${desc.toUpperCase()}_${comprobante}`;
    const ocurr_idx = occurrenceCounts[sig] || 0;
    occurrenceCounts[sig] = ocurr_idx + 1;

    // Build llave unica incorporating ocurr_idx to guarantee absolute stability & uniqueness
    const llave = generarLlaveUnica(cuenta, fecha, hora, valor, desc, comprobante, ocurr_idx);
    const esQRInstance = esPagoQR(desc);

    list.push({
      id: llave,
      llaveUnica: llave,
      fecha,
      hora,
      descripcion: desc.toUpperCase(),
      valor,
      cuenta,
      sede,
      identificada: false,
      fechaCarga: currentTimestamp,
      esHistorico: false,
      oficina: oficina || undefined,
      comprobante: comprobante || undefined,
      esQR: esQRInstance
    });
  }

  return list;
}

/**
  * Parses Cash Closures (Cierres de Caja) from an exported report workbook or excel sheet
  */
export function parseExcelCierres(arrayBuffer: ArrayBuffer): CierreCaja[] {
  try {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const targetSheetName = workbook.SheetNames.find(n => 
      n.toLowerCase().includes('cierre') || 
      n.toLowerCase().includes('cierres')
    );

    if (!targetSheetName) return [];

    const worksheet = workbook.Sheets[targetSheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    if (rawRows.length < 2) return [];

    let headerIdx = -1;
    for (let r = 0; r < Math.min(5, rawRows.length); r++) {
      const row = rawRows[r];
      if (row && row.some(cell => {
        const str = String(cell || '').toLowerCase();
        return str.includes('sede') || str.includes('cierre') || str.includes('declarado');
      })) {
        headerIdx = r;
        break;
      }
    }

    if (headerIdx === -1) return [];

    const header = rawRows[headerIdx];
    const sedeCol = header.findIndex((c: any) => String(c || '').toLowerCase().includes('sede'));
    const fechaCol = header.findIndex((c: any) => String(c || '').toLowerCase().includes('fecha'));
    const cajeraCol = header.findIndex((c: any) => {
      const str = String(c || '').toLowerCase();
      return str.includes('cajera') || str.includes('nombre') || str.includes('usuario');
    });
    const numIdentCol = header.findIndex((c: any) => {
      const str = String(c || '').toLowerCase();
      return str.includes('identificado') || str.includes('n°') || str.includes('numero') || str.includes('transacciones');
    });
    const totalIdentCol = header.findIndex((c: any) => {
      const str = String(c || '').toLowerCase();
      return str.includes('total identificado') || str.includes('declarado') || str.includes('valor identificado');
    });
    const totalAplicativoCol = header.findIndex((c: any) => {
      const str = String(c || '').toLowerCase();
      return str.includes('aplicativo') || str.includes('banco') || str.includes('total banco');
    });
    const coincideCol = header.findIndex((c: any) => String(c || '').toLowerCase().includes('coincide'));
    const motivoCol = header.findIndex((c: any) => {
      const str = String(c || '').toLowerCase();
      return str.includes('motivo') || str.includes('observaci') || str.includes('diferencia');
    });

    const cierres: CierreCaja[] = [];

    for (let r = headerIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length < 2) continue;

      const rawSede = String(row[sedeCol] || '').trim();
      const sede = detectarSede(rawSede) !== 'Desconocida' ? detectarSede(rawSede) : ((rawSede || 'Guayabal') as Sede);
      
      const fecha = parseExcelDate(row[fechaCol]);
      if (!fecha) continue;

      const nombreCajera = String(row[cajeraCol] || 'Cajera Importada').trim();
      const numeroIdentificados = numIdentCol >= 0 ? parseInt(String(row[numIdentCol] || '0'), 10) : 0;
      const totalIdentificado = totalIdentCol >= 0 ? parseColombianNumber(row[totalIdentCol]) || 0 : 0;
      const totalAplicativo = totalAplicativoCol >= 0 ? parseColombianNumber(row[totalAplicativoCol]) || 0 : 0;

      const coincideStr = coincideCol >= 0 ? String(row[coincideCol] || '').trim().toUpperCase() : 'SÍ';
      const coincide = coincideStr === 'SÍ' || coincideStr === 'SI' || coincideStr === 'TRUE' || coincideStr === 'CONCILIADO';

      const motivoDiferencia = motivoCol >= 0 ? String(row[motivoCol] || '').trim() : '';

      const id = `cierre_${sede}_${fecha}`;
      cierres.push({
        id,
        fecha,
        sede,
        nombreCajera,
        numeroIdentificados,
        totalIdentificado,
        totalAplicativo,
        coincide,
        motivoDiferencia: coincide ? null : (motivoDiferencia || null),
        diferencia: totalIdentificado - totalAplicativo,
        totalDeclarado: totalIdentificado,
        fechaCreacion: new Date().toISOString().replace('T', ' ').slice(0, 19),
        bloqueado: true
      });
    }

    return cierres;
  } catch (err) {
    console.error('Error parsing cierres from excel workbook:', err);
    return [];
  }
}
