import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recommendFundsV2, RecommendationPreferences } from '@/utils/recommendation/intersectionEngine';
import { determineInvestorPersona } from '@/utils/recommendation/personaEngine';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeaderZone } from '@/components/dashboard/DashboardHeaderZone';
import { DashboardBackground } from '@/components/dashboard/DashboardBackground';
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav';
import { FundCard } from '@/components/dashboard/FundCard';
import { SectorAllocationChart } from '@/components/dashboard/SectorAllocationChart';
import { FundDetailModal } from '@/components/dashboard/FundDetailModal';
import { SectorSearchDropdown } from '@/components/dashboard/SectorSearchDropdown';
import { FundComparisonCard } from '@/components/dashboard/FundComparisonCard';
import { PortfolioFundModal } from '@/components/dashboard/PortfolioFundModal';
import { DashboardLoadingState } from '@/components/dashboard/DashboardLoadingState';
import { AllFundsTab } from '@/components/dashboard/AllFundsTab';
import { AIChat } from '@/components/dashboard/AIChat';
import { CAMSUpload } from '@/components/dashboard/CAMSUpload';
import { PortfolioAnalytics } from '@/components/dashboard/PortfolioAnalytics';
import type { AnalyticsHolding } from '@/components/dashboard/PortfolioAnalytics';
import { PortfolioReview } from '@/components/dashboard/PortfolioReview';
import { PortfolioComparison } from '@/components/dashboard/PortfolioComparison';
import { PortfolioIntelligenceHero } from '@/components/dashboard/PortfolioIntelligenceHero';
import { BuildPortfolio } from '@/components/dashboard/BuildPortfolio';
import { AddFundDialog } from '@/components/dashboard/AddFundDialog';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MutualFund, FundSectorData } from '@/types/mutualFund';
import { getCachedSectorData } from '@/utils/sectorDataGenerator';
import { cn } from '@/lib/utils';
import { 
  Plus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Bookmark,
  Wallet
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFundCache } from '@/hooks/useFundCache';
import { useFundMetrics } from '@/hooks/useFundMetrics';
import { useWatchlist } from '@/hooks/useWatchlist';
import { usePortfolio, PortfolioItem } from '@/hooks/usePortfolio';
import { useCamsHoldings } from '@/hooks/useCamsHoldings';
import type { CamsHolding } from '@/hooks/useCamsHoldings';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { funds, isLoading, refreshFunds } = useFundCache();
  const { watchlist, isInWatchlist, toggleWatchlist } = useWatchlist();
  const {
    allMetrics: fundMetrics,
    activeFunds,
    isLoading: metricsLoading,
    stats: fundMetricsStats,
    topByCagr,
    topBySharpe,
  } = useFundMetrics();
  const { 
    portfolio, 
    addToPortfolio, 
    removeFromPortfolio, 
    portfolioSummary,
    isLoading: portfolioLoading 
  } = usePortfolio();

  const { 
    holdings: camsHoldings, 
    isLoading: camsLoading, 
    saveHoldings: saveCamsHoldings, 
    clearHoldings: clearCamsHoldings 
  } = useCamsHoldings();

  const [globalSearch, setGlobalSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [aiResetKey, setAiResetKey] = useState(0);
  const [selectedFundA, setSelectedFundA] = useState('');
  const [selectedFundB, setSelectedFundB] = useState('');
  
  // Modal states
  const [selectedFundForModal, setSelectedFundForModal] = useState<MutualFund | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddToPortfolioOpen, setIsAddToPortfolioOpen] = useState(false);
  const [portfolioFundToAdd, setPortfolioFundToAdd] = useState<MutualFund | null>(null);
  const [investedAmount, setInvestedAmount] = useState('');
  const [sipAmount, setSipAmount] = useState('');
  const [isSip, setIsSip] = useState(false);
  
  // Portfolio fund detail modal
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<PortfolioItem | null>(null);
  const [selectedPortfolioFund, setSelectedPortfolioFund] = useState<MutualFund | null>(null);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);

  // CAMS data: directly passed from upload (immediate) AND persisted from DB (on reload)
  const [hasCamsData, setHasCamsData] = useState(false);

  // Shape matching CAMSUpload's internal ParsedPortfolio for initialPortfolio
  const [camsUploadedData, setCamsUploadedData] = useState<{
    holdings: Array<{
      fund_name: string;
      amc: string;
      folio_number?: string;
      units?: number | null;
      nav?: number | null;
      current_value?: number | null;
      cost_value?: number | null;
      category?: string;
    }>;
    total_current_value?: number | null;
    total_cost_value?: number | null;
  } | null>(null);

  // On mount, load persisted CAMS holdings from DB
  const persistedCamsPortfolio = useMemo(() => {
    if (camsHoldings.length === 0) return null;
    const totalCost = camsHoldings.reduce((s, h) => s + (h.cost_value ?? 0), 0);
    const totalCurrent = camsHoldings.reduce((s, h) => s + (h.current_value ?? 0), 0);
    return {
      holdings: camsHoldings.map(h => ({
        fund_name: h.fund_name,
        amc: h.amc || '',
        folio_number: h.folio_number || undefined,
        units: h.units,
        nav: h.nav,
        current_value: h.current_value,
        cost_value: h.cost_value,
        category: h.category || undefined,
      })),
      total_current_value: totalCurrent,
      total_cost_value: totalCost,
    };
  }, [camsHoldings]);

  // Set hasCamsData if persisted data exists on mount
  useEffect(() => {
    if (camsHoldings.length > 0) {
      setHasCamsData(true);
      setCamsUploadedData(null); // will use persistedCamsPortfolio via the CAMSUpload
    }
  }, [camsHoldings]);

  // Merge: prefer just-uploaded data, fall back to persisted data
  const camsInitialPortfolio = camsUploadedData || persistedCamsPortfolio;

  const [isAddFundOpen, setIsAddFundOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Set initial comparison funds
  useEffect(() => {
    if (funds.length > 0 && !selectedFundA) {
      setSelectedFundA(funds[0].id);
    }
    if (funds.length > 1 && !selectedFundB) {
      setSelectedFundB(funds[1].id);
    }
  }, [funds, selectedFundA, selectedFundB]);

  // Get user's first name
  const firstName = useMemo(() => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }
    return null;
  }, [profile]);

  // Compute investor persona from actual profile fields
  const personaResult = useMemo(() => {
    if (!profile) return null;
    const primaryGoal = profile.primary_goal || (
      profile.investment_goal === 'wealth' ? 'wealth_creation' :
      profile.investment_goal === 'income' ? 'passive_income' :
      profile.investment_goal === 'tax' ? 'tax_saving' :
      profile.investment_goal === 'preservation' ? 'capital_preservation' :
      null
    );
    return determineInvestorPersona({
      investor_stage: profile.investor_stage,
      primary_goal: primaryGoal,
      investment_horizon: profile.investment_horizon,
      market_reaction: profile.market_reaction,
      experience_level: profile.experience_level,
      existing_investments: profile.existing_investments,
      emergency_fund: profile.emergency_fund,
    });
  }, [profile]);

  // Log raw profile sources once (not inside useMemo)
  console.log('[TRACE-PROFILE-RAW] DB fields:', JSON.stringify({
    risk_tolerance: profile?.risk_tolerance,
    investment_goal: profile?.investment_goal,
    investment_horizon: profile?.investment_horizon,
    experience_level: profile?.experience_level,
    investment_amount: profile?.investment_amount,
    primary_goal: profile?.primary_goal,
  }));
  const localQ = (() => { try { return JSON.parse(localStorage.getItem('fundex_questionnaire') || '{}'); } catch { return {}; } })();
  console.log('[TRACE-PROFILE-LOCAL] localStorage questionnaire:', JSON.stringify(localQ));

  // Filter funds using recommendation engine
  const personalizedFunds = useMemo(() => {
    if (!profile || funds.length === 0) {
      console.log('[TRACE-PREFS] SKIP — profile or funds empty');
      return [];
    }

    const rawGoal = profile.primary_goal;
    const mappedGoal = profile.investment_goal;
    const effectiveGoal = rawGoal ||
      (mappedGoal === 'wealth' ? 'wealth_creation' :
       mappedGoal === 'income' ? 'passive_income' :
       mappedGoal === 'tax' ? 'tax_saving' :
       mappedGoal === 'preservation' ? 'capital_preservation' :
       'wealth_creation');

    const rawAmount = profile.investment_amount;
    const effectiveAmount = rawAmount || 'medium';

    const prefs: RecommendationPreferences = {
      riskTolerance: profile.risk_tolerance || 'moderate',
      investmentGoal: effectiveGoal,
      investmentHorizon: profile.investment_horizon || 'long',
      experienceLevel: profile.experience_level || 'beginner',
      investmentAmount: effectiveAmount,
    };

    console.log('[TRACE-PREFS]', JSON.stringify(prefs));
    console.log('[TRACE-MAPPING] rawGoal=' + rawGoal + ' mappedGoal=' + mappedGoal + ' effectiveGoal=' + effectiveGoal + ' rawAmount=' + rawAmount + ' effectiveAmount=' + effectiveAmount);

    console.log('[TRACE-FUND-SHAPE]', JSON.stringify(funds[0]));
    console.log('[TRACE-CATEGORY-FIELD]', 'category=' + funds[0].category, 'typeof=' + typeof funds[0].category);
    console.log('[TRACE-CATEGORY-FIELD-ALL]', funds.slice(0, 5).map(f => f.category));

    const engineInputTarget = funds.find(f => f.name && f.name.includes('360 ONE'));
    if (engineInputTarget) {
      console.log('[TRACE-ENGINE-INPUT]', 'name=' + engineInputTarget.name, 'category=' + engineInputTarget.category, 'full=' + JSON.stringify(engineInputTarget));
    } else {
      console.log('[TRACE-ENGINE-INPUT] 360 ONE not found in funds array');
    }

    const recommended = recommendFundsV2(funds, prefs);

    console.log('[TRACE-FINAL] FINAL_RECOMMENDED_COUNT=' + recommended.length);

    if (recommended.length === 0) {
      console.log('[TRACE-FALLBACK-UI] using funds.slice(0,9) fallback — first:', funds[0]?.name, funds[1]?.name, funds[2]?.name);
    }

    const result = recommended.length > 0 ? recommended.slice(0, 9) : funds.slice(0, 9);
    console.log('[TRACE-OUTPUT] returning', result.length, 'funds to UI');
    if (result.length > 0) {
      console.log('[TRACE-OUTPUT] first:', result[0].name, 'hasScore:', 'compositeScore' in result[0]);
    }
    return result;
  }, [funds, profile]);

  // Global search results
  const globalFilteredFunds = useMemo(() => {
    if (!globalSearch) return [];
    const query = globalSearch.toLowerCase();
    return funds.filter(f => 
      f.name.toLowerCase().includes(query) || 
      f.amc.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [funds, globalSearch]);

  // Watchlist funds
  const watchlistFunds = useMemo(() => 
    funds.filter(f => watchlist.some(w => w.fund_id === f.id)),
    [funds, watchlist]
  );

  // Sector data
  const getSectorData = (fundId: string): FundSectorData | null => {
    const fund = funds.find(f => f.id === fundId);
    if (!fund) return null;
    return getCachedSectorData(fund);
  };

  const sectorDataA = useMemo(() => getSectorData(selectedFundA), [selectedFundA, funds]);
  const sectorDataB = useMemo(() => getSectorData(selectedFundB), [selectedFundB, funds]);
  const comparisonFundA = useMemo(() => funds.find(f => f.id === selectedFundA), [selectedFundA, funds]);
  const comparisonFundB = useMemo(() => funds.find(f => f.id === selectedFundB), [selectedFundB, funds]);
  const modalSectorData = useMemo(() => {
    if (!selectedFundForModal) return null;
    return getCachedSectorData(selectedFundForModal);
  }, [selectedFundForModal]);

  const handleFundClick = (fund: MutualFund) => {
    setSelectedFundForModal(fund);
    setIsModalOpen(true);
  };

  const handleAddToPortfolio = (fund: MutualFund) => {
    setPortfolioFundToAdd(fund);
    setInvestedAmount('');
    setSipAmount('');
    setIsSip(false);
    setIsAddToPortfolioOpen(true);
  };

  const handlePortfolioItemClick = (item: PortfolioItem) => {
    const fund = funds.find(f => f.id === item.fund_id);
    if (fund) {
      setSelectedPortfolioItem(item);
      setSelectedPortfolioFund(fund);
      setIsPortfolioModalOpen(true);
    }
  };

  const submitAddToPortfolio = async () => {
    if (!portfolioFundToAdd) return;
    
    await addToPortfolio(portfolioFundToAdd, {
      invested_amount: investedAmount ? parseFloat(investedAmount) : undefined,
      sip_amount: sipAmount ? parseFloat(sipAmount) : undefined,
      is_sip: isSip,
    });
    
    setIsAddToPortfolioOpen(false);
    setPortfolioFundToAdd(null);
  };

  // Compute analytics holdings from portfolio items + fund data
  const analyticsHoldings = useMemo<AnalyticsHolding[]>(() => {
    return portfolio.map(item => {
      const fund = funds.find(f => f.id === item.fund_id);
      const currentValue = (item.units && fund?.nav)
        ? item.units * fund.nav
        : (item.invested_amount || 0);
      return {
        fund_name: item.fund_name,
        amc: fund?.amc || 'Unknown',
        category: item.fund_category || '',
        invested: item.invested_amount || 0,
        currentValue,
        assetClass: fund?.assetClass,
        riskLevel: fund?.riskLevel,
      };
    });
  }, [portfolio, funds]);

  // Compute analytics holdings from CAMS data (fallback when no manual portfolio)
  const camsAnalyticsHoldings = useMemo<AnalyticsHolding[]>(() => {
    return camsHoldings.map(h => {
      const fund = funds.find(f => f.name.toLowerCase() === h.fund_name.toLowerCase());
      return {
        fund_name: h.fund_name,
        amc: h.amc || 'Unknown',
        category: h.category || '',
        invested: h.cost_value || 0,
        currentValue: h.current_value || 0,
        assetClass: fund?.assetClass,
        riskLevel: fund?.riskLevel,
      };
    });
  }, [camsHoldings, funds]);

  // Use manual portfolio analytics when available, otherwise CAMS analytics
  const effectiveAnalyticsHoldings = analyticsHoldings.length > 0
    ? analyticsHoldings
    : camsAnalyticsHoldings;

  const hasAnalyticsData = portfolio.length > 0 || camsAnalyticsHoldings.length > 0;

  // CAMS health-o-meter + summary (mirrors CAMSUpload logic)
  type CamsHealthStatus = 'healthy' | 'moderate' | 'degrading';

  function getCamsHealthState(holding: { cost_value?: number | null; current_value?: number | null }): CamsHealthStatus {
    const cost = holding.cost_value ?? 0;
    const current = holding.current_value ?? 0;
    if (cost === 0) return 'moderate';
    const pct = ((current - cost) / cost) * 100;
    if (pct > 5) return 'healthy';
    if (pct >= -5) return 'moderate';
    return 'degrading';
  }

  const CAMS_HEALTH_LABELS: Record<CamsHealthStatus, { label: string; color: string; bg: string; barColor: string }> = {
    healthy: { label: 'Healthy', color: 'text-success', bg: 'bg-success/15', barColor: 'bg-success' },
    moderate: { label: 'Moderate', color: 'text-warning', bg: 'bg-warning/15', barColor: 'bg-warning' },
    degrading: { label: 'Needs Attention', color: 'text-destructive', bg: 'bg-destructive/15', barColor: 'bg-destructive' },
  };

  const camsHealthMetrics = useMemo(() => {
    if (!camsInitialPortfolio) return null;
    const holdings = camsInitialPortfolio.holdings;
    const totalCost = camsInitialPortfolio.total_cost_value ?? holdings.reduce((s, h) => s + (h.cost_value ?? 0), 0);
    const totalCurrent = camsInitialPortfolio.total_current_value ?? holdings.reduce((s, h) => s + (h.current_value ?? 0), 0);
    const totalReturn = totalCost > 0 ? ((totalCurrent - totalCost) / totalCost) * 100 : 0;
    const statuses = holdings.map(getCamsHealthState);
    const healthyCount = statuses.filter(s => s === 'healthy').length;
    const moderateCount = statuses.filter(s => s === 'moderate').length;
    const degradingCount = statuses.filter(s => s === 'degrading').length;
    let overall: CamsHealthStatus = 'moderate';
    if (degradingCount > holdings.length * 0.4) overall = 'degrading';
    else if (healthyCount > holdings.length * 0.5) overall = 'healthy';
    return { totalCost, totalCurrent, totalReturn, healthyCount, moderateCount, degradingCount, overall, holdings };
  }, [camsInitialPortfolio]);

  // Generate educational insights for portfolio
  const getPortfolioInsight = (item: PortfolioItem): { type: 'continue' | 'review' | 'reduce'; message: string } => {
    const fund = funds.find(f => f.id === item.fund_id);
    if (!fund) return { type: 'review', message: 'Fund data not available for analysis' };

    const cat = fund.category || '';
    const isEquity = cat.startsWith('EQ-') || cat === 'Equity';
    const isDebt = cat.startsWith('DT-') || cat === 'Debt';

    if (fund.sharpeRatio >= 1.5 && fund.cagr1Y > 15 && fund.expenseRatio < 1.5) {
      return { type: 'continue', message: `Strong risk-adjusted performance with Sharpe ${fund.sharpeRatio.toFixed(2)} and ${fund.cagr1Y.toFixed(1)}% 1Y return. Low expense ratio keeps costs efficient. Consider continuing SIP or holding.` };
    }
    if (fund.cagr1Y > 25 && fund.volatility > 20) {
      return { type: 'review', message: `High returns (${fund.cagr1Y.toFixed(1)}%) but elevated volatility (${fund.volatility.toFixed(1)}%). The fund may be in a momentum phase. Review if it aligns with your risk capacity and rebalance if overweight.` };
    }
    if (fund.sharpeRatio < 0.5 && fund.cagr1Y < 5 && isEquity) {
      return { type: 'reduce', message: `Underperforming with ${fund.cagr1Y.toFixed(1)}% return and weak Sharpe ratio (${fund.sharpeRatio.toFixed(2)}) for an equity fund. Consider switching to a better-rated fund in the same category.` };
    }
    if (fund.expenseRatio > 2.0) {
      return { type: 'review', message: `High expense ratio of ${fund.expenseRatio.toFixed(2)}% is eroding returns. Over 10 years, this could cost ₹${Math.round(((item.invested_amount || 50000) * 0.02) * 10 / 1000)}K+ in fees. Consider a direct plan or lower-cost alternative.` };
    }
    if (isDebt && fund.cagr1Y > 7) {
      return { type: 'continue', message: `Solid ${fund.cagr1Y.toFixed(1)}% return for a debt fund with low volatility (${fund.volatility.toFixed(1)}%). Good for capital preservation and regular income goals.` };
    }
    if (fund.beta !== undefined && fund.beta > 1.3 && isEquity) {
      return { type: 'review', message: `High beta (${fund.beta.toFixed(2)}) means this fund amplifies market swings. In a 10% correction, expect ~${(10 * fund.beta).toFixed(0)}% fall. Suitable only if your horizon is 5+ years.` };
    }
    if (fund.cagr3Y > 12 && fund.cagr5Y > 10) {
      return { type: 'continue', message: `Consistent multi-year performer: ${fund.cagr3Y.toFixed(1)}% (3Y) and ${fund.cagr5Y.toFixed(1)}% (5Y) CAGR. Long-term compounding is working in your favor.` };
    }
    if (fund.cagr1Y < 0) {
      return { type: 'review', message: `Currently in negative territory (${fund.cagr1Y.toFixed(1)}%). Evaluate if the downturn is market-wide or fund-specific. If the fund's 3Y track record is strong, consider averaging down via SIP.` };
    }
    return { type: 'continue', message: `Performance within expectations for a ${fund.category} fund. Sharpe: ${fund.sharpeRatio.toFixed(2)}, Expense: ${fund.expenseRatio.toFixed(2)}%. Continue monitoring quarterly.` };
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleOpenAuctus = () => {
    setActiveTab('ai');
    setAiResetKey(k => k + 1);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <DashboardBackground />
      {/* Header: always shown on lg+; on mobile only on Home (overview) tab */}
      <div className={activeTab === 'overview' ? '' : 'hidden lg:block'}>
        <DashboardHeader
          onRefresh={refreshFunds}
          isLoading={isLoading}
          onOpenAuctus={handleOpenAuctus}
        />
      </div>
      
      <div className="flex flex-1">
        {/* Desktop Sidebar - Fixed position */}
        <DashboardSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          watchlistCount={watchlist.length}
          portfolioCount={portfolio.length}
        />
        
        {/* Main content with left margin to account for fixed sidebar */}
        <main className="flex-1 px-4 md:px-6 lg:px-10 py-8 pb-24 lg:pb-8 overflow-x-hidden bg-gradient-to-b from-transparent via-background/50 to-background lg:ml-24">
          <div className="max-w-6xl mx-auto">

            {/* Dashboard Header Zone */}
            <DashboardHeaderZone
              firstName={activeTab === 'overview' ? firstName : null}
              globalSearch={globalSearch}
              onGlobalSearchChange={setGlobalSearch}
              globalFilteredFunds={globalFilteredFunds}
              onFundClick={(fund) => {
                handleFundClick(fund);
              }}
              showSearch={activeTab === 'overview' || activeTab === 'watchlist'}
              showInfoText={activeTab === 'overview'}
              showGreeting={activeTab === 'overview'}
            />

            {/* Tab Content */}
            <div className="space-y-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="animate-fade-in space-y-6">
                  {isLoading ? (
                    <DashboardLoadingState />
                  ) : personalizedFunds.length > 0 ? (
                    <>
                      {personaResult && (
                        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
                          <p className="text-sm text-muted-foreground">You are a</p>
                          <p className="text-xl font-bold text-foreground">{personaResult.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">{personaResult.explanation}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {personalizedFunds.map(fund => (
                          <FundCard 
                            key={fund.id}
                            fund={fund} 
                            onClick={() => handleFundClick(fund)}
                            isBookmarked={isInWatchlist(fund.id)}
                            onBookmarkToggle={() => toggleWatchlist(fund)}
                          />
                        ))}
                      </div>

                      {/* Top Funds from fund_metrics */}
                      {!metricsLoading && fundMetricsStats && (
                        <Card className="glass-card">
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                CIFRAA Fund Metrics
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {fundMetricsStats.total.toLocaleString()} schemes
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Top 3Y CAGR</p>
                                {topByCagr("3y", 5).map((m, i) => (
                                  <p key={m.scheme_code} className="text-xs py-0.5">
                                    <span className="text-muted-foreground">{i + 1}.</span>{" "}
                                    {m.scheme_name || `Scheme ${m.scheme_code}`}{" "}
                                    <span className="text-success">
                                      {m.cagr_3y !== null ? `${(m.cagr_3y * 100).toFixed(1)}%` : "N/A"}
                                    </span>
                                  </p>
                                ))}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Top Sharpe 3Y</p>
                                {topBySharpe("3y", 5).map((m, i) => (
                                  <p key={m.scheme_code} className="text-xs py-0.5">
                                    <span className="text-muted-foreground">{i + 1}.</span>{" "}
                                    {m.scheme_name || `Scheme ${m.scheme_code}`}{" "}
                                    <span className="text-success">
                                      {m.sharpe_ratio_3y !== null ? m.sharpe_ratio_3y.toFixed(2) : "N/A"}
                                    </span>
                                  </p>
                                ))}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Active / Total</p>
                                <p className="text-lg font-bold">
                                  {fundMetricsStats.active.toLocaleString()}
                                  <span className="text-sm text-muted-foreground font-normal">
                                    {" "}/ {fundMetricsStats.total.toLocaleString()}
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">Categories tracked</p>
                                <p className="text-lg font-bold">
                                  {Object.keys(fundMetricsStats.byCategory).length}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card className="glass-card">
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground mb-4">
                          No personalized funds available. Complete your profile to get tailored suggestions.
                        </p>
                        <Button onClick={() => navigate('/onboarding')}>
                          Complete Profile
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* All Funds Tab */}
              {activeTab === 'allfunds' && (
                <AllFundsTab
                  funds={funds}
                  isLoading={isLoading}
                  onFundClick={handleFundClick}
                  isInWatchlist={isInWatchlist}
                  onBookmarkToggle={toggleWatchlist}
                />
              )}

              {/* Sectors Tab */}
              {activeTab === 'sectors' && (
                <div className="animate-fade-in space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SectorSearchDropdown
                      funds={funds}
                      selectedFundId={selectedFundA}
                      onSelect={setSelectedFundA}
                      placeholder="Search Fund A by name or AMC..."
                      watchlistFundIds={watchlist.map(w => w.fund_id)}
                      onBookmarkToggle={toggleWatchlist}
                    />
                    <SectorSearchDropdown
                      funds={funds}
                      selectedFundId={selectedFundB}
                      onSelect={setSelectedFundB}
                      placeholder="Search Fund B by name or AMC..."
                      watchlistFundIds={watchlist.map(w => w.fund_id)}
                      onBookmarkToggle={toggleWatchlist}
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {sectorDataA && <SectorAllocationChart sectorData={sectorDataA} />}
                    {sectorDataB && <SectorAllocationChart sectorData={sectorDataB} />}
                  </div>
                  <FundComparisonCard fundA={comparisonFundA} fundB={comparisonFundB} />

                  <Card className="bg-secondary/30">
                    <CardContent className="py-4">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Note:</strong> Sector allocation data is indicative. For exact holdings, refer to the fund's official factsheet.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Watchlist Tab */}
              {activeTab === 'watchlist' && (
                <div className="animate-fade-in space-y-6">
                  {watchlistFunds.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {watchlistFunds.map(fund => (
                        <FundCard 
                          key={fund.id}
                          fund={fund} 
                          onClick={() => handleFundClick(fund)}
                          isBookmarked={true}
                          onBookmarkToggle={() => toggleWatchlist(fund)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="glass-card">
                      <CardContent className="py-12 text-center">
                        <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground mb-2">Your watchlist is empty</p>
                        <p className="text-sm text-muted-foreground">
                          Click the bookmark icon on any fund to add it to your watchlist
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Portfolio Tab */}
              {activeTab === 'portfolio' && (
                <div className="animate-fade-in space-y-6">
                  {/* Unified action card: Upload CAMS / Add manually (when no data) */}
                  {portfolio.length === 0 && !hasCamsData && !camsLoading && (
                    <Card className="glass-card">
                      <CardContent className="py-8 text-center">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          Upload CAMS statement / Create manually
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                          Import your full portfolio from a CAMS PDF, or add individual funds one at a time.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <CAMSUpload compact onDataLoaded={(holdings) => { setCamsUploadedData({ holdings, total_current_value: holdings.reduce((s, h) => s + (h.current_value ?? 0), 0), total_cost_value: holdings.reduce((s, h) => s + (h.cost_value ?? 0), 0) }); setHasCamsData(true); }} onSave={(holdings) => { saveCamsHoldings(holdings.map(h => ({ fund_name: h.fund_name, amc: h.amc, folio_number: h.folio_number, units: h.units, nav: h.nav, current_value: h.current_value, cost_value: h.cost_value, category: h.category }))); }} />
                          <Button onClick={() => setIsAddFundOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Mutual Fund
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* === 1. Holdings Overview === */}
                  {/* CAMS: Health-o-Meter + Summary Cards + Holdings List */}
                  {hasCamsData && !camsLoading && camsHealthMetrics && (() => {
                    const m = camsHealthMetrics;
                    const cfg = CAMS_HEALTH_LABELS[m.overall];
                    const HealthIcon = m.overall === 'healthy' ? TrendingUp : m.overall === 'degrading' ? TrendingDown : Minus;
                    const profitLoss = m.totalCurrent - m.totalCost;
                    return (
                      <>
                        <Card className="glass-card overflow-hidden">
                          <CardContent className="py-6">
                            <div className="flex items-center gap-4 mb-5">
                              <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center', cfg.bg)}>
                                <HealthIcon className={cn('h-8 w-8', cfg.color)} />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Portfolio Health-o-Meter</p>
                                <p className={cn('text-3xl font-bold', cfg.color)}>{cfg.label}</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-muted/30">
                                {(['healthy', 'moderate', 'degrading'] as CamsHealthStatus[]).map(status => {
                                  const count = status === 'healthy' ? m.healthyCount : status === 'moderate' ? m.moderateCount : m.degradingCount;
                                  const pct = (count / m.holdings.length) * 100;
                                  return pct > 0 ? (
                                    <div key={status} className={cn('h-full rounded-full transition-all', CAMS_HEALTH_LABELS[status].barColor)} style={{ width: `${pct}%` }} />
                                  ) : null;
                                })}
                              </div>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Healthy ({m.healthyCount})</span>
                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Moderate ({m.moderateCount})</span>
                                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Needs Attention ({m.degradingCount})</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <Card className="glass-card">
                            <CardContent className="pt-4 pb-3">
                              <p className="text-xs text-muted-foreground">Total Investment</p>
                              <p className="text-lg font-bold">₹{Math.round(m.totalCost).toLocaleString()}</p>
                            </CardContent>
                          </Card>
                          <Card className="glass-card">
                            <CardContent className="pt-4 pb-3">
                              <p className="text-xs text-muted-foreground">Current Value</p>
                              <p className={cn('text-lg font-bold', m.totalReturn >= 0 ? 'text-success' : 'text-destructive')}>₹{Math.round(m.totalCurrent).toLocaleString()}</p>
                            </CardContent>
                          </Card>
                          <Card className="glass-card">
                            <CardContent className="pt-4 pb-3">
                              <p className="text-xs text-muted-foreground">Profit/Loss</p>
                              <p className={cn('text-lg font-bold', profitLoss >= 0 ? 'text-success' : 'text-destructive')}>
                                {profitLoss >= 0 ? '+' : ''}₹{Math.round(profitLoss).toLocaleString()}
                              </p>
                            </CardContent>
                          </Card>
                          <Card className="glass-card">
                            <CardContent className="pt-4 pb-3">
                              <p className="text-xs text-muted-foreground">Return</p>
                              <p className={cn('text-lg font-bold', m.totalReturn >= 0 ? 'text-success' : 'text-destructive')}>
                                {m.totalReturn >= 0 ? '+' : ''}{m.totalReturn.toFixed(1)}%
                              </p>
                            </CardContent>
                          </Card>
                        </div>

                        <CAMSUpload compact={false} initialPortfolio={camsInitialPortfolio} onDataLoaded={(holdings) => { setCamsUploadedData({ holdings, total_current_value: holdings.reduce((s, h) => s + (h.current_value ?? 0), 0), total_cost_value: holdings.reduce((s, h) => s + (h.cost_value ?? 0), 0) }); setHasCamsData(true); }} onSave={(holdings) => { saveCamsHoldings(holdings.map(h => ({ fund_name: h.fund_name, amc: h.amc, folio_number: h.folio_number, units: h.units, nav: h.nav, current_value: h.current_value, cost_value: h.cost_value, category: h.category }))); }} />
                      </>
                    );
                  })()}

                  {/* Manual portfolio summary cards + holdings list */}
                  {portfolio.length > 0 && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="glass-card">
                          <CardContent className="pt-6">
                            <p className="text-sm text-muted-foreground mb-1">Total Invested</p>
                            <p className="text-2xl font-bold text-foreground">
                              ₹{portfolioSummary.totalInvested.toLocaleString()}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="glass-card">
                          <CardContent className="pt-6">
                            <p className="text-sm text-muted-foreground mb-1">Monthly SIP</p>
                            <p className="text-2xl font-bold text-foreground">
                              ₹{portfolioSummary.totalSIP.toLocaleString()}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="glass-card">
                          <CardContent className="pt-6">
                            <p className="text-sm text-muted-foreground mb-1">Funds in Portfolio</p>
                            <p className="text-2xl font-bold text-foreground">
                              {portfolioSummary.fundCount}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Your Investments</h3>
                        <div className="flex gap-2">
                          <CAMSUpload compact onDataLoaded={(holdings) => { setCamsUploadedData({ holdings, total_current_value: holdings.reduce((s, h) => s + (h.current_value ?? 0), 0), total_cost_value: holdings.reduce((s, h) => s + (h.cost_value ?? 0), 0) }); setHasCamsData(true); }} onSave={(holdings) => { saveCamsHoldings(holdings.map(h => ({ fund_name: h.fund_name, amc: h.amc, folio_number: h.folio_number, units: h.units, nav: h.nav, current_value: h.current_value, cost_value: h.cost_value, category: h.category }))); }} />
                          <Button size="sm" onClick={() => setIsAddFundOpen(true)}>
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Fund
                          </Button>
                        </div>
                      </div>

                      {portfolioLoading ? (
                        <DashboardLoadingState />
                      ) : (
                        <div className="space-y-4">
                          {portfolio.map(item => {
                            const insight = getPortfolioInsight(item);
                            return (
                              <Card
                                key={item.id}
                                className="glass-card cursor-pointer hover:border-white/25 transition-colors"
                                onClick={() => handlePortfolioItemClick(item)}
                              >
                                <CardContent className="py-4">
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold">{item.fund_name}</h4>
                                        <Badge variant="outline" className="text-xs">
                                          {item.fund_category}
                                        </Badge>
                                      </div>
                                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                        {item.invested_amount && (
                                          <span>Invested: ₹{item.invested_amount.toLocaleString()}</span>
                                        )}
                                        {item.is_sip && item.sip_amount && (
                                          <span>SIP: ₹{item.sip_amount.toLocaleString()}/mo</span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                                        insight.type === 'continue'
                                          ? 'bg-success/20 text-success'
                                          : insight.type === 'reduce'
                                            ? 'bg-destructive/20 text-destructive'
                                            : 'bg-warning/20 text-warning'
                                      }`}>
                                        {insight.type === 'continue' && <TrendingUp className="h-3 w-3" />}
                                        {insight.type === 'review' && <Minus className="h-3 w-3" />}
                                        {insight.type === 'reduce' && <TrendingDown className="h-3 w-3" />}
                                        {insight.message}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeFromPortfolio(item.id);
                                        }}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* === 2. CIFRAA Portfolio Intelligence Hero === */}
                  {hasAnalyticsData && profile && funds.length > 0 && (
                    <PortfolioIntelligenceHero
                      holdings={effectiveAnalyticsHoldings}
                      funds={funds}
                      riskTolerance={profile.risk_tolerance || 'moderate'}
                      investmentGoal={profile.primary_goal || (
                        profile.investment_goal === 'wealth' ? 'wealth_creation' :
                        profile.investment_goal === 'income' ? 'passive_income' :
                        profile.investment_goal === 'tax' ? 'tax_saving' :
                        profile.investment_goal === 'preservation' ? 'capital_preservation' :
                        'wealth_creation'
                      )}
                      investmentHorizon={profile.investment_horizon || 'long'}
                      experienceLevel={profile.experience_level || 'beginner'}
                      investmentAmount={profile.investment_amount || 'medium'}
                      onViewRecommended={() => {
                        document.getElementById('portfolio-comparison')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    />
                  )}

                  {/* === 3. Portfolio Analytics === */}
                  {hasAnalyticsData && <PortfolioAnalytics holdings={effectiveAnalyticsHoldings} />}

                  {/* === 4. AI Portfolio Review === */}
                  {hasAnalyticsData && <PortfolioReview holdings={effectiveAnalyticsHoldings} />}

                  {/* === 5. Portfolio vs CIFRAA === */}
                  <div id="portfolio-comparison">
                    {hasAnalyticsData && profile && funds.length > 0 && (
                      <PortfolioComparison
                        holdings={effectiveAnalyticsHoldings}
                        funds={funds}
                        riskTolerance={profile.risk_tolerance || 'moderate'}
                        investmentGoal={profile.primary_goal || (
                          profile.investment_goal === 'wealth' ? 'wealth_creation' :
                          profile.investment_goal === 'income' ? 'passive_income' :
                          profile.investment_goal === 'tax' ? 'tax_saving' :
                          profile.investment_goal === 'preservation' ? 'capital_preservation' :
                          'wealth_creation'
                        )}
                        investmentHorizon={profile.investment_horizon || 'long'}
                        experienceLevel={profile.experience_level || 'beginner'}
                        investmentAmount={profile.investment_amount || 'medium'}
                      />
                    )}
                  </div>

                  {/* === 6. Disclaimer === */}
                  {hasAnalyticsData && (
                    <Card className="bg-warning/10 border-warning/30">
                      <CardContent className="py-4 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                          <strong className="text-warning">Disclaimer:</strong> Educational insights only. Not investment advice. 
                          Past performance does not guarantee future results. Mutual fund investments are subject to market risks. 
                          Please consult a qualified financial advisor before making investment decisions.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Build Portfolio Tab */}
              {activeTab === 'build' && (
                <BuildPortfolio funds={funds} userProfile={profile} />
              )}

              {/* AI Tab */}
              {activeTab === 'ai' && (
                <AIChat resetKey={aiResetKey} />
              )}
            </div>
          </div>
        </main>
      </div>
      
      {activeTab !== 'ai' && <Footer />}

      {/* Mobile bottom navigation (phones / small tablets only) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        watchlistCount={watchlist.length}
        portfolioCount={portfolio.length}
      />

      {/* Fund Detail Modal */}
      <FundDetailModal
        fund={selectedFundForModal}
        sectorData={modalSectorData}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToPortfolio={handleAddToPortfolio}
        userRiskProfile={profile?.risk_tolerance || undefined}
        isBookmarked={selectedFundForModal ? isInWatchlist(selectedFundForModal.id) : false}
        onBookmarkToggle={toggleWatchlist}
      />

      {/* Add to Portfolio Dialog */}
      <Dialog open={isAddToPortfolioOpen} onOpenChange={setIsAddToPortfolioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Portfolio</DialogTitle>
            <DialogDescription>
              {portfolioFundToAdd?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invested-amount">Invested Amount (₹)</Label>
              <Input
                id="invested-amount"
                type="number"
                placeholder="e.g., 50000"
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-sip"
                checked={isSip}
                onChange={(e) => setIsSip(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="is-sip">This is a SIP investment</Label>
            </div>
            {isSip && (
              <div className="space-y-2">
                <Label htmlFor="sip-amount">Monthly SIP Amount (₹)</Label>
                <Input
                  id="sip-amount"
                  type="number"
                  placeholder="e.g., 5000"
                  value={sipAmount}
                  onChange={(e) => setSipAmount(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddToPortfolioOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitAddToPortfolio}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Portfolio
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Portfolio Fund Detail Modal */}
      <PortfolioFundModal
        fund={selectedPortfolioFund}
        portfolioItem={selectedPortfolioItem}
        isOpen={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        insight={selectedPortfolioItem ? getPortfolioInsight(selectedPortfolioItem) : null}
      />

      {/* Add Mutual Fund manual flow */}
      <AddFundDialog
        open={isAddFundOpen}
        onClose={() => setIsAddFundOpen(false)}
        funds={funds}
        onAdd={async (fund, details) => {
          await addToPortfolio(fund, details);
        }}
      />
    </div>
  );
};

export default Index;
