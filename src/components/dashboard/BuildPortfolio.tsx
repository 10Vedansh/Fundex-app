import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MutualFund, CATEGORY_LABELS } from '@/types/mutualFund';
import { RiskCapacityInputs } from '@/utils/recommendation/riskCapacity';
import {
  generateStrategyPortfolios,
  StrategyGenerationResult,
  PortfolioStrategy,
} from '@/utils/recommendation/strategyPortfolioEngine';
import { FundDetailModal } from '@/components/dashboard/FundDetailModal';
import { getCachedSectorData } from '@/utils/sectorDataGenerator';
import { cn } from '@/lib/utils';
import * as Recharts from 'recharts';
import {
  Shield, TrendingUp, Target, AlertTriangle,
  ArrowRight, Loader2, Info, ChevronRight,
  BarChart3, Clock, Gauge,
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

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
  'hsl(200, 70%, 50%)',
];

const RISK_BADGE_STYLES: Record<string, string> = {
  'Low': 'bg-success/15 text-success border-success/30',
  'Low-Medium': 'bg-success/15 text-success border-success/30',
  'Medium': 'bg-warning/15 text-warning border-warning/30',
  'Medium-High': 'bg-warning/15 text-warning border-warning/30',
  'High': 'bg-destructive/15 text-destructive border-destructive/30',
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

// ── Pie Tooltip ──
const PieTooltip = ({ active, payload }: any) => {
  if (active && payload?.[0]) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-medium text-foreground">{payload[0].payload.fullName || payload[0].payload.name}</p>
        <p className="text-primary font-semibold">{payload[0].value.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

// ── Risk Capacity Meter ──
function RiskCapacityMeter({ score }: { score: number }) {
  const pct = (score / 5) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 flex-1 rounded-full bg-secondary/50 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-success via-warning to-destructive transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold text-foreground">{score}/5</span>
    </div>
  );
}

// ── Strategy Card ──
function StrategyCard({
  strategy,
  isActive,
  onClick,
}: {
  strategy: PortfolioStrategy;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border-2 transition-all duration-200',
        isActive
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border/50 bg-card/50 hover:border-primary/30 hover:bg-secondary/20'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{strategy.name}</h3>
        <Badge variant="outline" className={cn('text-[10px]', RISK_BADGE_STYLES[strategy.riskLevel])}>
          {strategy.riskLevel} Risk
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {strategy.expectedReturnRange}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {strategy.horizonSuitability}
        </span>
      </div>
    </button>
  );
}

// ── Portfolio Detail View ──
function PortfolioDetail({
  strategy,
  investmentAmount,
  onFundClick,
}: {
  strategy: PortfolioStrategy;
  investmentAmount: number;
  onFundClick: (fund: MutualFund) => void;
}) {
  const pieData = strategy.funds.map((sf, i) => ({
    name: sf.fund.name.length > 22 ? sf.fund.name.slice(0, 20) + '…' : sf.fund.name,
    fullName: sf.fund.name,
    value: sf.allocationPercent,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wider">Risk Level</p>
            <Badge variant="outline" className={cn('text-xs', RISK_BADGE_STYLES[strategy.riskLevel])}>
              {strategy.riskLevel}
            </Badge>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wider">Expected Return</p>
            <p className="text-lg font-bold text-success">{strategy.expectedReturnRange}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wider">Horizon Fit</p>
            <p className="text-xs font-medium text-foreground">{strategy.horizonSuitability}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wider">Funds</p>
            <p className="text-lg font-bold text-foreground">{strategy.funds.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Single Pie Chart + Legend */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Portfolio Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-[240px] w-[240px] flex-shrink-0">
              <Recharts.ResponsiveContainer width="100%" height="100%">
                <Recharts.PieChart>
                  <Recharts.Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return value >= 10 ? (
                        <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-semibold">
                          {`${value.toFixed(0)}%`}
                        </text>
                      ) : null;
                    }}
                  >
                    {pieData.map((entry, index) => (
                      <Recharts.Cell key={index} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                  </Recharts.Pie>
                  <Recharts.Tooltip content={<PieTooltip />} />
                </Recharts.PieChart>
              </Recharts.ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 w-full">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground truncate flex-1">{d.fullName}</span>
                  <span className="font-semibold text-foreground tabular-nums">{d.value.toFixed(1)}%</span>
                </div>
              ))}
              <div className="pt-2 border-t border-border/30 flex justify-between text-sm font-semibold">
                <span className="text-muted-foreground">Total</span>
                <span className="text-foreground">100%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fund List with Justifications */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Fund Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {strategy.funds.map((sf, i) => {
            const catLabel = CATEGORY_LABELS[(sf.fund.category || '').trim()] || sf.fund.category;
            const fundAmount = Math.round(investmentAmount * sf.allocationPercent / 100);

            return (
              <div
                key={sf.fund.id}
                className="p-4 rounded-xl bg-secondary/20 hover:bg-secondary/40 border border-border/20 cursor-pointer transition-all duration-200 group"
                onClick={() => onFundClick(sf.fund as unknown as MutualFund)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <p className="font-semibold text-sm truncate">{sf.fund.name}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground ml-[18px]">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{sf.assetClass}</Badge>
                      <span>{catLabel}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-foreground">{sf.allocationPercent.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">₹{fundAmount.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed ml-[18px] mt-2 border-t border-border/20 pt-2">
                  {sf.justification}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-primary mt-1 ml-[18px] opacity-0 group-hover:opacity-100 transition-opacity">
                  View fund details <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Profile Fit Explanation */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Why This Portfolio Fits Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{strategy.profileFitExplanation}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── MAIN COMPONENT ──

export function BuildPortfolio({ funds, userProfile }: BuildPortfolioProps) {
  const [step, setStep] = useState<'inputs' | 'result'>('inputs');
  const [isBuilding, setIsBuilding] = useState(false);
  const [result, setResult] = useState<StrategyGenerationResult | null>(() => {
    try {
      const saved = sessionStorage.getItem('cifraa_strategy_portfolios_v4');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [activeStrategy, setActiveStrategy] = useState(0);

  const [selectedModalFund, setSelectedModalFund] = useState<MutualFund | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (result && result.strategies.length > 0) setStep('result');
  }, []);

  useEffect(() => {
    if (result) {
      sessionStorage.setItem('cifraa_strategy_portfolios_v4', JSON.stringify(result));
    }
  }, [result]);

  // Form state
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

  const [wantCommodities, setWantCommodities] = useState(false);
  const [wantSectoral, setWantSectoral] = useState(false);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedMfTypes, setSelectedMfTypes] = useState<string[]>([]);
  const [selectedEquitySubs, setSelectedEquitySubs] = useState<string[]>([]);
  const [selectedDebtSubs, setSelectedDebtSubs] = useState<string[]>([]);
  const [selectedHybridSubs, setSelectedHybridSubs] = useState<string[]>([]);

  const allFieldsFilled = risk && goal && horizon && experience && amount && occupation && incomeStability && emis && dependents && existingInvestments;

  const handleFundClick = (fund: MutualFund) => {
    const fullFund = funds.find(f => f.id === fund.id) || fund;
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

      const investmentAmount = parseFloat(amount) || 100000;

      const generationResult = generateStrategyPortfolios(
        funds,
        risk,
        goal,
        horizon,
        experience,
        investmentAmount,
        capacityInputs,
      );

      setResult(generationResult);
      setActiveStrategy(0);
      setStep('result');
      setIsBuilding(false);
    }, 600);
  };

  const modalSectorData = selectedModalFund ? getCachedSectorData(selectedModalFund) : null;

  // ── RESULT VIEW ──
  if (step === 'result' && result && result.strategies.length > 0) {
    const currentStrategy = result.strategies[activeStrategy] || result.strategies[0];
    const displayAmount = result.userInputSummary.investmentAmount;

    return (
      <div className="animate-fade-in space-y-5">
        {/* Risk capacity adjustment warning */}
        {result.capacityResult.wasAdjusted && (
          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="py-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">Risk Capacity Adjustment</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.capacityResult.reasons.find(r => r.includes('adjusted')) || 'Your risk has been adjusted based on your financial profile.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Risk Capacity Score */}
        <Card className="glass-card">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Gauge className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Your Risk Capacity Score</p>
                <RiskCapacityMeter score={result.capacityResult.capacityScore} />
              </div>
              <Badge variant="outline" className="text-xs">
                {result.capacityResult.capacityLabel}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Strategy Selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Select a strategy to explore:</p>
          <div className={cn('grid gap-3', result.strategies.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2')}>
            {result.strategies.map((strategy, i) => (
              <StrategyCard
                key={strategy.name}
                strategy={strategy}
                isActive={i === activeStrategy}
                onClick={() => setActiveStrategy(i)}
              />
            ))}
          </div>
        </div>

        {/* Active Strategy Detail */}
        <PortfolioDetail
          strategy={currentStrategy}
          investmentAmount={displayAmount}
          onFundClick={handleFundClick}
        />

        {/* Disclaimer */}
        <Card className="bg-warning/10 border-warning/30">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-warning">Disclaimer:</strong> This is an educational tool, not investment advice. Past performance does not guarantee future results. Consult a SEBI-registered advisor before investing.
            </p>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => {
          setStep('inputs');
          sessionStorage.removeItem('cifraa_strategy_portfolios_v4');
          setResult(null);
        }} className="w-full">
          ← Adjust Inputs & Rebuild
        </Button>

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

  // ── INPUT FORM ──
  return (
    <div className="animate-fade-in space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Build My Portfolio
          </CardTitle>
          <CardDescription>
            Answer all questions to generate 3–4 professionally structured portfolio strategies tailored to your profile
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

          {/* Intermediate Experience */}
          {experience === 'intermediate' && (
            <div className="pt-4 border-t border-border/50 space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Additional Preferences
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <Checkbox id="commodities" checked={wantCommodities} onCheckedChange={(v) => setWantCommodities(!!v)} />
                  <Label htmlFor="commodities" className="text-sm cursor-pointer">I want to invest in Commodities (Gold/Silver)</Label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <Checkbox id="sectoral" checked={wantSectoral} onCheckedChange={(v) => { setWantSectoral(!!v); if (!v) setSelectedSectors([]); }} />
                  <Label htmlFor="sectoral" className="text-sm cursor-pointer">I want to invest in Sectoral/Thematic funds</Label>
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
                <p className="text-xs text-muted-foreground">Which types of mutual funds do you want?</p>
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
                        <Checkbox id={`eq-${s.value}`} checked={selectedEquitySubs.includes(s.value)} onCheckedChange={(v) => { if (v) setSelectedEquitySubs(prev => [...prev, s.value]); else setSelectedEquitySubs(prev => prev.filter(x => x !== s.value)); }} />
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
                        <Checkbox id={`dt-${s.value}`} checked={selectedDebtSubs.includes(s.value)} onCheckedChange={(v) => { if (v) setSelectedDebtSubs(prev => [...prev, s.value]); else setSelectedDebtSubs(prev => prev.filter(x => x !== s.value)); }} />
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
                        <Checkbox id={`hy-${s.value}`} checked={selectedHybridSubs.includes(s.value)} onCheckedChange={(v) => { if (v) setSelectedHybridSubs(prev => [...prev, s.value]); else setSelectedHybridSubs(prev => prev.filter(x => x !== s.value)); }} />
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
                <Input type="number" value={emis} onChange={e => setEmis(e.target.value)} placeholder="e.g. 15000" />
              </div>
              <div className="space-y-2">
                <Label>Number of Dependents <span className="text-destructive">*</span></Label>
                <Input type="number" value={dependents} onChange={e => setDependents(e.target.value)} placeholder="e.g. 2" />
              </div>
              <div className="space-y-2">
                <Label>Insurance Coverage</Label>
                <div className="flex items-center gap-3 h-10">
                  <Checkbox id="insurance" checked={hasInsurance} onCheckedChange={(v) => setHasInsurance(!!v)} />
                  <Label htmlFor="insurance" className="text-sm cursor-pointer">I have health/life insurance</Label>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleBuild}
            disabled={!allFieldsFilled || isBuilding}
            className="w-full h-12 text-base font-semibold"
          >
            {isBuilding ? (
              <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Generating Portfolios...</span>
            ) : (
              <span className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Generate Portfolio Strategies</span>
            )}
          </Button>
        </CardContent>
      </Card>

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
