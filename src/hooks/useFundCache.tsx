import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MutualFund } from '@/types/mutualFund';
import { toast } from 'sonner';

const LOCAL_CACHE_KEY = 'fundex_mf_cache';

// Check if we should refresh based on 9:30 PM IST logic
const shouldRefreshCache = (lastUpdated: Date): boolean => {
  const now = new Date();
  
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(now.getTime() + istOffset);
  const lastUpdatedIST = new Date(lastUpdated.getTime() + istOffset);
  
  // Get today's 9:30 PM IST
  const today930PM = new Date(nowIST);
  today930PM.setHours(21, 30, 0, 0);
  
  // If current time is after 9:30 PM IST and last update was before 9:30 PM today
  if (nowIST > today930PM && lastUpdatedIST < today930PM) {
    return true;
  }
  
  // If last update was more than 24 hours ago
  const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
  if (hoursSinceUpdate > 24) {
    return true;
  }
  
  return false;
};

interface LocalCache {
  funds: MutualFund[];
  lastUpdated: string;
}

export function useFundCache() {
  console.log('[CIFRAA-FUNDS] Hook initialized', { initialState: 'funds=[], isLoading=true' });
  const [funds, setFunds] = useState<MutualFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load from local storage first for instant display
  const loadFromLocalCache = (): LocalCache | null => {
    console.log('[CIFRAA-FUNDS] loadFromLocalCache: reading localStorage key', LOCAL_CACHE_KEY);
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      console.log('[CIFRAA-FUNDS] loadFromLocalCache: raw value', cached ? `${cached.substring(0, 100)}...` : 'null');
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('[CIFRAA-FUNDS] loadFromLocalCache: parsed', { fundCount: parsed.funds?.length, lastUpdated: parsed.lastUpdated });
        return parsed;
      }
    } catch (err) {
      console.error('[CIFRAA-FUNDS] Error loading local cache:', err);
    }
    return null;
  };

  // Save to local storage
  const saveToLocalCache = (data: MutualFund[], updatedAt: string) => {
    console.log('[CIFRAA-FUNDS] saveToLocalCache: saving', { fundCount: data.length, updatedAt });
    try {
      const cache: LocalCache = {
        funds: data,
        lastUpdated: updatedAt,
      };
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
    } catch (err) {
      console.error('[CIFRAA-FUNDS] Error saving to local cache:', err);
    }
  };

  // Fetch cached data from Supabase (fast - no external API calls)
  const fetchCachedData = async (): Promise<{ funds: MutualFund[]; lastUpdated: string } | null> => {
    console.log('[CIFRAA-FUNDS] fetchCachedData: entered');
    try {
      // Use query params via URL with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      console.log('[CIFRAA-FUNDS] fetchCachedData: ABOUT TO INVOKE supabase.functions.invoke(fetch-fund-data?action=cached)');
      const response = await supabase.functions.invoke('fetch-fund-data?action=cached');
      clearTimeout(timeoutId);
      console.log('[CIFRAA-FUNDS] fetchCachedData: AFTER INVOKE', { error: response.error ? String(response.error) : 'null', hasData: !!response.data, fundCount: response.data?.funds?.length, lastUpdated: response.data?.lastUpdated });
      
      if (response.error) throw response.error;
      if (!response.data?.funds || response.data.funds.length === 0) {
        return null;
      }
      
      return {
        funds: response.data.funds as MutualFund[],
        lastUpdated: response.data.lastUpdated,
      };
    } catch (err) {
      console.error('[CIFRAA-FUNDS] fetchCachedData CATCH BLOCK:', err);
      return null;
    }
  };

  // Trigger full refresh via OneDrive sync
  const triggerFullRefresh = async (): Promise<{ funds: MutualFund[]; lastUpdated: string } | null> => {
    console.log('[CIFRAA-FUNDS] triggerFullRefresh: entered');
    try {
      // First try OneDrive sync (pulls latest data from your Excel sheet)
      console.log('[CIFRAA-FUNDS] triggerFullRefresh: ABOUT TO INVOKE supabase.functions.invoke(sync-onedrive)');
      const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-onedrive');
      console.log('[CIFRAA-FUNDS] triggerFullRefresh: sync-onedrive AFTER INVOKE', { error: syncError ? String(syncError) : 'null', success: syncData?.success, totalFunds: syncData?.totalFunds });
      
      if (!syncError && syncData?.success && syncData?.totalFunds > 0) {
        // After sync, fetch the updated cache
        const cachedResult = await fetchCachedData();
        if (cachedResult) return cachedResult;
      }
      
      // Fallback to old fetch-fund-data full refresh
      console.log('[CIFRAA-FUNDS] triggerFullRefresh: ABOUT TO INVOKE supabase.functions.invoke(fetch-fund-data?action=full)');
      const { data, error } = await supabase.functions.invoke('fetch-fund-data?action=full');
      console.log('[CIFRAA-FUNDS] triggerFullRefresh: fetch-fund-data?action=full AFTER INVOKE', { error: error ? String(error) : 'null', fundCount: data?.funds?.length, lastUpdated: data?.lastUpdated });
      if (error) throw error;
      if (!data?.funds || data.funds.length === 0) {
        throw new Error('No funds returned from refresh');
      }
      
      return {
        funds: data.funds as MutualFund[],
        lastUpdated: data.lastUpdated,
      };
    } catch (err) {
      console.error('[CIFRAA-FUNDS] triggerFullRefresh CATCH BLOCK:', err);
      return null;
    }
  };

  // Fallback to old mfapi function if new one fails (with timeout)
  const fetchFromLegacyAPI = async (): Promise<MutualFund[]> => {
    console.log('[CIFRAA-FUNDS] fetchFromLegacyAPI: entered');
    try {
      console.log('[CIFRAA-FUNDS] fetchFromLegacyAPI: ABOUT TO INVOKE supabase.functions.invoke(mfapi)');
      const { data, error } = await supabase.functions.invoke('mfapi');
      console.log('[CIFRAA-FUNDS] fetchFromLegacyAPI: mfapi AFTER INVOKE', { error: error ? String(error) : 'null', fundCount: data?.funds?.length });
      if (error) throw error;
      if (!data?.funds || data.funds.length === 0) {
        throw new Error('No funds returned');
      }
      return data.funds;
    } catch (err) {
      console.error('[CIFRAA-FUNDS] fetchFromLegacyAPI CATCH BLOCK:', err);
      throw err;
    }
  };

  // Main fetch function - API only, no mock data fallback
  const fetchFunds = useCallback(async (forceRefresh = false) => {
    console.log('[CIFRAA-FUNDS] fetchFunds: ENTERED', { forceRefresh });
    setIsLoading(true);
    
    try {
      // Step 1: Load from local cache for instant display
      console.log('[CIFRAA-FUNDS] fetchFunds: Step 1 - BEFORE loadFromLocalCache');
      const localCache = loadFromLocalCache();
      console.log('[CIFRAA-FUNDS] fetchFunds: Step 1 - AFTER loadFromLocalCache', localCache ? { fundCount: localCache.funds.length, lastUpdated: localCache.lastUpdated } : 'null');
      if (localCache && localCache.funds.length > 0 && !forceRefresh) {
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 1 - ENTERED block (local cache has data, not forceRefresh)', { fundCount: localCache.funds.length });
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 1 - BEFORE setFunds(localCache.funds)');
        setFunds(localCache.funds);
        setLastUpdated(new Date(localCache.lastUpdated));
        setIsLiveData(true);
        
        // Check if we need to refresh
        const cacheDate = new Date(localCache.lastUpdated);
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 1 - shouldRefreshCache check', { lastUpdated: localCache.lastUpdated, cacheDate: cacheDate.toISOString(), shouldRefresh: shouldRefreshCache(cacheDate) });
        if (!shouldRefreshCache(cacheDate)) {
          console.log('[CIFRAA-FUNDS] fetchFunds: Step 1 - EARLY RETURN (cache fresh, no network request needed)', { fundCount: localCache.funds.length, lastUpdated: localCache.lastUpdated });
          setIsLoading(false);
          return; // Cache is still valid
        }
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 1 - cache is STALE, falling through to Step 2');
      } else {
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 1 - SKIPPED block', { hasLocalCache: !!localCache, fundCount: localCache?.funds?.length, forceRefresh });
      }

      // Step 2: Try to get data from Supabase cache (fast)
      console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - entered', { forceRefresh });
      if (!forceRefresh) {
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - BEFORE fetchCachedData()');
        const cachedData = await fetchCachedData();
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - AFTER fetchCachedData()', cachedData ? { fundCount: cachedData.funds.length, lastUpdated: cachedData.lastUpdated } : 'null');
        if (cachedData && cachedData.funds.length > 0) {
          console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - cache data received, BEFORE setFunds', { fundCount: cachedData.funds.length });
          setFunds(cachedData.funds);
          setIsLiveData(true);
          setLastUpdated(new Date(cachedData.lastUpdated));
          saveToLocalCache(cachedData.funds, cachedData.lastUpdated);
          
          // Check if background refresh needed
          const cacheDate = new Date(cachedData.lastUpdated);
          console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - shouldRefreshCache check', { cacheDate: cacheDate.toISOString(), shouldRefresh: shouldRefreshCache(cacheDate) });
          if (!shouldRefreshCache(cacheDate)) {
            console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - EARLY RETURN (Supabase cache fresh)', { fundCount: cachedData.funds.length });
            setIsLoading(false);
            return;
          }
          
          // Trigger background refresh (don't await)
          console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - cache stale, triggering background refresh...');
          triggerFullRefresh().then(result => {
            console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - background refresh result', result ? { fundCount: result.funds.length, lastUpdated: result.lastUpdated } : 'null');
            if (result) {
              console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - background refresh BEFORE setFunds', { fundCount: result.funds.length });
              setFunds(result.funds);
              setLastUpdated(new Date(result.lastUpdated));
              saveToLocalCache(result.funds, result.lastUpdated);
              console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - Background refresh complete');
            }
          }).catch(err => console.error('[CIFRAA-FUNDS] fetchFunds: Step 2 - background refresh error:', err));
          
          console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - EARLY RETURN (rendering stale cache, background refresh fired)');
          setIsLoading(false);
          return;
        }
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - no data from cache, falling to Step 3');
      } else {
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 2 - SKIPPED (forceRefresh=true)');
      }

      // Step 3: Force refresh or no cache - fetch from APIs
      console.log('[CIFRAA-FUNDS] fetchFunds: Step 3 - entered', { forceRefresh });
      if (forceRefresh) {
        toast.info('Refreshing fund data from API...');
      }
      
      // Try full refresh first (AMFI + MFAPI)
      console.log('[CIFRAA-FUNDS] fetchFunds: Step 3 - BEFORE triggerFullRefresh()');
      const freshData = await triggerFullRefresh();
      console.log('[CIFRAA-FUNDS] fetchFunds: Step 3 - triggerFullRefresh result', freshData ? { fundCount: freshData.funds.length, lastUpdated: freshData.lastUpdated } : 'null');
      if (freshData && freshData.funds.length > 0) {
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 3 - full refresh got data, BEFORE setFunds', { fundCount: freshData.funds.length });
        setFunds(freshData.funds);
        setIsLiveData(true);
        setLastUpdated(new Date(freshData.lastUpdated));
        saveToLocalCache(freshData.funds, freshData.lastUpdated);
        
        if (forceRefresh) {
          toast.success(`Loaded ${freshData.funds.length} funds from API`);
        }
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 3 - EARLY RETURN (full refresh got data)');
        setIsLoading(false);
        return;
      }

      // If full refresh fails, try legacy API
      console.log('[CIFRAA-FUNDS] fetchFunds: Step 3 - full refresh returned no data, trying legacy...');
      const legacyFunds = await fetchFromLegacyAPI();
      console.log('[CIFRAA-FUNDS] fetchFunds: Step 3 - fetchFromLegacyAPI result', legacyFunds ? { fundCount: legacyFunds.length } : 'null');
      if (legacyFunds && legacyFunds.length > 0) {
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 3 - legacy API got data, BEFORE setFunds', { fundCount: legacyFunds.length });
        setFunds(legacyFunds);
        setIsLiveData(true);
        setLastUpdated(new Date());
        saveToLocalCache(legacyFunds, new Date().toISOString());
        
        if (forceRefresh) {
          toast.success(`Loaded ${legacyFunds.length} funds from API`);
        }
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 3 - EARLY RETURN (legacy API got data)');
        setIsLoading(false);
        return;
      }

      // If both fail but we have local cache, use it
      console.log('[CIFRAA-FUNDS] fetchFunds: Step 3 - all network sources failed, checking local cache fallback');
      if (localCache && localCache.funds.length > 0) {
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 3 - using local cache fallback, BEFORE setFunds', { fundCount: localCache.funds.length });
        setFunds(localCache.funds);
        setIsLiveData(true);
        setLastUpdated(new Date(localCache.lastUpdated));
        toast.info('Using cached data');
        console.log('[CIFRAA-FUNDS] fetchFunds: Step 3 - EARLY RETURN (local cache fallback)');
        setIsLoading(false);
        return;
      }

      // No data available
      console.log('[CIFRAA-FUNDS] fetchFunds: NO DATA AVAILABLE - BEFORE setFunds([])');
      toast.error('Unable to fetch fund data. Please try again later.');
      setFunds([]);
      setIsLiveData(false);
    } catch (err) {
      console.error('[CIFRAA-FUNDS] fetchFunds: CATCH BLOCK - error:', err);
      
      // Fall back to local cache only
      console.log('[CIFRAA-FUNDS] fetchFunds: CATCH - trying local cache fallback');
      const localCache = loadFromLocalCache();
      if (localCache && localCache.funds.length > 0) {
        console.log('[CIFRAA-FUNDS] fetchFunds: CATCH - using local cache, BEFORE setFunds', { fundCount: localCache.funds.length });
        setFunds(localCache.funds);
        setIsLiveData(true);
        toast.info('Using cached data');
      } else {
        console.log('[CIFRAA-FUNDS] fetchFunds: CATCH - no local cache either, BEFORE setFunds([])');
        toast.error('Failed to fetch fund data. Please try again.');
        setFunds([]);
        setIsLiveData(false);
      }
    } finally {
      console.log('[CIFRAA-FUNDS] fetchFunds: FINALLY - setIsLoading(false)');
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    console.log('[CIFRAA-FUNDS] useEffect: initial load triggering fetchFunds()');
    fetchFunds();
  }, [fetchFunds]);

  console.log('[CIFRAA-FUNDS] Hook returning values', { fundCount: funds.length, isLoading, isLiveData, lastUpdated: lastUpdated?.toISOString() });
  return {
    funds,
    isLoading,
    isLiveData,
    lastUpdated,
    refreshFunds: () => {
      console.log('[CIFRAA-FUNDS] refreshFunds called (forceRefresh=true)');
      return fetchFunds(true);
    },
  };
}
