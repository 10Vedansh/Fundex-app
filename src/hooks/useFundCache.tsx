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
  const [funds, setFunds] = useState<MutualFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load from local storage first for instant display
  const loadFromLocalCache = (): LocalCache | null => {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.error('Error loading local cache:', err);
    }
    return null;
  };

  // Save to local storage
  const saveToLocalCache = (data: MutualFund[], updatedAt: string) => {
    try {
      const cache: LocalCache = {
        funds: data,
        lastUpdated: updatedAt,
      };
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
    } catch (err) {
      console.error('Error saving to local cache:', err);
    }
  };

  // Fetch cached data from Supabase (fast - no external API calls)
  const fetchCachedData = async (): Promise<{ funds: MutualFund[]; lastUpdated: string } | null> => {
    try {
      // Use query params via URL with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await supabase.functions.invoke('fetch-fund-data?action=cached');
      clearTimeout(timeoutId);
      
      if (response.error) throw response.error;
      if (!response.data?.funds || response.data.funds.length === 0) {
        return null;
      }
      
      return {
        funds: response.data.funds as MutualFund[],
        lastUpdated: response.data.lastUpdated,
      };
    } catch (err) {
      console.error('Error fetching cached data:', err);
      return null;
    }
  };

  // Trigger full refresh via OneDrive sync
  const triggerFullRefresh = async (): Promise<{ funds: MutualFund[]; lastUpdated: string } | null> => {
    try {
      // First try OneDrive sync (pulls latest data from your Excel sheet)
      const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-onedrive');
      
      if (!syncError && syncData?.success && syncData?.totalFunds > 0) {
        // After sync, fetch the updated cache
        const cachedResult = await fetchCachedData();
        if (cachedResult) return cachedResult;
      }
      
      // Fallback to old fetch-fund-data full refresh
      const { data, error } = await supabase.functions.invoke('fetch-fund-data?action=full');
      if (error) throw error;
      if (!data?.funds || data.funds.length === 0) {
        throw new Error('No funds returned from refresh');
      }
      
      return {
        funds: data.funds as MutualFund[],
        lastUpdated: data.lastUpdated,
      };
    } catch (err) {
      console.error('Error during full refresh:', err);
      return null;
    }
  };

  // Fallback to old mfapi function if new one fails (with timeout)
  const fetchFromLegacyAPI = async (): Promise<MutualFund[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('mfapi');
      if (error) throw error;
      if (!data?.funds || data.funds.length === 0) {
        throw new Error('No funds returned');
      }
      return data.funds;
    } catch (err) {
      throw err;
    }
  };

  // Main fetch function - API only, no mock data fallback
  const fetchFunds = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    
    try {
      // Step 1: Load from local cache for instant display
      const localCache = loadFromLocalCache();
      if (localCache && localCache.funds.length > 0 && !forceRefresh) {
        setFunds(localCache.funds);
        setLastUpdated(new Date(localCache.lastUpdated));
        setIsLiveData(true);
        
        // Check if we need to refresh
        const cacheDate = new Date(localCache.lastUpdated);
        if (!shouldRefreshCache(cacheDate)) {
          setIsLoading(false);
          return; // Cache is still valid
        }
      }

      // Step 2: Try to get data from Supabase cache (fast)
      if (!forceRefresh) {
        const cachedData = await fetchCachedData();
        if (cachedData && cachedData.funds.length > 0) {
          setFunds(cachedData.funds);
          setIsLiveData(true);
          setLastUpdated(new Date(cachedData.lastUpdated));
          saveToLocalCache(cachedData.funds, cachedData.lastUpdated);
          
          // Check if background refresh needed
          const cacheDate = new Date(cachedData.lastUpdated);
          if (!shouldRefreshCache(cacheDate)) {
            setIsLoading(false);
            return;
          }
          
          // Trigger background refresh (don't await)
          console.log('Triggering background refresh...');
          triggerFullRefresh().then(result => {
            if (result) {
              setFunds(result.funds);
              setLastUpdated(new Date(result.lastUpdated));
              saveToLocalCache(result.funds, result.lastUpdated);
              console.log('Background refresh complete');
            }
          }).catch(console.error);
          
          setIsLoading(false);
          return;
        }
      }

      // Step 3: Force refresh or no cache - fetch from APIs
      if (forceRefresh) {
        toast.info('Refreshing fund data from API...');
      }
      
      // Try full refresh first (AMFI + MFAPI)
      console.log('Fetching fresh data from APIs...');
      const freshData = await triggerFullRefresh();
      if (freshData && freshData.funds.length > 0) {
        setFunds(freshData.funds);
        setIsLiveData(true);
        setLastUpdated(new Date(freshData.lastUpdated));
        saveToLocalCache(freshData.funds, freshData.lastUpdated);
        
        if (forceRefresh) {
          toast.success(`Loaded ${freshData.funds.length} funds from API`);
        }
        setIsLoading(false);
        return;
      }

      // If full refresh fails, try legacy API
      console.log('Trying legacy mfapi...');
      const legacyFunds = await fetchFromLegacyAPI();
      if (legacyFunds && legacyFunds.length > 0) {
        setFunds(legacyFunds);
        setIsLiveData(true);
        setLastUpdated(new Date());
        saveToLocalCache(legacyFunds, new Date().toISOString());
        
        if (forceRefresh) {
          toast.success(`Loaded ${legacyFunds.length} funds from API`);
        }
        setIsLoading(false);
        return;
      }

      // If both fail but we have local cache, use it
      if (localCache && localCache.funds.length > 0) {
        setFunds(localCache.funds);
        setIsLiveData(true);
        setLastUpdated(new Date(localCache.lastUpdated));
        toast.info('Using cached data');
        setIsLoading(false);
        return;
      }

      // No data available
      toast.error('Unable to fetch fund data. Please try again later.');
      setFunds([]);
      setIsLiveData(false);
    } catch (err) {
      console.error('Failed to fetch fund data:', err);
      
      // Fall back to local cache only
      const localCache = loadFromLocalCache();
      if (localCache && localCache.funds.length > 0) {
        setFunds(localCache.funds);
        setIsLiveData(true);
        toast.info('Using cached data');
      } else {
        toast.error('Failed to fetch fund data. Please try again.');
        setFunds([]);
        setIsLiveData(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchFunds();
  }, [fetchFunds]);

  return {
    funds,
    isLoading,
    isLiveData,
    lastUpdated,
    refreshFunds: () => fetchFunds(true),
  };
}
