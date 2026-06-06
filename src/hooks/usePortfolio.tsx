import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { MutualFund } from '@/types/mutualFund';
import { toast } from 'sonner';

export interface PortfolioItem {
  id: string;
  fund_id: string;
  fund_name: string;
  fund_category: string | null;
  invested_amount: number | null;
  sip_amount: number | null;
  is_sip: boolean;
  units: number | null;
  purchase_nav: number | null;
  notes: string | null;
  created_at: string;
}

export function usePortfolio() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    if (!user) {
      setPortfolio([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPortfolio(data || []);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const addToPortfolio = async (
    fund: MutualFund,
    details: {
      invested_amount?: number;
      sip_amount?: number;
      is_sip?: boolean;
      units?: number;
      purchase_nav?: number;
      notes?: string;
    }
  ) => {
    if (!user) {
      toast.error('Please sign in to add investments');
      return false;
    }

    try {
      const { error } = await supabase.from('portfolio').insert({
        user_id: user.id,
        fund_id: fund.id,
        fund_name: fund.name,
        fund_category: fund.category,
        invested_amount: details.invested_amount || null,
        sip_amount: details.sip_amount || null,
        is_sip: details.is_sip || false,
        units: details.units || null,
        purchase_nav: details.purchase_nav || null,
        notes: details.notes || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast.info('This fund is already in your portfolio');
          return false;
        }
        throw error;
      }

      await fetchPortfolio();
      toast.success('Added to portfolio');
      return true;
    } catch (err) {
      console.error('Error adding to portfolio:', err);
      toast.error('Failed to add to portfolio');
      return false;
    }
  };

  const updatePortfolioItem = async (
    portfolioId: string,
    updates: Partial<PortfolioItem>
  ) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('portfolio')
        .update(updates)
        .eq('id', portfolioId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchPortfolio();
      toast.success('Portfolio updated');
      return true;
    } catch (err) {
      console.error('Error updating portfolio:', err);
      toast.error('Failed to update');
      return false;
    }
  };

  const removeFromPortfolio = async (portfolioId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('portfolio')
        .delete()
        .eq('id', portfolioId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchPortfolio();
      toast.success('Removed from portfolio');
      return true;
    } catch (err) {
      console.error('Error removing from portfolio:', err);
      toast.error('Failed to remove');
      return false;
    }
  };

  const isInPortfolio = (fundId: string) => {
    return portfolio.some((item) => item.fund_id === fundId);
  };

  // Calculate portfolio summary
  const portfolioSummary = {
    totalInvested: portfolio.reduce((sum, item) => sum + (item.invested_amount || 0), 0),
    totalSIP: portfolio.reduce((sum, item) => sum + (item.is_sip ? (item.sip_amount || 0) : 0), 0),
    fundCount: portfolio.length,
    categoryBreakdown: portfolio.reduce((acc, item) => {
      const category = item.fund_category || 'Other';
      acc[category] = (acc[category] || 0) + (item.invested_amount || 0);
      return acc;
    }, {} as Record<string, number>),
  };

  return {
    portfolio,
    isLoading,
    addToPortfolio,
    updatePortfolioItem,
    removeFromPortfolio,
    isInPortfolio,
    refreshPortfolio: fetchPortfolio,
    portfolioSummary,
  };
}
