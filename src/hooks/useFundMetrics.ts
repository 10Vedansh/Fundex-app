import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FundMetricsRow {
  scheme_code: string;
  scheme_name: string;
  category: string | null;
  amc: string | null;
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
  expense_ratio: number | null;
  net_assets: number | null;
  first_nav_date: string | null;
  last_nav_date: string | null;
  total_data_points: number | null;
}

interface UseFundMetricsReturn {
  allMetrics: FundMetricsRow[];
  activeFunds: FundMetricsRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getByCategory: (category: string) => FundMetricsRow[];
  getByAmc: (amc: string) => FundMetricsRow[];
  topByCagr: (period: "1y" | "3y" | "5y", limit?: number) => FundMetricsRow[];
  topBySharpe: (period: "1y" | "3y" | "5y", limit?: number) => FundMetricsRow[];
  stats: {
    total: number;
    active: number;
    byCategory: Record<string, number>;
    byAmc: Record<string, number>;
  } | null;
}

const ACTIVE_THRESHOLD_DAYS = 730;

export function useFundMetrics(): UseFundMetricsReturn {
  const [allMetrics, setAllMetrics] = useState<FundMetricsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - ACTIVE_THRESHOLD_DAYS);

      const { data, error: err } = await supabase
        .from("fund_master_enriched")
        .select("*")
        .order("scheme_code")
        .limit(100000);

      if (err) throw err;

      const rows = (data || []) as unknown as FundMetricsRow[];
    
      setAllMetrics(rows);
    } catch (e: any) {
      console.error("[useFundMetrics] fetch error:", e);
      setError(e.message || "Failed to load fund metrics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const activeFunds = useMemo(() => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - ACTIVE_THRESHOLD_DAYS);
    const thresholdStr = threshold.toISOString().split("T")[0];
    return allMetrics.filter(
      (m) =>
        m.last_nav_date &&
        m.last_nav_date >= thresholdStr &&
        (m.total_data_points ?? 0) >= 60,
    );
  }, [allMetrics]);

  const stats = useMemo(() => {
    if (allMetrics.length === 0) return null;
    const byCategory: Record<string, number> = {};
    const byAmc: Record<string, number> = {};
    for (const m of allMetrics) {
      if (m.category) byCategory[m.category] = (byCategory[m.category] || 0) + 1;
      if (m.amc) byAmc[m.amc] = (byAmc[m.amc] || 0) + 1;
    }
    return {
      total: allMetrics.length,
      active: activeFunds.length,
      byCategory,
      byAmc,
    };
  }, [allMetrics, activeFunds]);

  const getByCategory = useCallback(
    (category: string) => allMetrics.filter((m) => m.category === category),
    [allMetrics],
  );

  const getByAmc = useCallback(
    (amc: string) => allMetrics.filter((m) => m.amc === amc),
    [allMetrics],
  );

  const topByCagr = useCallback(
    (period: "1y" | "3y" | "5y", limit = 10) => {
      const col = period === "1y" ? "cagr_1y" : period === "3y" ? "cagr_3y" : "cagr_5y";
      return [...activeFunds]
        .filter((m) => m[col] !== null)
        .sort((a, b) => (b[col] ?? 0) - (a[col] ?? 0))
        .slice(0, limit);
    },
    [activeFunds],
  );

  const topBySharpe = useCallback(
    (period: "1y" | "3y" | "5y", limit = 10) => {
      const col = period === "1y" ? "sharpe_ratio_1y" : period === "3y" ? "sharpe_ratio_3y" : "sharpe_ratio_5y";
      return [...activeFunds]
        .filter((m) => m[col] !== null)
        .sort((a, b) => (b[col] ?? 0) - (a[col] ?? 0))
        .slice(0, limit);
    },
    [activeFunds],
  );

  return {
    allMetrics,
    activeFunds,
    isLoading,
    error,
    refresh: fetchMetrics,
    getByCategory,
    getByAmc,
    topByCagr,
    topBySharpe,
    stats,
  };
}
