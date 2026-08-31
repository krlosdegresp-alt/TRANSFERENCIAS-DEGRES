/**
 * Normalizes any account string or representation into a canonical digits format.
 */
export function normalizarCuenta(cuenta?: string): string {
  if (!cuenta) return '0000';
  const clean = String(cuenta).toLowerCase().trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.includes('6519') || clean.includes('guayabal')) return '10172476519';
  if (digits.includes('0916') || clean.includes('sabaneta')) return '10172470916';
  if (digits.includes('6807') || clean.includes('naranjal')) return '10172476807';
  return digits.slice(-12) || clean.substring(0, 15) || '0000';
}

/**
 * Checks whether a comprobante string is a genuine, unique bank voucher number
 * and not a generic placeholder/dummy code (such as '000000', '999999', '0', 'N/A', etc.).
 */
export function isRealComprobante(comp?: string | null): boolean {
  if (!comp) return false;
  const str = String(comp).trim();
  if (str.length < 2) return false;
  
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.length < 2) return false;

  // Reject repeating single character digits (e.g. "000000", "00", "000", "999999", "111111", "999")
  if (/^(\d)\1+$/.test(clean)) return false;

  // Reject generic / placeholder strings commonly emitted by bank exports
  const invalidDummies = [
    'none', 'null', 'undefined', 'ninguno', 'ninguna', 'na', 'sinref',
    'sincomprobante', 'noaplica', 'notavailable', 'desconocido', 'desconocida',
    'comprobante', 'documento', 'referencia', 'transaccion', 'transferencia',
    'qr', 'cobru', 'ach', 'aut', '0001', '00001', '000001', '0', '00', '000'
  ];
  if (invalidDummies.includes(clean)) return false;

  return true;
}

/**
 * Generates a unique stable key for a transaction based on its essential fields:
 * Account + Date + Time + Value + Description + Optional Genuine Comprobante.
 * This guarantees that even if a bank file is uploaded multiple times or has date overlaps,
 * duplicate rows are rejected while multiple distinct transfers (e.g. 2 QR payments of identical amount)
 * are preserved 100% accurately.
 */
export function generarLlaveUnica(
  cuenta: string,
  fecha: string,
  hora: string,
  valor: number,
  descripcion: string,
  comprobante?: string,
  ocurr_idx?: number
): string {
  // Normalize account canonical format
  const normCuenta = normalizarCuenta(cuenta);
  
  // Normalize date (YYYY-MM-DD or similar) -> strip separators
  const normFecha = (fecha || '').replace(/[-/]/g, '').trim();

  // Normalize time (HH:MM:SS) -> strip colons or extract first stable parts
  // Handles values like "14:32:01", "143201", "2:30 PM", or blank
  let normHora = (hora || '').trim().toLowerCase();
  normHora = normHora.replace(/[:]/g, '');
  normHora = normHora.replace(/\s+/g, '');
  if (normHora === '120000') {
    normHora = '';
  }

  // Normalize value to 2 decimal places to capture Colombian cents/decimals properly
  // and replace the dot with underscore to keep the key stable as a CSS/JS identifier.
  const normValor = Number(valor || 0).toFixed(2).replace('.', '_');

  // Normalize description (lowercase, alphanumeric characters only to prevent slight bank system encoding differences)
  const normDesc = (descripcion || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 35); // Grab first 35 chars of alphanumeric content

  // Suffix for occurrence index (only if index > 0)
  const ocurSuffix = (ocurr_idx !== undefined && ocurr_idx > 0) ? `_o${ocurr_idx}` : '';

  // Check if we have a real genuine bank comprobante
  const isValidComp = isRealComprobante(comprobante);
  const normComprobante = isValidComp
    ? (comprobante || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';

  // If we have a stable real bank comprobante numeric/alphanumeric ID (length >= 3),
  // include account, date, value, comprobante and occurrence suffix.
  if (normComprobante && normComprobante.length >= 3) {
    return `tx_${normCuenta}_${normFecha}_v${normValor}_c${normComprobante}${ocurSuffix}`;
  }

  const horaPart = normHora ? `_${normHora}` : '';
  return `tx_${normCuenta}_${normFecha}${horaPart}_v${normValor}_${normDesc}${ocurSuffix}`;
}
