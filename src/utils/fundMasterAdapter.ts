import { MutualFund } from '@/types/mutualFund';
import { supabase } from '@/integrations/supabase/client';

export interface FundMasterRow {
  scheme_code: string;
  scheme_name: string | null;
  workbook_name: string | null;
  amc: string | null;
  category: string | null;
  workbook_id: string | null;
  match_confidence: string | null;
  match_method: string | null;
  expense_ratio: number | null;
  aum: number | null;
  fund_manager: string | null;
  beta: number | null;
  alpha: number | null;
  std_dev: number | null;
  is_active: boolean | null;
  launch_date: string | null;
  last_nav_date: string | null;
  first_nav_date: string | null;
  total_data_points: number | null;
  return_1m: number | null;
  return_3m: number | null;
  return_6m: number | null;
  cagr_1y: number | null;
  cagr_3y: number | null;
  cagr_5y: number | null;
  volatility_1y: number | null;
  volatility_3y: number | null;
  volatility_5y: number | null;
  max_drawdown: number | null;
  sharpe_ratio_1y: number | null;
  sharpe_ratio_3y: number | null;
  sharpe_ratio_5y: number | null;
  sortino_ratio_1y: number | null;
  sortino_ratio_3y: number | null;
  sortino_ratio_5y: number | null;
  consistency_score: number | null;
  confidence_score: number | null;
  recommendation_score: number | null;
  net_assets: number | null;
  turnover: number | null;
  min_investment: number | null;
  exit_load: string | null;
  benchmark: string | null;
  avg_credit_quality: string | null;
  avg_maturity: number | null;
  ytm: number | null;
  ret_1w: number | null;
  ret_1y_overall: number | null;
  ret_3y_overall: number | null;
  ret_5y_overall: number | null;
  ret_10y_overall: number | null;
  matched_at: string | null;
  fund_master_updated_at: string | null;
  metrics_last_calculated: string | null;
}

export function toMutualFund(row: FundMasterRow): MutualFund {
  const name = row.workbook_name || row.scheme_name || 'Unknown Fund';
  return {
    id: row.workbook_id || row.scheme_code,
    name,
    category: row.category || '',
    amc: row.amc || '',
    nav: 0,
    aum: row.aum ?? row.net_assets ?? 0,
    expenseRatio: row.expense_ratio ?? 0,
    cagr1Y: row.cagr_1y ?? 0,
    cagr3Y: row.cagr_3y ?? 0,
    cagr5Y: row.cagr_5y ?? 0,
    volatility: row.volatility_3y ?? row.volatility_1y ?? row.std_dev ?? 0,
    sharpeRatio: row.sharpe_ratio_3y ?? row.sharpe_ratio_1y ?? 0,
    beta: row.beta ?? 0,
    alpha: row.alpha ?? 0,
    rank: 0,
    strengthBadge: 'Balanced' as const,
    riskLevel: 'Moderate' as const,
    minInvestment: row.min_investment ?? 0,
    exitLoad: row.exit_load ?? '',
    benchmark: row.benchmark ?? '',
    launch: row.launch_date ?? null,
    marketCap: null,
    latestNav: null,
    previousNav: null,
    high52W: null,
    low52W: null,
    turnover: row.turnover ?? null,
    stdDev: row.std_dev ?? null,
    sortinoRatio: row.sortino_ratio_3y ?? row.sortino_ratio_1y ?? null,
    infoRatio: null,
    rSquared: null,
    fundManager: row.fund_manager ?? null,
    ret1W: row.ret_1w ?? null,
    ret1M: row.return_1m ?? null,
    ret3M: row.return_3m ?? null,
    ret6M: row.return_6m ?? null,
    ret1Y: row.ret_1y_overall ?? row.cagr_1y ?? null,
    ret3Y: row.ret_3y_overall ?? row.cagr_3y ?? null,
    ret5Y: row.ret_5y_overall ?? row.cagr_5y ?? null,
    ret10Y: row.ret_10y_overall ?? null,
    avgCreditQuality: row.avg_credit_quality ?? null,
    avgMaturity: row.avg_maturity ?? null,
    ytm: row.ytm ?? null,
    netAssets: row.aum ?? row.net_assets ?? null,
  };
}

export function toMutualFunds(rows: FundMasterRow[]): MutualFund[] {
  return rows.map(toMutualFund);
}

export async function fetchFundMasterFunds(options?: {
  page?: number;
  perPage?: number;
  search?: string;
  category?: string;
  amc?: string;
  activeOnly?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}): Promise<{ funds: MutualFund[]; total: number; page: number; totalPages: number }> {
  const params = new URLSearchParams();
  params.set('source', 'master');
  if (options?.page) params.set('page', String(options.page));
  if (options?.perPage) params.set('per_page', String(options.perPage));
  if (options?.search) params.set('search', options.search);
  if (options?.category) params.set('category', options.category);
  if (options?.amc) params.set('amc', options.amc);
  if (options?.activeOnly !== undefined) params.set('active_only', String(options.activeOnly));
  if (options?.sortBy) params.set('sort_by', options.sortBy);
  if (options?.sortDir) params.set('sort_dir', options.sortDir);

  const { data, error } = await supabase.functions.invoke(`fetch-fund-data?${params.toString()}`);

  if (error) throw new Error(error.message || 'Failed to fetch fund master data');
  if (!data?.funds) throw new Error('No data returned');

  return {
    funds: toMutualFunds(data.funds as FundMasterRow[]),
    total: data.count || 0,
    page: data.page || 1,
    totalPages: data.totalPages || 0,
  };
}
