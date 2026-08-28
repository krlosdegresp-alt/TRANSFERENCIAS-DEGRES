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

  // Match YYYY-MM-DD or YYYY/MM/DD
  const matchYearFirst = dateStrPart.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (matchYearFirst) {
    const year = matchYearFirst[1];
    const month = matchYearFirst[2].padStart(2, '0');
    const day = matchYearFirst[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Match DD/MM/YYYY or MM/DD/YYYY
  const matchSlash = dateStrPart.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (matchSlash) {
    let p1 = parseInt(matchSlash[1], 10);
    let p2 = parseInt(matchSlash[2], 10);
    let year = matchSlash[3];
    if (year.length === 2) {
      year = '20' + year; // Convert 26 to 2026
    }

    // Smart Colombian/Latin Date Parsing (DD/MM/YYYY):
    // In Colombia, DD/MM/YYYY is standard.
    // If p1 > 12, p1 MUST be the day, p2 MUST be the month (e.g. 29/07/2026 -> 2026-07-29).
    // If p2 > 12, p2 MUST be the day, p1 MUST be the month (e.g. 05/29/2026 -> 2026-05-29).
    // If both <= 12 (e.g. 08/05/2026), default to DD/MM/YYYY (Day=08, Month=05 -> 2026-05-08).
    let day: number, month: number;
    if (p1 > 12 && p2 <= 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12 && p1 <= 12) {
      day = p2;
      month = p1;
    } else {
      // Standard DD/MM/YYYY in Colombia
      day = p1;
      month = p2;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
    'EGRESO'
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
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) return [];

  const currentTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const list: Transaction[] = [];
  
  // Track occurrences within the workbook so multiple identical rows (e.g. 2 identical QR payments)
  // in rows 8 and 9 receive unique deterministic keys (index 0 for row 8, index 1 (_o1) for row 9)
  const occurrenceCounts: Record<string, number> = {};

  // Iterate over ALL worksheets in the workbook
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    if (!rawRows || rawRows.length === 0) continue;

    // Check if this sheet is an exported report from our application
    let isExportedReport = false;
    let reportHeaderIdx = -1;

    for (let r = 0; r < Math.min(8, rawRows.length); r++) {
      const row = rawRows[r];
      if (row && row.some(cell => {
        const str = String(cell || '').trim().toLowerCase();
        return str.includes('llave unica') || str.includes('llave única') || str === 'llave';
      })) {
        isExportedReport = true;
        reportHeaderIdx = r;
        break;
      }
    }

    if (isExportedReport) {
      const headerRow = rawRows[reportHeaderIdx];
      const llaveCol = headerRow.findIndex((c: any) => String(c || '').trim().toLowerCase().includes('llave'));
      const fechaCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('fecha') && !str.includes('valida') && !str.includes('carga');
      });
      const horaCol = headerRow.findIndex((c: any) => String(c || '').trim().toLowerCase().includes('hora'));
      const descCol = headerRow.findIndex((c: any) => String(c || '').trim().toLowerCase().includes('descripci'));
      const valorCol = headerRow.findIndex((c: any) => String(c || '').trim().toLowerCase().includes('valor'));
      const cuentaCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('cuenta') || str.includes('banco');
      });
      const sedeCol = headerRow.findIndex((c: any) => String(c || '').trim().toLowerCase().includes('sede'));
      const estadoCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('estado') || str.includes('identifica') || str.includes('concilia');
      });
      const comprobanteCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('comprobante') || str.includes('referencia') || str.includes('ref');
      });
      const reciboCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('recibo') || str.includes('remisi');
      });
      const oficinaCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('oficina') || str.includes('sucursal');
      });
      const asesorCol = headerRow.findIndex((c: any) => String(c || '').trim().toLowerCase().includes('asesor'));
      const tipoDocCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('tipo') || str.includes('documento');
      });
      const auxiliarCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('auxiliar') || str.includes('usuario');
      });
      const fechaValCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('fecha val') || str.includes('fecha de val') || str.includes('fecha de identificac') || str.includes('fecha identificac');
      });

      for (let r = reportHeaderIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length < 2) continue;

        const llave = String(row[llaveCol] || '').trim();
        if (!llave || llave.toLowerCase().includes('llave')) continue;

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
        const identificada = ['CONCILIADO', 'IDENTIFICADA', 'S', 'SI', 'SÍ', 'TRUE', '1'].includes(estadoStr);

        const comprobanteVal = String(row[comprobanteCol] || '').trim();
        const comprobante = (comprobanteVal && comprobanteVal !== 'Ninguno') ? comprobanteVal : undefined;

        const reciboVal = String(row[reciboCol] || '').trim();
        const nroReciboCaja = (reciboVal && reciboVal !== 'Ninguno') ? reciboVal : null;

        const oficinaVal = String(row[oficinaCol] || '').trim();
        const oficina = (oficinaVal && oficinaVal !== 'Ninguno') ? oficinaVal : undefined;

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
          nroReciboCaja,
          comprobante,
          oficina,
          fechaCarga: currentTimestamp,
          esHistorico: false
        });
      }
      continue;
    }

    // --- STANDARD BANK MOVEMENTS SHEET PARSING ---

    // Check if the sheet name itself identifies a Sede
    const sheetNameSede = detectarSede(sheetName);

    // Search top metadata rows (rows 0..15) for any account number / Sede header
    let sheetMetadataSede: Sede = 'Desconocida';
    let sheetMetadataCuenta: string = '';

    for (let r = 0; r < Math.min(15, rawRows.length); r++) {
      const row = rawRows[r];
      if (!row) continue;
      for (const cell of row) {
        if (cell !== undefined && cell !== null) {
          const cellStr = String(cell);
          const detected = detectarSede(cellStr);
          if (detected !== 'Desconocida' && sheetMetadataSede === 'Desconocida') {
            sheetMetadataSede = detected;
            sheetMetadataCuenta = cellStr.trim();
          }
        }
      }
    }

    // Search for a table header row (rows 0..35)
    let headerRowIdx = -1;
    let fechaColIdx = -1;
    let horaColIdx = -1;
    let descColIdx = -1;
    let oficinaColIdx = -1;
    let cuentaColIdx = -1;
    let valorColIdx = -1;
    let comprobanteColIdx = -1;

    for (let r = 0; r < Math.min(35, rawRows.length); r++) {
      const row = rawRows[r];
      if (!row || row.length < 2) continue;

      let foundFecha = -1;
      let foundHora = -1;
      let foundValor = -1;
      let foundDesc = -1;
      let foundOficina = -1;
      let foundCuenta = -1;
      let foundComprobante = -1;

      for (let c = 0; c < row.length; c++) {
        const cellText = String(row[c] || '').toLowerCase().trim();
        if (!cellText) continue;

        if (foundFecha === -1 && (cellText.includes('fecha') || cellText.includes('fec') || cellText === 'date' || cellText.includes('dia') || cellText.includes('día'))) {
          foundFecha = c;
        } else if (foundHora === -1 && (cellText.includes('hora') || cellText === 'time' || cellText.includes('horario'))) {
          foundHora = c;
        } else if (foundValor === -1 && (cellText.includes('valor') || cellText.includes('monto') || cellText.includes('importe') || cellText.includes('credito') || cellText.includes('crédito') || cellText.includes('ingreso') || cellText.includes('abono') || cellText.includes('deposito') || cellText.includes('depósito') || cellText.includes('entrada') || cellText.includes('pago'))) {
          foundValor = c;
        } else if (foundDesc === -1 && (cellText.includes('descripc') || cellText.includes('detalle') || cellText.includes('concepto') || cellText.includes('movimiento') || cellText === 'desc' || cellText.includes('leyenda') || cellText.includes('transaccion') || cellText.includes('transacción'))) {
          foundDesc = c;
        } else if (foundOficina === -1 && (cellText.includes('oficina') || cellText.includes('sucursal') || cellText.includes('plaza') || cellText.includes('canal'))) {
          foundOficina = c;
        } else if (foundCuenta === -1 && (cellText.includes('cuenta') || cellText.includes('cta') || cellText.includes('producto'))) {
          foundCuenta = c;
        } else if (foundComprobante === -1 && (cellText.includes('comprobante') || cellText.includes('documento') || cellText.includes('doc') || cellText.includes('referencia') || cellText.includes('ref') || cellText.includes('nro') || cellText.includes('num'))) {
          foundComprobante = c;
        }
      }

      // If at least fecha AND (valor OR desc) are found in this row, treat it as header row
      if (foundFecha !== -1 && (foundValor !== -1 || foundDesc !== -1)) {
        headerRowIdx = r;
        fechaColIdx = foundFecha;
        horaColIdx = foundHora;
        valorColIdx = foundValor;
        descColIdx = foundDesc;
        oficinaColIdx = foundOficina;
        cuentaColIdx = foundCuenta;
        comprobanteColIdx = foundComprobante;
        break;
      }
    }

    // Fallbacks if no header row was detected
    if (headerRowIdx === -1) {
      fechaColIdx = 0;
      descColIdx = 1;
      oficinaColIdx = 2;
      cuentaColIdx = 3;
      valorColIdx = 4;
      comprobanteColIdx = 5;
    } else {
      // Fill missing column positions with standard defaults
      if (fechaColIdx === -1) fechaColIdx = 0;
      if (descColIdx === -1) descColIdx = 1;
      if (oficinaColIdx === -1) oficinaColIdx = 2;
      if (cuentaColIdx === -1) cuentaColIdx = 3;
      if (valorColIdx === -1) valorColIdx = 4;
      if (comprobanteColIdx === -1) comprobanteColIdx = 5;
    }

    const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;

    for (let r = startRow; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length < 2) continue;

      const firstCellVal = row[fechaColIdx];
      if (firstCellVal === undefined || firstCellVal === null) continue;

      const firstCellStr = String(firstCellVal).toLowerCase().trim();
      if (
        firstCellStr === '' ||
        firstCellStr.includes('fecha') ||
        firstCellStr.includes('fec') ||
        firstCellStr.includes('total') ||
        firstCellStr.includes('saldo') ||
        firstCellStr.includes('resumen')
      ) {
        continue;
      }

      // Parse Valor
      let valRaw = row[valorColIdx];
      let valor = parseColombianNumber(valRaw);

      // Fallback scan across all row cells if valor isn't found at guessed valorColIdx
      if (isNaN(valor) || valor <= 0) {
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          if (colIdx === fechaColIdx) continue;
          const candidateVal = parseColombianNumber(row[colIdx]);
          if (!isNaN(candidateVal) && candidateVal > 0) {
            const candStr = String(row[colIdx]).trim();
            // Verify candidate is an actual currency amount and not a long document ID
            if (candStr.length <= 13 && candidateVal < 1000000000) {
              valor = candidateVal;
              break;
            }
          }
        }
      }

      if (isNaN(valor) || valor <= 0) continue;

      // Parse Description
      const desc = String(row[descColIdx] || 'TRANSFERENCIA BANCARIA').trim();

      // Discard tax or debit movements
      if (esMovimientoIrrelevante(valor, desc)) {
        continue;
      }

      // Parse Date & Time
      const fecha = parseExcelDate(row[fechaColIdx]);
      let hora = '';
      if (horaColIdx !== -1 && row[horaColIdx] !== undefined && row[horaColIdx] !== null) {
        hora = parseExcelTime(row[horaColIdx]);
        if (hora === '12:00:00') hora = '';
      }
      if (!hora) {
        const extracted = extractExcelTime(row[fechaColIdx]);
        if (extracted && extracted !== '12:00:00') hora = extracted;
      }

      // Parse Account
      let cuenta = String(row[cuentaColIdx] || '').trim();

      // Determine Sede
      let sede = detectarSede(cuenta);

      // Row scan fallback if account column is unspecified or unknown
      if (sede === 'Desconocida') {
        for (let i = 0; i < row.length; i++) {
          if (row[i] !== undefined && row[i] !== null && i !== valorColIdx && i !== fechaColIdx) {
            const cellSede = detectarSede(String(row[i]));
            if (cellSede !== 'Desconocida') {
              sede = cellSede;
              cuenta = String(row[i]).trim();
              break;
            }
          }
        }
      }

      // Metadata / Sheet name fallback
      if (sede === 'Desconocida') {
        if (sheetNameSede !== 'Desconocida') {
          sede = sheetNameSede;
          cuenta = cuenta || sheetName;
        } else if (sheetMetadataSede !== 'Desconocida') {
          sede = sheetMetadataSede;
          cuenta = cuenta || sheetMetadataCuenta;
        } else if (fallbackSede !== 'Desconocida') {
          sede = fallbackSede;
          cuenta = fallbackSede === 'Guayabal' ? '...6519' : fallbackSede === 'Sabaneta' ? '...0916' : '...6807';
        } else {
          sede = 'Desconocida';
          cuenta = cuenta || 'CODI_TRANS';
        }
      }

      // Parse Oficina & Comprobante
      const oficina = String(row[oficinaColIdx] || '').trim();
      const comprobante = String(row[comprobanteColIdx] || '').trim();

      // Generate stable unique signature
      const sig = `${cuenta}_${fecha}_${valor}_${desc.toUpperCase()}_${comprobante}_${hora}`;
      const ocurr_idx = occurrenceCounts[sig] || 0;
      occurrenceCounts[sig] = ocurr_idx + 1;

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
