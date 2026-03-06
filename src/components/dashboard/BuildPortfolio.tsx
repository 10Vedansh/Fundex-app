import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MutualFund, CATEGORY_LABELS, FundSectorData } from '@/types/mutualFund';
import { ScoredFund, recommendFundsV2, RecommendationPreferences } from '@/utils/recommendation/intersectionEngine';
import { computeRiskCapacity, RiskCapacityInputs, RiskCapacityResult } from '@/utils/recommendation/riskCapacity';
import { constructPortfolio, ConstructedPortfolio, PortfolioAllocation } from '@/utils/recommendation/portfolioConstruction';
import { FundDetailModal } from '@/components/dashboard/FundDetailModal';
import { getCachedSectorData } from '@/utils/sectorDataGenerator';
import { cn } from '@/lib/utils';
import {
  Shield, TrendingUp, Target, AlertTriangle, PieChart,
  ArrowRight, Loader2, Info, ChevronDown, ChevronUp
} from 'lucide-react';

interface BuildPortfolioProps {
  funds: MutualFund[];
  userProfile: {
    risk_tolerance?: string | null;
    investment_goal?: string | null;
    investment_horizon?: string | null;
    experience_level?: string | null;
    investment_amount?: string | null;
    occupation?: string | null;
    income_stability?: string | null;
    monthly_emis?: number | null;
    dependents?: number | null;
    has_insurance?: boolean | null;
    existing_investments?: string | null;
  } | null;
}

const RISK_COLORS = {
  low: 'bg-success/20 text-success border-success/30',
  moderate: 'bg-warning/20 text-warning border-warning/30',
  high: 'bg-destructive/20 text-destructive border-destructive/30',
};

const SUITABILITY_COLORS = {
  aligned: 'bg-success/20 text-success',
  adjusted: 'bg-warning/20 text-warning',
  limited: 'bg-destructive/20 text-destructive',
};

const SECTOR_OPTIONS = [
  { value: 'EQ-BANK', label: 'Banking' },
  { value: 'EQ-IT', label: 'IT' },
  { value: 'EQ-Pharma', label: 'Pharma' },
  { value: 'EQ-INFRA', label: 'Infrastructure' },
  { value: 'EQ-PSU', label: 'PSU' },
  { value: 'EQ-Energy', label: 'Energy' },
  { value: 'EQ-Consumption', label: 'Consumption' },
  { value: 'EQ-Manufacturing', label: 'Manufacturing' },
];

const MF_TYPE_OPTIONS = [
  { value: 'equity', label: 'Equity' },
  { value: 'debt', label: 'Debt' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'commodities', label: 'Commodities (Gold/Silver)' },
];

const EQUITY_SUB_OPTIONS = [
  { value: 'large_cap', label: 'Large Cap' },
  { value: 'mid_cap', label: 'Mid Cap' },
  { value: 'small_cap', label: 'Small Cap' },
  { value: 'flexi_cap', label: 'Flexi Cap' },
  { value: 'elss', label: 'ELSS (Tax Saving)' },
  { value: 'value', label: 'Value' },
  { value: 'sectoral', label: 'Sectoral/Thematic' },
];

const DEBT_SUB_OPTIONS = [
  { value: 'corporate_bond', label: 'Corporate Bond' },
  { value: 'short_duration', label: 'Short Duration' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'gilt', label: 'Gilt' },
  { value: 'banking_psu', label: 'Banking & PSU' },
];

const HYBRID_SUB_OPTIONS = [
  { value: 'balanced', label: 'Balanced Hybrid' },
  { value: 'aggressive', label: 'Aggressive Hybrid' },
  { value: 'conservative', label: 'Conservative Hybrid' },
  { value: 'dynamic', label: 'Dynamic Asset Allocation' },
  { value: 'multi_asset', label: 'Multi Asset' },
];

const PORTFOLIO_THEMES = [
  { id: 'balanced', label: 'Balanced Growth', desc: 'Optimal risk-return balance' },
  { id: 'aggressive', label: 'Max Growth', desc: 'Higher returns, higher risk' },
  { id: 'conservative', label: 'Capital Safety', desc: 'Protect capital first' },
  { id: 'tax_saving', label: 'Tax Optimized', desc: 'ELSS + debt mix for tax savings' },
];

interface SavedPortfolios {
  portfolios: { theme: string; portfolio: ConstructedPortfolio; capacity: RiskCapacityResult }[];
}

