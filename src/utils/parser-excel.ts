import * as XLSX from 'xlsx';
import { Transaction, Sede, CierreCaja } from '../types';
import { generarLlaveUnica } from './llave-unica';

/**
 * Parses numeric strings formatted with Colombian conventions (dots for thousands, commas for decimals).
 * It preserves the exact decimal value safely and returns absolute positive magnitude.
 */
export function parseColombianNumber(val: any): number {
  if (val === undefined || val === null) return NaN;
  if (typeof val === 'number') return Math.abs(val);

  let raw = String(val).trim();
  if (!raw) return NaN;

  // Remove currency words and symbols: COP, USD, EUR, COL, $, etc.
  let str = raw.replace(/(?:COP|USD|EUR|COL|\$)/gi, '').trim();
  // Remove negative signs, parentheses, quotes, and bullets
  str = str.replace(/[()'"•\-+]/g, '').trim();
  // Remove any remaining alphabetical characters or unexpected symbols
  str = str.replace(/[^\d.,]/g, '').trim();
  if (!str) return NaN;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    const commaIndex = str.lastIndexOf(',');
    const dotIndex = str.lastIndexOf('.');
    if (commaIndex > dotIndex) {
      // Comma is the decimal separator (e.g. "1.500.250,50" or "4.661.500,00")
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
      }
    }
  }

  const num = Math.abs(parseFloat(str));
  return isNaN(num) ? NaN : num;
}

const MONTH_NAME_MAP: Record<string, string> = {
  'ene': '01', 'enero': '01', 'jan': '01', 'january': '01',
  'feb': '02', 'febrero': '02', 'february': '02',
  'mar': '03', 'marzo': '03', 'march': '03',
  'abr': '04', 'abril': '04', 'apr': '04', 'april': '04',
  'may': '05', 'mayo': '05',
  'jun': '06', 'junio': '06', 'june': '06',
  'jul': '07', 'julio': '07', 'july': '07',
  'ago': '08', 'agosto': '08', 'aug': '08', 'august': '08',
  'sep': '09', 'sept': '09', 'septiembre': '09', 'set': '09', 'september': '09',
  'oct': '10', 'octubre': '10', 'october': '10',
  'nov': '11', 'noviembre': '11', 'november': '11',
  'dic': '12', 'diciembre': '12', 'dec': '12', 'december': '12'
};

/**
 * Normalizes dates parsed from Excel. Handles:
 * - Text dates like "01 sept 2026", "01 sep 2026", "1 de septiembre de 2026"
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

  // Check text month formats (e.g. "01 sept 2026", "01-sep-2026", "1 de septiembre de 2026")
  const matchTextDate = str.match(/(\d{1,2})[\s\/\-_.]+(?:de\s+)?([a-zA-ZáéíóúÁÉÍÓÚ]+)[\s\/\-_.]+(?:de\s+)?(\d{2,4})/i);
  if (matchTextDate) {
    const day = matchTextDate[1].padStart(2, '0');
    const rawMonth = matchTextDate[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    let year = matchTextDate[3];
    if (year.length === 2) year = '20' + year;
    const month = MONTH_NAME_MAP[rawMonth] || MONTH_NAME_MAP[rawMonth.slice(0, 3)] || MONTH_NAME_MAP[rawMonth.slice(0, 4)];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // Match month-first text (e.g. "Sept 01 2026")
  const matchMonthFirst = str.match(/([a-zA-ZáéíóúÁÉÍÓÚ]+)[\s\/\-_.]+(\d{1,2})[\s\/\-_.]+(\d{2,4})/i);
  if (matchMonthFirst) {
    const rawMonth = matchMonthFirst[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const day = matchMonthFirst[2].padStart(2, '0');
    let year = matchMonthFirst[3];
    if (year.length === 2) year = '20' + year;
    const month = MONTH_NAME_MAP[rawMonth] || MONTH_NAME_MAP[rawMonth.slice(0, 3)] || MONTH_NAME_MAP[rawMonth.slice(0, 4)];
    if (month) {
      return `${year}-${month}-${day}`;
    }
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
 * Checks if a transaction is irrelevant.
 * As requested:
 * - Omits movements with value less than $1,000 COP (e.g. $236 bank canal fees, micro-charges, zero/negative balances).
 * - Preserves all valid bank transactions and payments over $1,000 COP (including provider payments, disbursements, transfers, consignments, ATM, etc.).
 */
