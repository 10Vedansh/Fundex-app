// Display utility: format number or show "NA" for null/undefined/0 when the metric is unavailable
export function fmtOrNA(val: number | null | undefined, decimals = 1, suffix = ''): string {
  if (val === null || val === undefined) return 'NA';
  return `${val > 0 && suffix === '%' ? '+' : ''}${val.toFixed(decimals)}${suffix}`;
}

export function fmtCrOrNA(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'NA';
  return `₹${val.toLocaleString()}`;
}

// For recommendation model: treat null as 0
export function safeNum(val: number | null | undefined): number {
  return val ?? 0;
}

// Format launch date robustly. Excel may store dates as:
//  - serial numbers (e.g. "45123")
//  - JS Date toString output (e.g. "Mon Jan 04 2026 00:00:00 GMT+0000")
//  - MM/DD/YYYY (US, the source format)
//  - ISO strings (YYYY-MM-DD)
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateParts(y: number, m: number, d: number): string {
  if (m < 1 || m > 12 || d < 1 || d > 31) return '';
  return `${d.toString().padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}

export function formatLaunchDate(raw: unknown): string {
  if (raw === null || raw === undefined) return 'NA';
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return formatDateParts(raw.getUTCFullYear(), raw.getUTCMonth() + 1, raw.getUTCDate()) || 'NA';
  }
  const s = String(raw).trim();
  if (!s) return 'NA';

  // Excel serial number (days since 1899-12-30)
  const numeric = typeof raw === 'number' ? raw : Number(s.replace(/,/g, ''));
  if (Number.isFinite(numeric) && /^\d{4,6}(\.\d+)?$/.test(s.replace(/,/g, ''))) {
    const serial = numeric;
    if (serial > 59 && serial < 80000) {
      const epoch = Date.UTC(1899, 11, 30);
      const ms = epoch + serial * 86400000;
      const dt = new Date(ms);
      return formatDateParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()) || s;
    }
  }

  // MM/DD/YYYY or M/D/YYYY (or with "-")
  const us = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (us) {
    let [, m, d, y] = us;
    let yearNum = parseInt(y);
    if (yearNum < 100) yearNum += 2000;
    const out = formatDateParts(yearNum, parseInt(m), parseInt(d));
    if (out) return out;
  }

  // ISO YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const out = formatDateParts(parseInt(iso[1]), parseInt(iso[2]), parseInt(iso[3]));
    if (out) return out;
  }

  // JS Date toString fallback
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return formatDateParts(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate()) || s;
  }

  return s;
}