export function BuildPortfolio({ funds, userProfile }: BuildPortfolioProps) {
  const [step, setStep] = useState<'inputs' | 'result'>('inputs');
  const [isBuilding, setIsBuilding] = useState(false);
  const [allPortfolios, setAllPortfolios] = useState<{ theme: string; label: string; portfolio: ConstructedPortfolio; capacity: RiskCapacityResult }[]>(() => {
    try {
      const saved = sessionStorage.getItem('cifraa_built_portfolios_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [activePortfolioIdx, setActivePortfolioIdx] = useState(0);
  const [expandedFund, setExpandedFund] = useState<string | null>(null);

  // Fund detail modal
  const [selectedModalFund, setSelectedModalFund] = useState<MutualFund | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize step based on saved portfolios
  useEffect(() => {
    if (allPortfolios.length > 0) {
      setStep('result');
    }
  }, []);

  // Save to session
  useEffect(() => {
    if (allPortfolios.length > 0) {
      sessionStorage.setItem('cifraa_built_portfolios_v2', JSON.stringify(allPortfolios));
    }
  }, [allPortfolios]);

  // Form state — empty by default
  const [risk, setRisk] = useState('');
  const [goal, setGoal] = useState('');
  const [horizon, setHorizon] = useState('');
  const [experience, setExperience] = useState('');
  const [investmentMode, setInvestmentMode] = useState<'lumpsum' | 'sip'>('lumpsum');
  const [amount, setAmount] = useState('');
  const [occupation, setOccupation] = useState('');
  const [incomeStability, setIncomeStability] = useState('');
  const [emis, setEmis] = useState('');
  const [dependents, setDependents] = useState('');
  const [hasInsurance, setHasInsurance] = useState(false);
  const [existingInvestments, setExistingInvestments] = useState('');

  // Experience-based extra questions
  const [wantCommodities, setWantCommodities] = useState(false);
  const [wantSectoral, setWantSectoral] = useState(false);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedMfTypes, setSelectedMfTypes] = useState<string[]>([]);
  const [selectedEquitySubs, setSelectedEquitySubs] = useState<string[]>([]);
  const [selectedDebtSubs, setSelectedDebtSubs] = useState<string[]>([]);
  const [selectedHybridSubs, setSelectedHybridSubs] = useState<string[]>([]);

  const allFieldsFilled = risk && goal && horizon && experience && amount && occupation && incomeStability && emis && dependents && existingInvestments;

  const handleFundClick = (fund: ScoredFund) => {
    // Find the full MutualFund object
    const fullFund = funds.find(f => f.id === fund.id) || fund as unknown as MutualFund;
    setSelectedModalFund(fullFund);
    setIsModalOpen(true);
  };

  const handleBuild = () => {
    if (!allFieldsFilled) return;
    setIsBuilding(true);

    setTimeout(() => {
      const capacityInputs: RiskCapacityInputs = {
        occupation: occupation || 'salaried',
        incomeStability: incomeStability || 'stable',
        monthlyEmis: parseFloat(emis) || 0,
        dependents: parseInt(dependents) || 0,
        hasInsurance,
        existingInvestments: existingInvestments || 'none',
      };

      const capacity = computeRiskCapacity(capacityInputs, risk);

      const investmentAmount = parseFloat(amount) || 100000;
      const sipAmount = investmentMode === 'sip' ? investmentAmount : 0;
      const lumpAmount = investmentMode === 'lumpsum' ? investmentAmount : 0;

      // Generate multiple portfolio themes
      const riskVariants = [
        { theme: 'balanced', label: 'Balanced Growth', riskAdj: 0 },
        { theme: 'aggressive', label: 'Max Growth', riskAdj: 1 },
        { theme: 'conservative', label: 'Capital Safety', riskAdj: -1 },
        { theme: 'tax_saving', label: 'Tax Optimized', riskAdj: 0, goalOverride: 'tax' },
      ];

      const portfolios = riskVariants.map(variant => {
        const adjustedRiskMap: Record<string, string> = {
          conservative: variant.riskAdj === -1 ? 'conservative' : variant.riskAdj === 1 ? 'moderate' : 'conservative',
          moderate: variant.riskAdj === -1 ? 'conservative' : variant.riskAdj === 1 ? 'aggressive' : 'moderate',
          aggressive: variant.riskAdj === -1 ? 'moderate' : variant.riskAdj === 1 ? 'aggressive' : 'aggressive',
        };
        const adjustedRisk = adjustedRiskMap[capacity.adjustedRiskLevel] || capacity.adjustedRiskLevel;
        const adjustedCapacity = computeRiskCapacity(capacityInputs, adjustedRisk);

        const prefs: RecommendationPreferences = {
          riskTolerance: adjustedCapacity.adjustedRiskLevel,
          investmentGoal: variant.goalOverride || goal,
          investmentHorizon: horizon,
          experienceLevel: experience,
          investmentAmount: investmentAmount < 50000 ? 'small' : investmentAmount < 500000 ? 'medium' : 'large',
        };

        const scoredFunds = recommendFundsV2(funds, prefs);

        const constructed = constructPortfolio(
          scoredFunds,
          adjustedCapacity.capacityScore,
          investmentMode === 'lumpsum' ? investmentAmount : investmentAmount * 12,
          investmentMode === 'sip' ? investmentAmount : 0,
          variant.goalOverride || goal,
        );

        return {
          theme: variant.theme,
          label: variant.label,
          portfolio: constructed,
          capacity: adjustedCapacity,
        };
      });

      setAllPortfolios(portfolios);
      setActivePortfolioIdx(0);
      setStep('result');
      setIsBuilding(false);
    }, 500);
  };

  const modalSectorData = selectedModalFund ? getCachedSectorData(selectedModalFund) : null;

  if (step === 'result' && allPortfolios.length > 0) {
    const current = allPortfolios[activePortfolioIdx];
    const portfolio = current.portfolio;
    const capacityResult = current.capacity;
    const displayAmount = parseFloat(amount) || 100000;

    return (
      <div className="animate-fade-in space-y-6">
        {/* Portfolio theme tabs */}
        <Tabs value={current.theme} onValueChange={(v) => {
          const idx = allPortfolios.findIndex(p => p.theme === v);
          if (idx >= 0) setActivePortfolioIdx(idx);
        }}>
          <TabsList className="grid grid-cols-4 w-full">
            {allPortfolios.map(p => (
              <TabsTrigger key={p.theme} value={p.theme} className="text-xs">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {capacityResult.wasAdjusted && (
          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">Risk Capacity Adjustment</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {capacityResult.reasons.find(r => r.includes('adjusted')) || 'Your risk has been adjusted based on your financial profile.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Expected CAGR</p>
              <p className="text-2xl font-bold text-success">{portfolio.expectedCagr.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Expected Volatility</p>
              <p className="text-2xl font-bold text-foreground">{portfolio.expectedVolatility.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Downside Risk</p>
              <Badge variant="outline" className={RISK_COLORS[portfolio.downsideRisk]}>
                {portfolio.downsideRisk.charAt(0).toUpperCase() + portfolio.downsideRisk.slice(1)}
              </Badge>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Risk Capacity</p>
              <RiskCapacityMeter score={capacityResult.capacityScore} />
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              {current.label} — Portfolio Allocation
            </CardTitle>
            <CardDescription>{portfolio.reasons[0]}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portfolio.allocations.map((alloc) => (
                <div key={alloc.fund.id}>
                  <div
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => handleFundClick(alloc.fund)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{alloc.fund.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{alloc.bucket}</span>
                        <span>•</span>
                        <span>{CATEGORY_LABELS[alloc.fund.category] || alloc.fund.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-sm">{alloc.allocationPercent.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">
                          ₹{Math.round(displayAmount * alloc.allocationPercent / 100).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {investmentMode === 'sip' && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Suggested Monthly SIP Split</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {portfolio.sipSplit.map((s, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                    <p className="text-sm truncate flex-1 mr-4">{s.fundName}</p>
                    <p className="font-medium text-sm">₹{s.amount.toLocaleString()}/mo</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Why This Portfolio Suits You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {portfolio.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{r}</span>
                </li>
              ))}
              <li className="flex items-start gap-2 text-sm">
                <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  Rebalancing recommended: {portfolio.rebalancingFrequency}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-warning/10 border-warning/30">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-warning">Disclaimer:</strong> This is an educational tool, not investment advice.
              Past performance does not guarantee future results. Consult a SEBI-registered advisor before investing.
            </p>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => {
          setStep('inputs');
          sessionStorage.removeItem('cifraa_built_portfolios_v2');
          setAllPortfolios([]);
        }} className="w-full">
          ← Adjust Inputs & Rebuild
        </Button>

        {/* Fund Detail Modal */}
        <FundDetailModal
          fund={selectedModalFund}
          sectorData={modalSectorData}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userRiskProfile={userProfile?.risk_tolerance || undefined}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Build My Portfolio
          </CardTitle>
          <CardDescription>
            Answer all questions below to get 4 diversified, risk-adjusted portfolio recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Core Investment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Risk Tolerance <span className="text-destructive">*</span></Label>
              <Select value={risk} onValueChange={setRisk}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Investment Goal <span className="text-destructive">*</span></Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wealth">Wealth Creation</SelectItem>
                  <SelectItem value="income">Regular Income</SelectItem>
                  <SelectItem value="preservation">Capital Preservation</SelectItem>
                  <SelectItem value="tax">Tax Saving</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Investment Horizon <span className="text-destructive">*</span></Label>
              <Select value={horizon} onValueChange={setHorizon}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">&lt; 3 Years</SelectItem>
                  <SelectItem value="medium">3-5 Years</SelectItem>
                  <SelectItem value="long">5+ Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Experience Level <span className="text-destructive">*</span></Label>
              <Select value={experience} onValueChange={(v) => {
                setExperience(v);
                setWantCommodities(false);
                setWantSectoral(false);
                setSelectedSectors([]);
                setSelectedMfTypes([]);
                setSelectedEquitySubs([]);
                setSelectedDebtSubs([]);
                setSelectedHybridSubs([]);
              }}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="experienced">Experienced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Investment Mode Toggle */}
          <div className="space-y-3">
            <Label>Investment Mode <span className="text-destructive">*</span></Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setInvestmentMode('lumpsum'); setAmount(''); }}
                className={cn(
                  'flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                  investmentMode === 'lumpsum'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/50 text-muted-foreground hover:border-primary/30'
                )}
              >
                Lump Sum
              </button>
              <button
                type="button"
                onClick={() => { setInvestmentMode('sip'); setAmount(''); }}
                className={cn(
                  'flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                  investmentMode === 'sip'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/50 text-muted-foreground hover:border-primary/30'
                )}
              >
                Monthly SIP
              </button>
            </div>
            <div className="space-y-2">
              <Label>{investmentMode === 'sip' ? 'Monthly SIP Amount (₹)' : 'Lump Sum Amount (₹)'} <span className="text-destructive">*</span></Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={investmentMode === 'sip' ? 'e.g. 10000' : 'e.g. 100000'} />
            </div>
          </div>

          {/* Intermediate Experience: Extra Questions */}
          {experience === 'intermediate' && (
            <div className="pt-4 border-t border-border/50 space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Additional Preferences
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <Checkbox
                    id="commodities"
                    checked={wantCommodities}
                    onCheckedChange={(v) => setWantCommodities(!!v)}
                  />
                  <Label htmlFor="commodities" className="text-sm cursor-pointer">
                    I want to invest in Commodities (Gold/Silver)
                  </Label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <Checkbox
                    id="sectoral"
                    checked={wantSectoral}
                    onCheckedChange={(v) => {
                      setWantSectoral(!!v);
                      if (!v) setSelectedSectors([]);
                    }}
                  />
                  <Label htmlFor="sectoral" className="text-sm cursor-pointer">
                    I want to invest in Sectoral/Thematic funds
                  </Label>
                </div>
                {wantSectoral && (
                  <div className="ml-8 space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">Which sectors interest you?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SECTOR_OPTIONS.map(s => (
                        <div key={s.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`sector-${s.value}`}
                            checked={selectedSectors.includes(s.value)}
                            onCheckedChange={(v) => {
                              if (v) setSelectedSectors(prev => [...prev, s.value]);
                              else setSelectedSectors(prev => prev.filter(x => x !== s.value));
                            }}
                          />
                          <Label htmlFor={`sector-${s.value}`} className="text-xs cursor-pointer">{s.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Experienced: Full customization */}
          {experience === 'experienced' && (
            <div className="pt-4 border-t border-border/50 space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Customize Fund Types
              </h4>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Which types of mutual funds do you want in your portfolio?</p>
                <div className="grid grid-cols-2 gap-2">
                  {MF_TYPE_OPTIONS.map(t => (
                    <div key={t.value} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                      <Checkbox
                        id={`mf-${t.value}`}
                        checked={selectedMfTypes.includes(t.value)}
                        onCheckedChange={(v) => {
                          if (v) setSelectedMfTypes(prev => [...prev, t.value]);
                          else {
                            setSelectedMfTypes(prev => prev.filter(x => x !== t.value));
                            if (t.value === 'equity') setSelectedEquitySubs([]);
                            if (t.value === 'debt') setSelectedDebtSubs([]);
                            if (t.value === 'hybrid') setSelectedHybridSubs([]);
                          }
                        }}
                      />
                      <Label htmlFor={`mf-${t.value}`} className="text-sm cursor-pointer">{t.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {selectedMfTypes.includes('equity') && (
                <div className="ml-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Select equity sub-types:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {EQUITY_SUB_OPTIONS.map(s => (
                      <div key={s.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`eq-${s.value}`}
                          checked={selectedEquitySubs.includes(s.value)}
                          onCheckedChange={(v) => {
                            if (v) setSelectedEquitySubs(prev => [...prev, s.value]);
                            else setSelectedEquitySubs(prev => prev.filter(x => x !== s.value));
                          }}
                        />
                        <Label htmlFor={`eq-${s.value}`} className="text-xs cursor-pointer">{s.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMfTypes.includes('debt') && (
                <div className="ml-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Select debt sub-types:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DEBT_SUB_OPTIONS.map(s => (
                      <div key={s.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`dt-${s.value}`}
                          checked={selectedDebtSubs.includes(s.value)}
                          onCheckedChange={(v) => {
                            if (v) setSelectedDebtSubs(prev => [...prev, s.value]);
                            else setSelectedDebtSubs(prev => prev.filter(x => x !== s.value));
                          }}
                        />
                        <Label htmlFor={`dt-${s.value}`} className="text-xs cursor-pointer">{s.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMfTypes.includes('hybrid') && (
                <div className="ml-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Select hybrid sub-types:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {HYBRID_SUB_OPTIONS.map(s => (
                      <div key={s.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`hy-${s.value}`}
                          checked={selectedHybridSubs.includes(s.value)}
                          onCheckedChange={(v) => {
                            if (v) setSelectedHybridSubs(prev => [...prev, s.value]);
                            else setSelectedHybridSubs(prev => prev.filter(x => x !== s.value));
                          }}
                        />
                        <Label htmlFor={`hy-${s.value}`} className="text-xs cursor-pointer">{s.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Financial Profile */}
          <div className="pt-4 border-t border-border/50">
            <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Financial Risk Profile
              <span className="text-xs text-muted-foreground">(all fields required)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Occupation <span className="text-destructive">*</span></Label>
                <Select value={occupation} onValueChange={setOccupation}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salaried">Salaried</SelectItem>
                    <SelectItem value="business_owner">Business Owner</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                    <SelectItem value="homemaker">Homemaker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Income Stability <span className="text-destructive">*</span></Label>
                <Select value={incomeStability} onValueChange={setIncomeStability}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="very_stable">Very Stable</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="variable">Variable</SelectItem>
                    <SelectItem value="unstable">Unstable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Existing Investments <span className="text-destructive">*</span></Label>
                <Select value={existingInvestments} onValueChange={setExistingInvestments}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="fd_only">FD Only</SelectItem>
                    <SelectItem value="mixed">Mixed (FD + MF)</SelectItem>
                    <SelectItem value="diversified">Diversified</SelectItem>
                    <SelectItem value="advanced">Stocks + MF + Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monthly EMIs (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" value={emis} onChange={e => setEmis(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Dependents <span className="text-destructive">*</span></Label>
                <Input type="number" value={dependents} onChange={e => setDependents(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Has Insurance?</Label>
                <Select value={hasInsurance ? 'yes' : 'no'} onValueChange={v => setHasInsurance(v === 'yes')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes (Life + Health)</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button
            onClick={handleBuild}
            disabled={isBuilding || !allFieldsFilled}
            className="w-full"
            size="lg"
          >
            {isBuilding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Building Portfolios...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Build My Portfolios
              </>
            )}
          </Button>

          {!allFieldsFilled && (risk || goal || horizon || experience || amount) && (
            <p className="text-xs text-muted-foreground text-center">
              Please fill all required fields to build your portfolio
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Risk Capacity Meter ──

function RiskCapacityMeter({ score }: { score: number }) {
  const colors = ['bg-destructive', 'bg-destructive/70', 'bg-warning', 'bg-success/70', 'bg-success'];
  const labels = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];

  return (
    <div className="space-y-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={cn(
              'h-2 flex-1 rounded-sm transition-colors',
              i <= score ? colors[score - 1] : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className="text-xs font-medium">{labels[score - 1]}</p>
    </div>
  );
}
