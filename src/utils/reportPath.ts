const REPORT_CATEGORIES = [
  'architecture',
  'audits',
  'migrations',
  'metrics',
  'portfolio',
  'recommendation-engine',
  'nav-pipeline',
  'deployment',
  'archive',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

const CATEGORY_MAP: Record<string, ReportCategory> = {
  architecture: 'architecture',
  'final-data-architecture': 'architecture',

  audit: 'audits',
  audits: 'audits',

  migration: 'migrations',
  migrations: 'migrations',

  metric: 'metrics',
  metrics: 'metrics',

  portfolio: 'portfolio',

  'recommendation': 'recommendation-engine',
  'recommendation-engine': 'recommendation-engine',
  'recommendationEngine': 'recommendation-engine',
  scoring: 'recommendation-engine',
  'confidence-audit': 'recommendation-engine',
  'explainability': 'recommendation-engine',
  'candidate-pool': 'recommendation-engine',

  'nav-pipeline': 'nav-pipeline',
  nav: 'nav-pipeline',

  deploy: 'deployment',
  deployment: 'deployment',

  archive: 'archive',
};

const REPORTS_ROOT = 'reports';

/**
 * Resolve a consistent output path for a report file.
 *
 * @param category - The report category (fuzzy-matched to a subfolder).
 * @param filename - The report file name (e.g. "audit_report.md").
 * @returns The relative path from the project root, e.g. "reports/metrics/fund_metrics_migration_report.md".
 */
export function getReportPath(category: string, filename: string): string {
  const normalized = CATEGORY_MAP[category.trim().toLowerCase()] ?? 'archive';
  return `${REPORTS_ROOT}/${normalized}/${filename}`;
}
