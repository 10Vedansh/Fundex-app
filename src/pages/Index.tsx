import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { FundCard } from '@/components/dashboard/FundCard';
import { SectorAllocationChart } from '@/components/dashboard/SectorAllocationChart';
import { FundDetailModal } from '@/components/dashboard/FundDetailModal';
import { SectorSearchDropdown } from '@/components/dashboard/SectorSearchDropdown';
import { FundComparisonCard } from '@/components/dashboard/FundComparisonCard';
import { PortfolioFundModal } from '@/components/dashboard/PortfolioFundModal';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MutualFund, FundSectorData } from '@/types/mutualFund';
import { getCachedSectorData } from '@/utils/sectorDataGenerator';
import { 
  LayoutGrid, 
  PieChart, 
  Bookmark, 
  Wallet, 
  Search, 
  Wifi, 
  WifiOff, 
  Plus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Info
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFundCache } from '@/hooks/useFundCache';
import { useWatchlist } from '@/hooks/useWatchlist';
import { usePortfolio, PortfolioItem } from '@/hooks/usePortfolio';
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
  const { funds, isLoading, isLiveData, refreshFunds } = useFundCache();
  const { watchlist, isInWatchlist, toggleWatchlist } = useWatchlist();
  const { 
    portfolio, 
    addToPortfolio, 
    removeFromPortfolio, 
    isInPortfolio, 
    portfolioSummary,
    isLoading: portfolioLoading 
  } = usePortfolio();

  const [globalSearch, setGlobalSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
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

  // Filter funds based on user profile for personalization
  const personalizedFunds = useMemo(() => {
    if (!profile) return [];
    
    let result = [...funds];
    
    // Filter by risk tolerance
    if (profile.risk_tolerance === 'conservative') {
      result = result.filter(f => f.riskLevel === 'Low' || f.category === 'Debt' || f.category === 'Liquid');
    } else if (profile.risk_tolerance === 'aggressive') {
      result = result.filter(f => f.riskLevel === 'High' || f.riskLevel === 'Moderate');
    }
    // Moderate: show all

    // Filter by investment goal
    if (profile.investment_goal === 'income') {
      result = result.filter(f => f.category === 'Debt' || f.category === 'Hybrid');
    } else if (profile.investment_goal === 'preservation') {
      result = result.filter(f => f.category === 'Debt' || f.category === 'Liquid');
    } else if (profile.investment_goal === 'tax') {
      result = result.filter(f => f.category === 'Equity'); // ELSS funds
    }
    // Wealth: show all categories

    // Filter by investment horizon
    if (profile.investment_horizon === 'short') {
      result = result.filter(f => f.category === 'Liquid' || f.category === 'Debt');
    } else if (profile.investment_horizon === 'medium') {
      result = result.filter(f => f.category !== 'Liquid');
    }
    // Long: show all

    // Sort by Sharpe ratio and limit to 9 funds
    result.sort((a, b) => b.sharpeRatio - a.sharpeRatio);
    return result.slice(0, 9);
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

  // Generate educational insights for portfolio
  const getPortfolioInsight = (item: PortfolioItem): { type: 'continue' | 'review' | 'reduce'; message: string } => {
    const fund = funds.find(f => f.id === item.fund_id);
    if (!fund) return { type: 'review', message: 'Fund data not available' };

    // Simple educational signals based on fund characteristics
    if (fund.sharpeRatio >= 1.5 && fund.cagr1Y > 15) {
      return { type: 'continue', message: 'Strong risk-adjusted returns. Consider continuing.' };
    }
    if (fund.sharpeRatio < 0.8 || fund.cagr1Y < 5) {
      return { type: 'review', message: 'Below average performance. Consider reviewing.' };
    }
    if (fund.expenseRatio > 2) {
      return { type: 'reduce', message: 'High expense ratio. Consider reducing exposure.' };
    }
    return { type: 'continue', message: 'Performance in line with expectations.' };
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader onRefresh={refreshFunds} isLoading={isLoading} />
      
      <main className="container mx-auto px-4 py-6 flex-1">
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
            <TabsTrigger value="portfolio" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">My Portfolio</span>
              {portfolio.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                  {portfolio.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Single Global Search Bar - Hidden on Sectors tab */}
          {activeTab !== 'sectors' && (
            <div className="relative">
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
          )}

          {/* Overview Tab - Personalized Funds */}
          <TabsContent value="overview" className="animate-fade-in space-y-6">
            {/* Personalization explanation - Only in Overview */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3 flex items-center gap-3">
                <Info className="h-4 w-4 text-primary flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">Funds shown based on your risk profile and goals.</span>
                  {' '}Use the search bar above to explore mutual funds.
                </p>
              </CardContent>
            </Card>

            {isLoading ? (
              <LoadingCards />
            ) : personalizedFunds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </TabsContent>

          {/* Sectors Tab */}
          <TabsContent value="sectors" className="animate-fade-in space-y-6">
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
            {/* Fund Comparison Summary */}
            <FundComparisonCard fundA={comparisonFundA} fundB={comparisonFundB} />

            <Card className="bg-secondary/30">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> Sector allocation data is indicative. For exact holdings, refer to the fund's official factsheet.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Watchlist Tab */}
          <TabsContent value="watchlist" className="animate-fade-in space-y-6">
            {watchlistFunds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </TabsContent>

          {/* My Portfolio Tab */}
          <TabsContent value="portfolio" className="animate-fade-in space-y-6">
            {/* Portfolio Summary */}
            {portfolio.length > 0 && (
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
            )}

            {/* Add Fund Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Investments</h3>
              <p className="text-sm text-muted-foreground">
                Search above to add funds to your portfolio
              </p>
            </div>

            {portfolioLoading ? (
              <LoadingCards />
            ) : portfolio.length > 0 ? (
              <div className="space-y-4">
                {portfolio.map(item => {
                  const fund = funds.find(f => f.id === item.fund_id);
                  const insight = getPortfolioInsight(item);
                  
                  return (
                    <Card 
                      key={item.id} 
                      className="glass-card cursor-pointer hover:border-primary/50 transition-colors"
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
                          
                          {/* Educational Insight */}
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
            ) : (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">Your portfolio is empty</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Search for mutual funds above and add them to track your investments
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
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
        onAddToPortfolio={handleAddToPortfolio}
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
    </div>
  );
};

export default Index;