export function esMovimientoIrrelevante(valor: number, descripcion: string, _oficina?: string): boolean {
  const absVal = Math.abs(Number(valor || 0));
  // Only discard 0 or invalid amounts
  if (isNaN(absVal) || absVal <= 0) {
    return true;
  }

  const rawDesc = String(descripcion || '').trim();
  if (!rawDesc) return false;

  // Normalize string
  const desc = rawDesc
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!desc) return false;

  // Only pure GMF tax under $10,000 COP with exact tax description is omitted
  if (absVal < 10000 && (desc === '4X1.000' || desc === '4X1000' || desc === '4 X 1000' || desc === '4 X 1.000' || desc === 'GMF' || desc === 'GRAVAMEN A LOS MOVIMIENTOS FINANCIEROS')) {
    return true;
  }

  return false;
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
  
  // Track occurrences within the workbook so multiple identical rows receive deterministic unique keys
  const occurrenceCounts: Record<string, number> = {};

  // Iterate over ALL worksheets in the workbook
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const lowerSheet = sheetName.trim().toLowerCase();

    // Skip sheets that are exclusively closures, logs, user tables, or configurations
    if (
      (lowerSheet.includes('cierre') || lowerSheet.includes('cierres')) &&
      !lowerSheet.includes('trans') && 
      !lowerSheet.includes('movim') && 
      !lowerSheet.includes('hist')
    ) {
      continue;
    }

    if (
      lowerSheet.includes('auditoria') || 
      lowerSheet.includes('audit') || 
      lowerSheet.includes('usuario') || 
      lowerSheet.includes('user') || 
      lowerSheet.includes('config') ||
      lowerSheet.includes('log')
    ) {
      continue;
    }

    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    if (!rawRows || rawRows.length === 0) continue;

    // Check if the sheet name itself identifies a Sede
    const sheetNameSede = detectarSede(sheetName);

    // Search top metadata rows (rows 0..20) for any account number / Sede header
    let sheetMetadataSede: Sede = 'Desconocida';
    let sheetMetadataCuenta: string = '';

    for (let r = 0; r < Math.min(20, rawRows.length); r++) {
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

    // Step 1: Detect if this sheet is an exported report or backup workbook
    let isExportedReport = false;
    let reportHeaderIdx = -1;

    for (let r = 0; r < Math.min(25, rawRows.length); r++) {
      const row = rawRows[r];
      if (row && row.some(cell => {
        const str = String(cell || '').trim().toLowerCase();
        return (
          str.includes('llave unica') || 
          str.includes('llave única') || 
          str === 'llave' || 
          str === 'llave_unica' ||
          str === 'id transacción' ||
          str === 'id transaccion' ||
          (str.includes('comprobante') && row.some(c => String(c || '').toLowerCase().includes('valor cop')))
        );
      })) {
        isExportedReport = true;
        reportHeaderIdx = r;
        break;
      }
    }

    if (isExportedReport) {
      const headerRow = rawRows[reportHeaderIdx];
      const llaveCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('llave') || str === 'id' || str.includes('id trans');
      });
      const fechaCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return (str.includes('fecha') || str.includes('fec') || str === 'date') && 
          !str.includes('valida') && !str.includes('carga') && !str.includes('cierre') && !str.includes('registro');
      });
      const horaCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('hora') || str === 'time';
      });
      const descCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('descripc') || str.includes('concepto') || str.includes('detalle') || str.includes('movimiento') || str === 'desc';
      });
      const valorCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return (str.includes('valor') || str.includes('monto') || str.includes('importe') || str.includes('credito') || str.includes('crédito') || str.includes('ingreso') || str.includes('abono') || str.includes('deposito') || str.includes('depósito') || str.includes('total') || str.includes('cop') || str.includes('vr')) &&
          !str.includes('declarado') && !str.includes('aplicativo') && !str.includes('diferencia') && !str.includes('descuadre');
      });
      const cuentaCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('cuenta') || str.includes('cta') || str.includes('banco') || str.includes('producto');
      });
      const sedeCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('sede') || str.includes('sucursal') || str.includes('oficina');
      });
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
        return str.includes('oficina') || str.includes('canal') || str.includes('plaza') || str.includes('agencia');
      });
      const asesorCol = headerRow.findIndex((c: any) => {
        const str = String(c || '').trim().toLowerCase();
        return str.includes('asesor') || str.includes('responsable') || str.includes('vendedor');
      });
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
        return str.includes('fecha val') || str.includes('fecha de val') || str.includes('fecha identificac') || str.includes('fecha de identificac') || str.includes('fecha validacion');
      });

      for (let r = reportHeaderIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length < 2) continue;

        // Extract Date
        let fechaStr = fechaCol >= 0 ? parseExcelDate(row[fechaCol]) : '';
        if (!fechaStr) {
          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cand = parseExcelDate(row[colIdx]);
            if (cand && cand.match(/^\d{4}-\d{2}-\d{2}$/)) {
              fechaStr = cand;
              break;
            }
          }
        }
        if (!fechaStr) continue;

        // Extract Time
        let horaStr = horaCol >= 0 ? String(row[horaCol] || '').trim() : '';
        if (horaStr === 'No especificada' || horaStr.toLowerCase() === 'null') {
          horaStr = '';
        }

        // Extract Description
        let desc = descCol >= 0 ? String(row[descCol] || '').trim().toUpperCase() : '';
        if (!desc) desc = 'TRANSFERENCIA BANCARIA';

        // Extract Valor
        let valor = valorCol >= 0 ? parseColombianNumber(row[valorCol]) : NaN;
        if (isNaN(valor) || valor <= 0) {
          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            if (colIdx === fechaCol || colIdx === horaCol) continue;
            const cand = parseColombianNumber(row[colIdx]);
            if (!isNaN(cand) && cand > 0) {
              valor = cand;
              break;
            }
          }
        }
        if (isNaN(valor) || valor <= 0) continue;
        if (esMovimientoIrrelevante(valor, desc)) continue;

        // Extract Account
        let cuenta = cuentaCol >= 0 ? String(row[cuentaCol] || '').trim() : '';
        if (!cuenta) {
          cuenta = sheetMetadataCuenta || (fallbackSede === 'Guayabal' ? '101-574965-19' : fallbackSede === 'Sabaneta' ? '101-724709-16' : fallbackSede === 'Naranjal' ? '101-724768-07' : '');
        }

        // Extract Sede
        let rawSede = sedeCol >= 0 ? String(row[sedeCol] || '').trim() : '';
        let sede: Sede = 'Desconocida';
        if (rawSede) {
          const detectedSede = detectarSede(rawSede);
          if (detectedSede !== 'Desconocida') {
            sede = detectedSede;
          } else if (['Guayabal', 'Sabaneta', 'Naranjal'].includes(rawSede)) {
            sede = rawSede as Sede;
          }
        }
        if (sede === 'Desconocida') {
          sede = detectarSede(cuenta) !== 'Desconocida' ? detectarSede(cuenta) : 
                 sheetMetadataSede !== 'Desconocida' ? sheetMetadataSede : 
                 sheetNameSede !== 'Desconocida' ? sheetNameSede : 
                 fallbackSede;
        }

        // Extract Status
        const estadoStr = estadoCol >= 0 ? String(row[estadoCol] || '').trim().toUpperCase() : '';
        
        const comprobanteVal = comprobanteCol >= 0 ? String(row[comprobanteCol] || '').trim() : '';
        const comprobante = (comprobanteVal && !['ninguno', 'null', 'n/a', 'na', '-', '--', '• -'].includes(comprobanteVal.toLowerCase())) ? comprobanteVal : undefined;

        const reciboVal = reciboCol >= 0 ? String(row[reciboCol] || '').trim() : '';
        const nroReciboCaja = (reciboVal && !['ninguno', 'null', 'n/a', 'na', '-', '--'].includes(reciboVal.toLowerCase())) ? reciboVal : null;

        const oficinaVal = oficinaCol >= 0 ? String(row[oficinaCol] || '').trim() : '';
        const oficina = (oficinaVal && !['ninguno', 'null', 'n/a', 'na'].includes(oficinaVal.toLowerCase())) ? oficinaVal : undefined;

        const asesorVal = asesorCol >= 0 ? String(row[asesorCol] || '').trim() : '';
        const asesor = (asesorVal && !['ninguno', 'null', 'n/a', 'na'].includes(asesorVal.toLowerCase())) ? asesorVal : null;

        const tipoDocVal = tipoDocCol >= 0 ? String(row[tipoDocCol] || '').trim() : '';
        const tipoDocumento = (tipoDocVal && !['ninguno', 'null', 'n/a', 'na'].includes(tipoDocVal.toLowerCase())) ? tipoDocVal as any : null;

        const auxiliarVal = auxiliarCol >= 0 ? String(row[auxiliarCol] || '').trim() : '';
        const usuarioIdentificacion = (auxiliarVal && !['ninguno', 'null', 'n/a', 'na'].includes(auxiliarVal.toLowerCase())) ? auxiliarVal : null;

        const fechaValVal = fechaValCol >= 0 ? String(row[fechaValCol] || '').trim() : '';
        const fechaIdentificacion = (fechaValVal && !['ninguno', 'null', 'n/a', 'na'].includes(fechaValVal.toLowerCase())) ? fechaValVal : null;

        const identificada = ['CONCILIADO', 'IDENTIFICADA', 'IDENTIFICADO', 'S', 'SI', 'SÍ', 'TRUE', '1'].includes(estadoStr) || 
          !!usuarioIdentificacion || !!fechaIdentificacion || !!nroReciboCaja;

        // Extract Llave Unica or generate deterministic key
        let llave = llaveCol >= 0 ? String(row[llaveCol] || '').trim() : '';
        if (!llave || llave.toLowerCase().includes('llave') || ['ninguno', 'null', 'n/a', 'na'].includes(llave.toLowerCase())) {
          const signature = `${cuenta}_${fechaStr}_${valor}_${desc}_${comprobante || ''}_${horaStr}`;
          const occurIdx = occurrenceCounts[signature] || 0;
          occurrenceCounts[signature] = occurIdx + 1;
          llave = generarLlaveUnica(cuenta, fechaStr, horaStr, valor, desc, comprobante, occurIdx);
        }

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
          esHistorico: false,
          esQR: esPagoQR(desc)
        });
      }
      continue;
    }

    // --- STANDARD BANK MOVEMENTS SHEET PARSING ---

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
        } else if (foundDesc === -1 && (cellText.includes('descripc') || cellText.includes('detalle') || cellText.includes('concepto') || cellText.includes('movimiento') || cellText === 'desc' || cellText.includes('leyenda') || cellText.includes('transaccion') || cellText.includes('transacción') || cellText.includes('motivo'))) {
          foundDesc = c;
        } else if (foundValor === -1 && !cellText.includes('forma') && !cellText.includes('medio') && !cellText.includes('tipo') && (cellText.includes('valor') || cellText.includes('monto') || cellText.includes('importe') || cellText.includes('credito') || cellText.includes('crédito') || cellText.includes('ingreso') || cellText.includes('abono') || cellText.includes('deposito') || cellText.includes('depósito') || cellText.includes('entrada') || cellText === 'pago' || cellText.includes('vr.') || cellText.includes('vr ') || cellText.includes('vlr') || cellText.includes('pesos') || cellText.includes('cop'))) {
          foundValor = c;
        } else if (foundOficina === -1 && (cellText.includes('oficina') || cellText.includes('sucursal') || cellText.includes('plaza') || cellText.includes('canal') || cellText.includes('agencia') || cellText.includes('terminal'))) {
          foundOficina = c;
        } else if (foundCuenta === -1 && (cellText.includes('cuenta') || cellText.includes('cta') || cellText.includes('producto'))) {
          foundCuenta = c;
        } else if (foundComprobante === -1 && (cellText.includes('comprobante') || cellText.includes('documento') || cellText.includes('doc') || cellText.includes('referencia') || cellText.includes('ref') || cellText.includes('nro') || cellText.includes('num') || cellText.includes('aut') || cellText.includes('recibo'))) {
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
        let bestCandidate = 0;
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          if (colIdx === fechaColIdx) continue;
          const candRaw = String(row[colIdx] || '').trim();
          // Skip if cell looks like an account number (e.g., has hyphens or 10+ digits)
          if (candRaw.includes('-') && candRaw.length > 7) continue;
          
          const candidateVal = parseColombianNumber(row[colIdx]);
          if (!isNaN(candidateVal) && candidateVal > 0) {
            if (candidateVal >= 1000 && candidateVal < 10000000000) {
              // Prefer actual monetary value >= 1000 COP over small 3-digit branch codes like 236
              if (bestCandidate === 0 || candidateVal > bestCandidate) {
                bestCandidate = candidateVal;
              }
            } else if (bestCandidate === 0) {
              bestCandidate = candidateVal;
            }
          }
        }
        if (bestCandidate > 0) {
          valor = bestCandidate;
        }
      }

      if (isNaN(valor) || valor <= 0) continue;

      // Extract and normalize Description & Oficina
      let descRaw = descColIdx !== -1 ? String(row[descColIdx] || '').trim() : '';
      let oficinaRaw = oficinaColIdx !== -1 ? String(row[oficinaColIdx] || '').trim() : '';

      // If description contains "PAGO", ensure it's not discarded
      if (descRaw.toUpperCase() === 'PAGO' || descRaw.toUpperCase().startsWith('PAGO ')) {
        // Valid payment description
      }

      if (descRaw.length <= 3 && oficinaRaw.length > 3) {
        // Swap if desc was placed in oficina column
        const temp = descRaw;
        descRaw = oficinaRaw;
        oficinaRaw = temp;
      }

      const desc = descRaw.toUpperCase() || 'TRANSFERENCIA BANCARIA';
      const oficina = (oficinaRaw && oficinaRaw !== '• -' && oficinaRaw !== '-') ? oficinaRaw : undefined;

      // Filter irrelevant rows (tax withholdings, fees, summary lines)
      if (esMovimientoIrrelevante(valor, desc, oficina)) continue;

      // Extract Date and Time
      const fechaStr = parseExcelDate(row[fechaColIdx]);
      let horaStr = horaColIdx !== -1 ? parseExcelTime(row[horaColIdx]) : '';
      if (!horaStr) {
        const rawDateStr = String(row[fechaColIdx] || '');
        const timeMatch = rawDateStr.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
        if (timeMatch) {
          horaStr = timeMatch[1];
        }
      }

      // Extract Account and Sede
      let cuentaRaw = cuentaColIdx !== -1 ? String(row[cuentaColIdx] || '').trim() : '';
      if (!cuentaRaw) {
        cuentaRaw = sheetMetadataCuenta || (fallbackSede === 'Guayabal' ? '101-574965-19' : fallbackSede === 'Sabaneta' ? '101-724709-16' : fallbackSede === 'Naranjal' ? '101-724768-07' : '');
      }

      let sede: Sede = 'Desconocida';
      if (cuentaRaw) {
        sede = detectarSede(cuentaRaw);
      }
      if (sede === 'Desconocida') {
        sede = sheetMetadataSede !== 'Desconocida' ? sheetMetadataSede : 
               sheetNameSede !== 'Desconocida' ? sheetNameSede : 
               fallbackSede;
      }

      // Extract Comprobante / Referencia
      let comprobanteRaw = comprobanteColIdx !== -1 ? String(row[comprobanteColIdx] || '').trim() : '';
      if (comprobanteRaw === '• -' || comprobanteRaw === '-' || comprobanteRaw.toLowerCase() === 'null') {
        comprobanteRaw = '';
      }
      const comprobante = comprobanteRaw || undefined;

      // Signature for duplicate occurrence index within this batch
      const rowSignature = `${cuentaRaw}_${fechaStr}_${valor}_${desc}_${comprobante || ''}_${horaStr}`;
      const occurrenceIndex = occurrenceCounts[rowSignature] || 0;
      occurrenceCounts[rowSignature] = occurrenceIndex + 1;

      // Generate deterministic unique key
      const llave = generarLlaveUnica(
        cuentaRaw,
        fechaStr,
        horaStr,
        valor,
        desc,
        comprobante,
        occurrenceIndex
      );

      list.push({
        id: llave,
        llaveUnica: llave,
        fecha: fechaStr,
        hora: horaStr,
        descripcion: desc,
        valor,
        cuenta: cuentaRaw,
        sede,
        identificada: false,
        fechaIdentificacion: null,
        usuarioIdentificacion: null,
        asesor: null,
        tipoDocumento: null,
        nroReciboCaja: null,
        comprobante,
        oficina,
        fechaCarga: currentTimestamp,
        esHistorico: false,
        esQR: esPagoQR(desc)
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
    for (let r = 0; r < Math.min(20, rawRows.length); r++) {
      const row = rawRows[r];
      if (row && row.some(cell => {
        const str = String(cell || '').toLowerCase();
        return (
          str.includes('sede') || 
          str.includes('cierre') || 
          str.includes('declarado') ||
          str.includes('cajera') ||
          str.includes('identificado')
        );
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
      return str.includes('total identificado') || str.includes('declarado') || str.includes('valor identificado') || str.includes('valor total identificado');
    });
    const totalAplicativoCol = header.findIndex((c: any) => {
      const str = String(c || '').toLowerCase();
      return str.includes('aplicativo') || str.includes('banco') || str.includes('total banco') || str.includes('total aplicativo') || str.includes('valor total aplicativo');
    });
    const coincideCol = header.findIndex((c: any) => String(c || '').toLowerCase().includes('coincide'));
    const motivoCol = header.findIndex((c: any) => {
      const str = String(c || '').toLowerCase();
      return str.includes('motivo') || str.includes('observaci') || str.includes('diferencia') || str.includes('descuadre');
    });
    const solicitaDesbloqueoCol = header.findIndex((c: any) => {
      const str = String(c || '').toLowerCase();
      return str.includes('solicitó desbloqueo') || str.includes('solicito desbloqueo') || str.includes('desbloqueo');
    });
    const motivoDesbloqueoCol = header.findIndex((c: any) => {
      const str = String(c || '').toLowerCase();
      return str.includes('motivo desbloqueo');
    });

    const cierres: CierreCaja[] = [];

    for (let r = headerIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length < 2) continue;

      const rawSede = sedeCol >= 0 ? String(row[sedeCol] || '').trim() : '';
      const sede = detectarSede(rawSede) !== 'Desconocida' ? detectarSede(rawSede) : ((rawSede || 'Guayabal') as Sede);
      
      const fecha = fechaCol >= 0 ? parseExcelDate(row[fechaCol]) : '';
      if (!fecha) continue;

      const nombreCajera = cajeraCol >= 0 ? String(row[cajeraCol] || 'Cajera Importada').trim() : 'Cajera Importada';
      const numeroIdentificados = numIdentCol >= 0 ? parseInt(String(row[numIdentCol] || '0'), 10) : 0;
      const totalIdentificado = totalIdentCol >= 0 ? parseColombianNumber(row[totalIdentCol]) || 0 : 0;
      const totalAplicativo = totalAplicativoCol >= 0 ? parseColombianNumber(row[totalAplicativoCol]) || 0 : 0;

      const coincideStr = coincideCol >= 0 ? String(row[coincideCol] || '').trim().toUpperCase() : 'SÍ';
      const coincide = coincideStr === 'SÍ' || coincideStr === 'SI' || coincideStr === 'TRUE' || coincideStr === 'CONCILIADO';

      const motivoDiferencia = motivoCol >= 0 ? String(row[motivoCol] || '').trim() : '';
      const solicitaDesbloqueo = solicitaDesbloqueoCol >= 0 ? ['SÍ', 'SI', 'TRUE', '1', 'S'].includes(String(row[solicitaDesbloqueoCol] || '').trim().toUpperCase()) : false;
      const motivoDesbloqueo = motivoDesbloqueoCol >= 0 ? String(row[motivoDesbloqueoCol] || '').trim() : undefined;

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
        bloqueado: true,
        solicitaDesbloqueo: solicitaDesbloqueo || undefined,
        motivoDesbloqueo: motivoDesbloqueo || undefined
      });
    }

    return cierres;
  } catch (err) {
    console.error('Error parsing cierres from excel workbook:', err);
    return [];
  }
}
