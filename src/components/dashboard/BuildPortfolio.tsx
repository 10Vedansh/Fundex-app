import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { MutualFund, CATEGORY_LABELS } from '@/types/mutualFund';
import { ScoredFund, recommendFundsV2, RecommendationPreferences } from '@/utils/recommendation/intersectionEngine';
import { computeRiskCapacity, RiskCapacityInputs, RiskCapacityResult } from '@/utils/recommendation/riskCapacity';
import { constructPortfolio, ConstructedPortfolio, PortfolioAllocation } from '@/utils/recommendation/portfolioConstruction';
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

export function BuildPortfolio({ funds, userProfile }: BuildPortfolioProps) {
  const [step, setStep] = useState<'inputs' | 'result'>('inputs');
  const [isBuilding, setIsBuilding] = useState(false);
  const [portfolio, setPortfolio] = useState<ConstructedPortfolio | null>(null);
  const [capacityResult, setCapacityResult] = useState<RiskCapacityResult | null>(null);
  const [expandedFund, setExpandedFund] = useState<string | null>(null);

  // Form state
  const [risk, setRisk] = useState(userProfile?.risk_tolerance || 'moderate');
  const [goal, setGoal] = useState(userProfile?.investment_goal || 'wealth');
  const [horizon, setHorizon] = useState(userProfile?.investment_horizon || 'long');
  const [experience, setExperience] = useState(userProfile?.experience_level || 'intermediate');
  const [amount, setAmount] = useState('100000');
  const [monthlySip, setMonthlySip] = useState('10000');
  const [occupation, setOccupation] = useState(userProfile?.occupation || 'salaried');
  const [incomeStability, setIncomeStability] = useState(userProfile?.income_stability || 'stable');
  const [emis, setEmis] = useState(String(userProfile?.monthly_emis || 0));
  const [dependents, setDependents] = useState(String(userProfile?.dependents || 0));
  const [hasInsurance, setHasInsurance] = useState(userProfile?.has_insurance ?? true);
  const [existingInvestments, setExistingInvestments] = useState(userProfile?.existing_investments || 'mixed');

  const handleBuild = () => {
    setIsBuilding(true);

    setTimeout(() => {
      // Compute risk capacity
      const capacityInputs: RiskCapacityInputs = {
        occupation,
        incomeStability,
        monthlyEmis: parseFloat(emis) || 0,
        dependents: parseInt(dependents) || 0,
        hasInsurance,
        existingInvestments,
      };

      const capacity = computeRiskCapacity(capacityInputs, risk);
      setCapacityResult(capacity);

      // Get eligible funds using V3 engine
      const prefs: RecommendationPreferences = {
        riskTolerance: capacity.adjustedRiskLevel,
        investmentGoal: goal,
        investmentHorizon: horizon,
        experienceLevel: experience,
        investmentAmount: parseFloat(amount) < 50000 ? 'small' : parseFloat(amount) < 500000 ? 'medium' : 'large',
      };

      const scoredFunds = recommendFundsV2(funds, prefs);

      // Construct portfolio
      const constructed = constructPortfolio(
        scoredFunds,
        capacity.capacityScore,
        parseFloat(amount) || 100000,
        parseFloat(monthlySip) || 10000,
        goal,
      );

      setPortfolio(constructed);
      setStep('result');
      setIsBuilding(false);
    }, 500);
  };

  if (step === 'result' && portfolio && capacityResult) {
    return (
      <div className="animate-fade-in space-y-6">
        {/* Risk Capacity Banner */}
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

        {/* Portfolio Summary */}
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

        {/* Allocation Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Your Portfolio Allocation
            </CardTitle>
            <CardDescription>
              {portfolio.reasons[0]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portfolio.allocations.map((alloc, idx) => (
                <div key={alloc.fund.id}>
                  <div
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedFund(expandedFund === alloc.fund.id ? null : alloc.fund.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{alloc.fund.name}</p>
                        {alloc.fund.suitabilityBadge && (
                          <Badge variant="outline" className={cn('text-[10px] px-1.5', SUITABILITY_COLORS[alloc.fund.suitabilityBadge])}>
                            {alloc.fund.suitabilityBadge}
                          </Badge>
                        )}
                      </div>
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
                          ₹{Math.round(parseFloat(amount) * alloc.allocationPercent / 100).toLocaleString()}
                        </p>
                      </div>
                      {expandedFund === alloc.fund.id ?
                        <ChevronUp className="h-4 w-4 text-muted-foreground" /> :
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>

                  {expandedFund === alloc.fund.id && (
                    <div className="ml-4 mt-2 p-3 rounded-lg bg-muted/30 space-y-2 animate-fade-in">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">3Y CAGR</p>
                          <p className="font-medium">{(alloc.fund.ret3Y ?? alloc.fund.cagr3Y)?.toFixed(1) ?? 'NA'}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Sharpe</p>
                          <p className="font-medium">{alloc.fund.sharpeRatio?.toFixed(2) ?? 'NA'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Volatility</p>
                          <p className="font-medium">{alloc.fund.volatility?.toFixed(1) ?? 'NA'}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Expense</p>
                          <p className="font-medium">{alloc.fund.expenseRatio?.toFixed(2) ?? 'NA'}%</p>
                        </div>
                      </div>
                      {alloc.fund.reasons && alloc.fund.reasons.length > 0 && (
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Why this fund?</p>
                          <div className="flex flex-wrap gap-1">
                            {alloc.fund.reasons.map((r, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{r}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SIP Split */}
        {parseFloat(monthlySip) > 0 && (
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

        {/* Why this portfolio */}
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

        <Button variant="outline" onClick={() => setStep('inputs')} className="w-full">
          ← Adjust Inputs & Rebuild
        </Button>
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
            Answer a few questions to get a diversified, risk-adjusted portfolio recommendation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Investment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Risk Tolerance</Label>
              <Select value={risk} onValueChange={setRisk}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Investment Goal</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wealth">Wealth Creation</SelectItem>
                  <SelectItem value="income">Regular Income</SelectItem>
                  <SelectItem value="preservation">Capital Preservation</SelectItem>
                  <SelectItem value="tax">Tax Saving</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Investment Horizon</Label>
              <Select value={horizon} onValueChange={setHorizon}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">&lt; 3 Years</SelectItem>
                  <SelectItem value="medium">3-5 Years</SelectItem>
                  <SelectItem value="long">5+ Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Experience Level</Label>
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="experienced">Experienced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lump Sum Amount (₹)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100000" />
            </div>
            <div className="space-y-2">
              <Label>Monthly SIP (₹)</Label>
              <Input type="number" value={monthlySip} onChange={e => setMonthlySip(e.target.value)} placeholder="10000" />
            </div>
          </div>

          {/* Financial Profile */}
          <div className="pt-4 border-t border-border/50">
            <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Financial Risk Profile
              <span className="text-xs text-muted-foreground">(determines your risk capacity)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Occupation</Label>
                <Select value={occupation} onValueChange={setOccupation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Income Stability</Label>
                <Select value={incomeStability} onValueChange={setIncomeStability}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Existing Investments</Label>
                <Select value={existingInvestments} onValueChange={setExistingInvestments}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Monthly EMIs (₹)</Label>
                <Input type="number" value={emis} onChange={e => setEmis(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Dependents</Label>
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

          <Button onClick={handleBuild} disabled={isBuilding} className="w-full" size="lg">
            {isBuilding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Building Portfolio...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Build My Portfolio
              </>
            )}
          </Button>
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
