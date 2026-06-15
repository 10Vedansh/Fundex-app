import { useState, useEffect, useCallback, useMemo } from 'react';
import { MutualFund } from '@/types/mutualFund';
import { fetchFundMasterFunds } from '@/utils/fundMasterAdapter';

const LOCAL_CACHE_KEY = 'fundex_fund_master_cache';

interface LocalCache {
  funds: MutualFund[];
  timestamp: string;
}

export function useFundMaster() {
  const [funds, setFunds] = useState<MutualFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [amcFilter, setAmcFilter] = useState('');

  const loadLocalCache = useCallback((): LocalCache | null => {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch { /* ignore */ }
    return null;
  }, []);

  const saveLocalCache = useCallback((funds: MutualFund[]) => {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({
        funds,
        timestamp: new Date().toISOString(),
      }));
    } catch { /* ignore */ }
  }, []);

  const fetchFunds = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // Try local cache first
      if (!forceRefresh) {
        const local = loadLocalCache();
        if (local && local.funds.length > 0) {
          setFunds(local.funds);
          setIsLoading(false);
          // Check if cache is stale (> 1 hour)
          const age = Date.now() - new Date(local.timestamp).getTime();
          if (age < 3600000) return; // 1 hour
        }
      }

      // Fetch from API
      const result = await fetchFundMasterFunds({
        perPage: 2000,
        activeOnly: false,
        sortBy: 'scheme_code',
      });

      if (result.funds.length > 0) {
        setFunds(result.funds);
        saveLocalCache(result.funds);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fund data');
      // Fall back to local cache
      const local = loadLocalCache();
      if (local && local.funds.length > 0) {
        setFunds(local.funds);
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadLocalCache, saveLocalCache]);

  useEffect(() => {
    fetchFunds();
  }, [fetchFunds]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const f of funds) {
      if (f.category) cats.add(f.category);
    }
    return Array.from(cats).sort();
  }, [funds]);

  const amcs = useMemo(() => {
    const amcs = new Set<string>();
    for (const f of funds) {
      if (f.amc) amcs.add(f.amc);
    }
    return Array.from(amcs).sort();
  }, [funds]);

  const filteredFunds = useMemo(() => {
    let result = funds;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.amc.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      result = result.filter(f => f.category === categoryFilter);
    }
    if (amcFilter) {
      result = result.filter(f => f.amc === amcFilter);
    }
    return result;
  }, [funds, search, categoryFilter, amcFilter]);

  return {
    funds: filteredFunds,
    allFunds: funds,
    isLoading,
    error,
    categories,
    amcs,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    amcFilter,
    setAmcFilter,
    refresh: () => fetchFunds(true),
  };
}
