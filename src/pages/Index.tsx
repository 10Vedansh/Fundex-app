import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { FundCard } from '@/components/dashboard/FundCard';
import { FundFilters } from '@/components/dashboard/FundFilters';
import { SectorAllocationChart } from '@/components/dashboard/SectorAllocationChart';
import { RecommendationCard } from '@/components/dashboard/RecommendationCard';
import { FundDetailModal } from '@/components/dashboard/FundDetailModal';
import { SectorSearchDropdown } from '@/components/dashboard/SectorSearchDropdown';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MutualFund, RiskProfile, FundRecommendation, AIInsight, FundSectorData } from '@/types/mutualFund';
import { getCachedSectorData, clearSectorDataCache } from '@/utils/sectorDataGenerator';
import { LayoutGrid, PieChart, Sparkles, AlertTriangle, Loader2, Wifi, WifiOff, Bookmark, TrendingUp, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const [funds, setFunds] = useState<MutualFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveData, setIsLiveData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('rank');
  const [selectedFundA, setSelectedFundA] = useState('');
  const [selectedFundB, setSelectedFundB] = useState('');
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('Moderate');
  const [recommendations, setRecommendations] = useState<FundRecommendation[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  
  // Modal state
  const [selectedFundForModal, setSelectedFundForModal] = useState<MutualFund | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchFunds = async () => {
    setIsLoading(true);
    clearSectorDataCache(); // Clear cache when refreshing
    try {
      const { data, error } = await supabase.functions.invoke('mfapi');
      
      if (error) throw error;
      
      if (data?.funds && data.funds.length > 0) {
        setFunds(data.funds);
        setIsLiveData(true);
        if (!selectedFundA && data.funds[0]) setSelectedFundA(data.funds[0].id);
        if (!selectedFundB && data.funds[1]) setSelectedFundB(data.funds[1].id);
        toast.success(`Loaded ${data.funds.length} funds from MFAPI`);
      } else {
        throw new Error('No funds returned');
      }
    } catch (err) {
      console.error('Failed to fetch live data:', err);
      toast.error('Failed to fetch live data. Using cached data.');
      // Import mock data as fallback
      const { mockFunds } = await import('@/data/mockFunds');
      setFunds(mockFunds);
      setIsLiveData(false);
      if (!selectedFundA && mockFunds[0]) setSelectedFundA(mockFunds[0].id);
      if (!selectedFundB && mockFunds[1]) setSelectedFundB(mockFunds[1].id);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFunds();
  }, []);

  const filteredFunds = useMemo(() => {
    let result = [...funds];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(query) || 
        f.amc.toLowerCase().includes(query)
      );
    }
    
    if (categoryFilter !== 'All') {
      result = result.filter(f => f.category === categoryFilter);
    }
    
    result.sort((a, b) => {
      switch (sortBy) {
        case 'cagr1Y': return b.cagr1Y - a.cagr1Y;
        case 'sharpeRatio': return b.sharpeRatio - a.sharpeRatio;
        case 'volatility': return a.volatility - b.volatility;
        case 'expenseRatio': return a.expenseRatio - b.expenseRatio;
        case 'aum': return b.aum - a.aum;
        default: return a.rank - b.rank;
      }
    });
    
    return result;
  }, [funds, searchQuery, categoryFilter, sortBy]);

  // Get sector data for a fund using the new generator
  const getSectorData = useCallback((fundId: string): FundSectorData | null => {
    const fund = funds.find(f => f.id === fundId);
    if (!fund) return null;
    return getCachedSectorData(fund);
  }, [funds]);

  const sectorDataA = useMemo(() => getSectorData(selectedFundA), [selectedFundA, getSectorData]);
  const sectorDataB = useMemo(() => getSectorData(selectedFundB), [selectedFundB, getSectorData]);

  // Get sector data for modal
  const modalSectorData = useMemo(() => {
    if (!selectedFundForModal) return null;
    return getCachedSectorData(selectedFundForModal);
  }, [selectedFundForModal]);

  const handleFundClick = (fund: MutualFund) => {
    setSelectedFundForModal(fund);
    setIsModalOpen(true);
  };

  const toggleWatchlist = (fundId: string) => {
    setWatchlist(prev => 
      prev.includes(fundId) 
        ? prev.filter(id => id !== fundId)
        : [...prev, fundId]
    );
  };

  const watchlistFunds = useMemo(() => 
    funds.filter(f => watchlist.includes(f.id)),
    [funds, watchlist]
  );

  const globalFilteredFunds = useMemo(() => {
    if (!globalSearch) return [];
    const query = globalSearch.toLowerCase();
    return funds.filter(f => 
      f.name.toLowerCase().includes(query) || 
      f.amc.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [funds, globalSearch]);

  const generateRecommendations = async () => {
    setIsLoadingInsights(true);
    
    const filteredByRisk = funds.filter(f => {
      if (riskProfile === 'Conservative') return f.riskLevel === 'Low';
      if (riskProfile === 'Aggressive') return f.riskLevel === 'High' || (f.riskLevel === 'Moderate' && f.category === 'Equity');
      return true;
    }).sort((a, b) => b.sharpeRatio - a.sharpeRatio).slice(0, 5);

    if (filteredByRisk.length === 0) {
      toast.error('No funds match your risk profile. Try a different one.');
      setIsLoadingInsights(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: {
          funds: filteredByRisk.map(f => ({
            id: f.id, name: f.name, category: f.category, amc: f.amc,
            cagr1Y: f.cagr1Y, cagr3Y: f.cagr3Y, cagr5Y: f.cagr5Y,
            volatility: f.volatility, sharpeRatio: f.sharpeRatio,
            expenseRatio: f.expenseRatio, riskLevel: f.riskLevel,
            alpha: f.alpha, beta: f.beta, aum: f.aum, strengthBadge: f.strengthBadge,
          })),
          riskProfile,
        },
      });

      if (error) throw error;

      const insights: AIInsight[] = data.insights || [];
      const recs: FundRecommendation[] = filteredByRisk.map((fund, idx) => ({
        fund,
        insight: insights.find(i => i.fundId === fund.id) || {
          fundId: fund.id,
          insight: `${fund.name} offers solid ${fund.riskLevel.toLowerCase()} risk returns with ${fund.cagr1Y.toFixed(1)}% annual growth.`,
          rationale: `Sharpe ratio of ${fund.sharpeRatio} indicates good risk-adjusted performance.`,
        },
        matchScore: 100 - idx * 10,
      }));
      
      setRecommendations(recs);
      toast.success('AI insights generated successfully!');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to generate AI insights. Using basic analysis.');
      setRecommendations(filteredByRisk.map((fund, idx) => ({
        fund,
        insight: { 
          fundId: fund.id, 
          insight: `Strong performer in ${fund.category} category with ${fund.cagr1Y.toFixed(1)}% returns.`, 
          rationale: `Risk level: ${fund.riskLevel}, Sharpe: ${fund.sharpeRatio}` 
        },
        matchScore: 100 - idx * 10,
      })));
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const LoadingCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="glass-card">
          <CardContent className="p-6 space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-24" />
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader onRefresh={fetchFunds} isLoading={isLoading} />
      
      <main className="container mx-auto px-4 py-6 flex-1">
        {/* Global Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search all mutual funds by name or AMC..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 h-12"
          />
          {globalSearch && globalFilteredFunds.length > 0 && (
            <Card className="absolute top-full left-0 right-0 mt-2 z-50 glass-card max-h-80 overflow-auto">
              <CardContent className="p-2">
                {globalFilteredFunds.map(fund => (
                  <button
                    key={fund.id}
                    onClick={() => {
                      handleFundClick(fund);
                      setGlobalSearch('');
                    }}
                    className="w-full p-3 text-left hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    <p className="font-medium text-sm">{fund.name}</p>
                    <p className="text-xs text-muted-foreground">{fund.amc} • {fund.category}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Live Data Indicator */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          {isLiveData ? (
            <>
              <Wifi className="h-4 w-4 text-success" />
              <span className="text-success">Live data from MFAPI</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Using cached data</span>
            </>
          )}
          <span className="text-muted-foreground">• {funds.length} funds</span>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-secondary/50">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="sectors" className="gap-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Sectors</span>
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="gap-2">
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Watchlist</span>
              {watchlist.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                  {watchlist.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-fade-in">
            <FundFilters 
              searchQuery={searchQuery} 
              onSearchChange={setSearchQuery} 
              categoryFilter={categoryFilter} 
              onCategoryChange={setCategoryFilter} 
              sortBy={sortBy} 
              onSortChange={setSortBy} 
            />
            {isLoading ? (
              <LoadingCards />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFunds.map(fund => (
                  <div key={fund.id} className="relative group">
                    <FundCard 
                      fund={fund} 
                      onClick={() => handleFundClick(fund)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(fund.id);
                        toast.success(watchlist.includes(fund.id) ? 'Removed from watchlist' : 'Added to watchlist');
                      }}
                    >
                      <Bookmark className={`h-4 w-4 ${watchlist.includes(fund.id) ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {!isLoading && filteredFunds.length === 0 && (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No funds found matching your criteria
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sectors" className="animate-fade-in space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectorSearchDropdown
                funds={funds}
                selectedFundId={selectedFundA}
                onSelect={setSelectedFundA}
                placeholder="Search Fund A by name or AMC..."
              />
              <SectorSearchDropdown
                funds={funds}
                selectedFundId={selectedFundB}
                onSelect={setSelectedFundB}
                placeholder="Search Fund B by name or AMC..."
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sectorDataA && <SectorAllocationChart sectorData={sectorDataA} />}
              {sectorDataB && <SectorAllocationChart sectorData={sectorDataB} />}
            </div>
            <Card className="bg-secondary/30">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> Sector allocation data is indicative and generated based on fund category and characteristics. For exact holdings, please refer to the fund's official factsheet.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Watchlist Tab */}
          <TabsContent value="watchlist" className="animate-fade-in space-y-6">
            {watchlistFunds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {watchlistFunds.map(fund => (
                  <div key={fund.id} className="relative">
                    <FundCard 
                      fund={fund} 
                      onClick={() => handleFundClick(fund)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(fund.id);
                      }}
                    >
                      <Bookmark className="h-4 w-4 fill-primary text-primary" />
                    </Button>
                  </div>
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
          </TabsContent>

          {/* Portfolio Insights Tab */}
          <TabsContent value="insights" className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-2">
                {(['Conservative', 'Moderate', 'Aggressive'] as RiskProfile[]).map(profile => (
                  <Button 
                    key={profile} 
                    variant={riskProfile === profile ? 'default' : 'outline'} 
                    onClick={() => setRiskProfile(profile)} 
                    size="sm"
                  >
                    {profile}
                  </Button>
                ))}
              </div>
              <Button 
                onClick={generateRecommendations} 
                disabled={isLoadingInsights || isLoading} 
                className="gap-2 gradient-primary text-primary-foreground"
              >
                {isLoadingInsights ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate Insights
              </Button>
            </div>

            {recommendations.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {recommendations.map((rec, idx) => (
                  <RecommendationCard key={rec.fund.id} recommendation={rec} rank={idx + 1} />
                ))}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select a risk profile and click "Generate Insights" to get personalized fund suggestions
                </CardContent>
              </Card>
            )}

            <Card className="bg-warning/10 border-warning/30">
              <CardContent className="py-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  <strong className="text-warning">Disclaimer:</strong> Insights are for informational purposes only. Past performance does not guarantee future results. Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully and consult a SEBI-registered advisor before investing.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />

      {/* Fund Detail Modal */}
      <FundDetailModal
        fund={selectedFundForModal}
        sectorData={modalSectorData}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default Index;
