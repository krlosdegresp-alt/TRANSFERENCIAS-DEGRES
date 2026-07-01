/**
 * Generates a unique stable key for a transaction based on its essential fields:
 * Account + Date + Time + Value + Description + Optional Comprobante.
 * This guarantees that even if a bank file is uploaded multiple times or has date overlaps,
 * duplicate rows are rejected.
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
  // Normalize account (keep only digits or last 4 if full account isn't available)
  const normCuenta = (cuenta || '0000').replace(/\D/g, '').slice(-12) || '0000';
  
  // Normalize date (YYYY-MM-DD or similar) -> strip separators
  const normFecha = (fecha || '').replace(/[-/]/g, '').trim();

  // Normalize time (HH:MM:SS) -> strip colons or extract first stable parts
  // Handles values like "14:32:01", "143201", "2:30 PM", or blank
  let normHora = (hora || '').trim().toLowerCase();
  normHora = normHora.replace(/[:]/g, '');
  normHora = normHora.replace(/\s+/g, '');

  // Normalize value to 2 decimal places to capture Colombian cents/decimals properly
  // and replace the dot with underscore to keep the key stable as a CSS/JS identifier.
  const normValor = Number(valor || 0).toFixed(2).replace('.', '_');

  // Normalize description (lowercase, alphanumeric characters only to prevent slight bank system encoding differences)
  const normDesc = (descripcion || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 30); // Grab first 30 chars of alphanumeric content

  // Normalize comprobante if present
  const normComprobante = (comprobante || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  // Suffix for occurrence index
  const ocurSuffix = ocurr_idx !== undefined ? `_o${ocurr_idx}` : '';

  // If we have a stable comprobante numeric ID, append or use it to enforce extreme uniqueness
  if (normComprobante && normComprobante.length > 2) {
    return `tx_${normCuenta}_${normFecha}_${normHora}_v${normValor}_c${normComprobante}${ocurSuffix}`;
  }

  return `tx_${normCuenta}_${normFecha}_${normHora}_v${normValor}_${normDesc}${ocurSuffix}`;
}
