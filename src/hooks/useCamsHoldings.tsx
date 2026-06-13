import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const LOCAL_KEY = 'cams_holdings_cache';

export interface CamsHolding {
  id: string;
  user_id: string;
  fund_name: string;
  amc: string | null;
  folio_number: string | null;
  units: number | null;
  nav: number | null;
  current_value: number | null;
  cost_value: number | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface CamsHoldingInput {
  fund_name: string;
  amc?: string | null;
  folio_number?: string | null;
  units?: number | null;
  nav?: number | null;
  current_value?: number | null;
  cost_value?: number | null;
  category?: string | null;
}

function toDbVal<T>(val: T | null | undefined): T | null {
  return val ?? null;
}

function loadLocal(): CamsHolding[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocal(holdings: CamsHolding[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(holdings));
  } catch {}
}

function clearLocal() {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {}
}

export function useCamsHoldings() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<CamsHolding[]>(() => loadLocal());
  const [isLoading, setIsLoading] = useState(false);

  const fetchHoldings = useCallback(async () => {
    if (!user) {
      setHoldings(loadLocal());
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const serverData = data || [];
      setHoldings(serverData);
      saveLocal(serverData);
    } catch {
      setHoldings(loadLocal());
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  const saveHoldings = async (items: CamsHoldingInput[]) => {
    if (!user) {
      toast.error('Please sign in to save portfolio');
      return false;
    }

    const now = new Date().toISOString();
    const localRecords: CamsHolding[] = items.map((item, i) => ({
      id: `local_${Date.now()}_${i}`,
      user_id: user.id,
      fund_name: item.fund_name,
      amc: toDbVal(item.amc),
      folio_number: toDbVal(item.folio_number),
      units: toDbVal(item.units),
      nav: toDbVal(item.nav),
      current_value: toDbVal(item.current_value),
      cost_value: toDbVal(item.cost_value),
      category: toDbVal(item.category),
      created_at: now,
      updated_at: now,
    }));

    setHoldings(localRecords);
    saveLocal(localRecords);

    try {
      const { error: deleteError } = await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      if (items.length > 0) {
        const { error: insertError } = await supabase
          .from('portfolio_holdings')
          .insert(
            items.map(item => ({
              user_id: user.id,
              fund_name: item.fund_name,
              amc: toDbVal(item.amc),
              folio_number: toDbVal(item.folio_number),
              units: toDbVal(item.units),
              nav: toDbVal(item.nav),
              current_value: toDbVal(item.current_value),
              cost_value: toDbVal(item.cost_value),
              category: toDbVal(item.category),
            }))
          );

        if (insertError) throw insertError;
      }

      await fetchHoldings();
      return true;
    } catch (err: any) {
      const message = err?.message || err?.error_description || 'Unknown error';
      console.error('Error saving CAMS holdings to Supabase:', err);
      toast.error(`Saved locally. Could not sync to cloud: ${message}`);
      return false;
    }
  };

  const clearHoldings = async () => {
    if (!user) return false;

    setHoldings([]);
    clearLocal();

    try {
      const { error } = await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (err: any) {
      const message = err?.message || err?.error_description || 'Unknown error';
      console.error('Error clearing CAMS holdings:', err);
      return false;
    }
  };

  return {
    holdings,
    isLoading,
    fetchHoldings,
    saveHoldings,
    clearHoldings,
  };
}
