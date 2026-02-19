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
