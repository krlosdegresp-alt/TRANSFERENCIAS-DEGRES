/**
 * Formats a number as Colombian Peso (COP) currency.
 * Example: 543000 -> "$543.000" or "$543,000 COP"
 */
export function formatCOP(value: number): string {
  const hasDecimals = Math.abs(value % 1) > 0.001;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Formats a date string representation to a human-readable layout.
 * Example: "2026-06-19" -> "19 Jun, 2026"
 */
export function formatDateHuman(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  const day = parts[2];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${day} ${months[monthIdx]} ${year}`;
  }
  return dateStr;
}

/**
 * Normalizes description text: capitals, cleaning redundant spaces.
 */
export function formatDescription(desc: string): string {
  if (!desc) return '';
  return desc.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Returns the current date and time in Colombia (UTC-5) as formatted strings.
 */
export function getColombiaDateTime(): { dateStr: string; dateTimeStr: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
  
  const yyyy = partMap.year;
  const mm = partMap.month;
  const dd = partMap.day;
  // Handle case where hour is 24 instead of 00 or has leading spaces
  let hh = partMap.hour ? partMap.hour.trim() : '00';
  if (hh === '24') hh = '00';
  if (hh.length === 1) hh = '0' + hh;
  const min = partMap.minute ? partMap.minute.trim() : '00';
  const ss = partMap.second ? partMap.second.trim() : '00';
  
  const cleanDateStr = `${yyyy}-${mm}-${dd}`;
  const cleanDateTimeStr = `${yyyy}-${mm}-${dd} ${hh}:${cleanDateStr ? min : '00'}:${cleanDateStr ? ss : '00'}`;
  
  return {
    dateStr: cleanDateStr,
    dateTimeStr: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
  };
}

/**
 * Converts a 24-hour time string "HH:MM:SS" to 12-hour AM/PM format "HH:MM:SS AM/PM"
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  
  let hh = parseInt(parts[0], 10);
  const min = parts[1];
  const ss = parts[2] || '00';
  
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12;
  hh = hh ? hh : 12; // 0 hour should be 12
  
  const hhStr = hh < 10 ? '0' + hh : hh.toString();
  return `${hhStr}:${min}:${ss} ${ampm}`;
}

/**
 * Formats a date-time string YYYY-MM-DD HH:MM:SS to a human-friendly format with 12h clock.
 * Example: "2026-06-19 15:30:22" -> "19 Jun 2026 - 03:30:22 PM"
 */
export function formatDateTime12h(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return '';
  const parts = dateTimeStr.split(' ');
  if (parts.length < 2) return dateTimeStr;
  
  const datePart = parts[0];
  const timePart = parts[1];
  
  return `${formatDateHuman(datePart)} - ${formatTime12h(timePart)}`;
}


