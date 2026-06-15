import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback } from 'react';
import { MutualFund } from '@/types/mutualFund';
import { fetchFundMasterFunds } from '@/utils/fundMasterAdapter';
import { toast } from 'sonner';

const LOCAL_CACHE_KEY = 'fundex_mf_cache';

interface LocalCache {
  funds: MutualFund[];
  lastUpdated: string;
}

export function useFundCache() {
  const [funds, setFunds] = useState<MutualFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load from local storage
  const loadFromLocalCache = (): LocalCache | null => {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch { /* ignore */ }
    return null;
  };

  const saveToLocalCache = (data: MutualFund[], updatedAt: string) => {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({ funds: data, lastUpdated: updatedAt }));
    } catch { /* ignore */ }
  };

  // Primary: fetch from fund_master (source=master)
  const fetchFromFundMaster = async (): Promise<{ funds: MutualFund[]; lastUpdated: string } | null> => {
    try {
      const result = await fetchFundMasterFunds({ perPage: 4000, activeOnly: false });
      if (result.funds.length > 0) {
        return { funds: result.funds, lastUpdated: new Date().toISOString() };
      }
    } catch { /* ignore */ }
    return null;
  };

  // Fallback: fetch cached workbook data
  const fetchCachedData = async (): Promise<{ funds: MutualFund[]; lastUpdated: string } | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await supabase.functions.invoke('fetch-fund-data?action=cached');
      clearTimeout(timeoutId);
      if (response.error) throw response.error;
      if (!response.data?.funds || response.data.funds.length === 0) return null;
      return { funds: response.data.funds as MutualFund[], lastUpdated: response.data.lastUpdated };
    } catch { return null; }
  };

  // Fallback: full workbook+AMFI refresh
  const triggerFullRefresh = async (): Promise<{ funds: MutualFund[]; lastUpdated: string } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-fund-data?action=full');
      if (error) throw error;
      if (!data?.funds || data.funds.length === 0) return null;
      return { funds: data.funds as MutualFund[], lastUpdated: data.lastUpdated };
    } catch { return null; }
  };

  // Fallback: legacy mfapi
  const fetchFromLegacyAPI = async (): Promise<MutualFund[]> => {
    const { data, error } = await supabase.functions.invoke('mfapi');
    if (error) throw error;
    if (!data?.funds || data.funds.length === 0) throw new Error('No funds returned');
    return data.funds;
  };

  // Main fetch
  const fetchFunds = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);

    try {
      // Load local cache for instant display
      const localCache = loadFromLocalCache();
      if (localCache && localCache.funds.length > 0 && !forceRefresh) {
        setFunds(localCache.funds);
        setLastUpdated(new Date(localCache.lastUpdated));
        setIsLiveData(true);
        setIsLoading(false);
        return;
      }

      // Primary: fund_master
      let result: { funds: MutualFund[]; lastUpdated: string } | null = null;

      if (!forceRefresh) {
        result = await fetchFromFundMaster();
        if (result) {
          setFunds(result.funds);
          setLastUpdated(new Date(result.lastUpdated));
          saveToLocalCache(result.funds, result.lastUpdated);
          setIsLiveData(true);
          setIsLoading(false);
          return;
        }

        // Fallback: workbook cache
        result = await fetchCachedData();
        if (result) {
          setFunds(result.funds);
          setLastUpdated(new Date(result.lastUpdated));
          saveToLocalCache(result.funds, result.lastUpdated);
          setIsLiveData(true);
          setIsLoading(false);
          return;
        }
      }

      // Force refresh or no cache found
      result = await triggerFullRefresh();
      if (result) {
        setFunds(result.funds);
        setLastUpdated(new Date(result.lastUpdated));
        saveToLocalCache(result.funds, result.lastUpdated);
        setIsLiveData(true);
        setIsLoading(false);
        return;
      }

      // Legacy API fallback
      const legacyFunds = await fetchFromLegacyAPI();
      if (legacyFunds.length > 0) {
        setFunds(legacyFunds);
        setLastUpdated(new Date());
        saveToLocalCache(legacyFunds, new Date().toISOString());
        setIsLiveData(true);
        setIsLoading(false);
        return;
      }

      // Last resort: local cache
      if (localCache && localCache.funds.length > 0) {
        setFunds(localCache.funds);
        setIsLiveData(true);
        toast.info('Using cached data');
      } else {
        toast.error('Unable to fetch fund data.');
        setFunds([]);
        setIsLiveData(false);
      }
    } catch {
      const localCache = loadFromLocalCache();
      if (localCache && localCache.funds.length > 0) {
        setFunds(localCache.funds);
        setIsLiveData(true);
      } else {
        setFunds([]);
        setIsLiveData(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchFunds(); }, [fetchFunds]);

  return {
    funds,
    isLoading,
    isLiveData,
    lastUpdated,
    refreshFunds: () => fetchFunds(true),
  };
}
