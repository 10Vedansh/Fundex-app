import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { MutualFund } from '@/types/mutualFund';
import { toast } from 'sonner';
import { useNotifications } from './useNotifications';

interface WatchlistItem {
  id: string;
  fund_id: string;
  fund_name: string;
  fund_category: string | null;
}

export function useWatchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useNotifications();

  const fetchWatchlist = useCallback(async () => {
    if (!user) {
      setWatchlist([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWatchlist(data || []);
    } catch (err) {
      console.error('Error fetching watchlist:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const addToWatchlist = async (fund: MutualFund) => {
    if (!user) {
      toast.error('Please sign in to save funds');
      return false;
    }

    try {
      const { error } = await supabase.from('watchlist').insert({
        user_id: user.id,
        fund_id: fund.id,
        fund_name: fund.name,
        fund_category: fund.category,
      });

      if (error) {
        if (error.code === '23505') {
          toast.info('Already in your watchlist');
          return false;
        }
        throw error;
      }

      await fetchWatchlist();
      toast.success('Added to watchlist');
      addNotification('info', `${fund.name} added to Watchlist`, `You're now tracking ${fund.name}. We'll keep you updated on its performance.`);
      return true;
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      toast.error('Failed to add to watchlist');
      return false;
    }
  };

  const removeFromWatchlist = async (fundId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('fund_id', fundId);

      if (error) throw error;

      await fetchWatchlist();
      toast.success('Removed from watchlist');
      return true;
    } catch (err) {
      console.error('Error removing from watchlist:', err);
      toast.error('Failed to remove');
      return false;
    }
  };

  const isInWatchlist = (fundId: string) => {
    return watchlist.some((item) => item.fund_id === fundId);
  };

  const toggleWatchlist = async (fund: MutualFund) => {
    if (isInWatchlist(fund.id)) {
      return removeFromWatchlist(fund.id);
    } else {
      return addToWatchlist(fund);
    }
  };

  return {
    watchlist,
    isLoading,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist,
    refreshWatchlist: fetchWatchlist,
  };
}
