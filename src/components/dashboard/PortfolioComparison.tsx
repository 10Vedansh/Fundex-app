import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { comparePortfolios } from '@/utils/portfolioComparisonEngine';
import { TrendingUp, TrendingDown, RefreshCw, AlertTriangle, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react';
import type { AnalyticsHolding } from './PortfolioAnalytics';
import type { MutualFund } from '@/types/mutualFund';

interface PortfolioComparisonProps {
  holdings: AnalyticsHolding[];
  funds: MutualFund[];
  riskTolerance: string;
  investmentGoal: string;
  investmentHorizon: string;
  experienceLevel: string;
  investmentAmount: string;
  occupation?: string | null;
  incomeStability?: string | null;
  monthlyEmis?: number | null;
  dependents?: number | null;
  hasInsurance?: boolean | null;
  existingInvestments?: string | null;
}

function MetricRow({ label, current, recommended, format, higherIsBetter }: {
  label: string;
  current: number;
  recommended: number;
  format: (v: number) => string;
  higherIsBetter: boolean;
}) {
  const diff = recommended - current;
  const isImprovement = higherIsBetter ? diff > 0 : diff < 0;
  const isNeutral = Math.abs(diff) < 0.3;

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <div className="flex items-center gap-3 text-right">
        <span className="text-xs font-medium text-foreground w-16">{format(current)}</span>
        <span className="text-xs text-muted-foreground">→</span>
        <span className="text-xs font-medium text-primary w-16">{format(recommended)}</span>
        <span className={cn(
          'text-[10px] font-medium w-10 text-right',
          isNeutral ? 'text-muted-foreground' : isImprovement ? 'text-success' : 'text-destructive',
        )}>
          {isNeutral ? '—' : isImprovement ? `+${format(Math.abs(diff))}` : format(diff)}
        </span>
      </div>
    </div>
  );
}

export function PortfolioComparison(props: PortfolioComparisonProps) {
  const result = useMemo(() => comparePortfolios(props), [
    props.holdings,
    props.funds,
    props.riskTolerance,
    props.investmentGoal,
    props.investmentHorizon,
    props.experienceLevel,
    props.investmentAmount,
    props.occupation,
    props.incomeStability,
    props.monthlyEmis,
    props.dependents,
    props.hasInsurance,
    props.existingInvestments,
  ]);

  if (!result) return null;

  const { currentPortfolio: cur, recommendedPortfolio: rec, improvementScore, rebalancingSuggestions } = result;

  const impColor = improvementScore.totalScore >= 70
    ? 'text-success'
    : improvementScore.totalScore >= 40
      ? 'text-warning'
      : improvementScore.totalScore >= 15
        ? 'text-primary'
        : 'text-muted-foreground';

  const recAllocations = rec.constructedPortfolio.allocations;

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <RefreshCw className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Portfolio vs CIFRAA</CardTitle>
            <p className="text-xs text-muted-foreground">Side-by-side comparison with recommended allocation</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* Side-by-side metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Portfolio */}
          <div className="rounded-xl bg-secondary/20 border border-border/30 p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current Portfolio</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Expected Return</span>
                <span className="font-medium text-foreground">{cur.expectedReturn.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Volatility</span>
                <span className="font-medium text-foreground">{cur.volatility.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Risk Level</span>
                <span className={cn('font-medium', cur.riskLevel === 'Conservative' ? 'text-success' : cur.riskLevel === 'Moderate' ? 'text-warning' : 'text-destructive')}>
                  {cur.riskLevel}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Diversification</span>
                <span className="font-medium text-foreground">{cur.diversificationScore}/100</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">AMC Concentration</span>
                <span className="font-medium text-foreground">{cur.topAmcPct.toFixed(0)}% (top)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Equity / Debt / Hybrid</span>
                <span className="font-medium text-foreground">{cur.equityPct.toFixed(0)}% / {cur.debtPct.toFixed(0)}% / {cur.hybridPct.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Recommended Portfolio */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Recommended Portfolio</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Expected Return</span>
                <span className="font-medium text-foreground">{rec.expectedReturn.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Volatility</span>
                <span className="font-medium text-foreground">{rec.volatility.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Risk Level</span>
                <span className={cn('font-medium', rec.riskLevel === 'Conservative' ? 'text-success' : rec.riskLevel === 'Moderate' ? 'text-warning' : 'text-destructive')}>
                  {rec.riskLevel}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Diversification</span>
                <span className="font-medium text-foreground">{rec.diversificationScore}/100</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">AMC Concentration</span>
                <span className="font-medium text-foreground">{rec.topAmcPct.toFixed(0)}% (top)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Equity / Debt / Hybrid</span>
                <span className="font-medium text-foreground">{rec.equityPct.toFixed(0)}% / {rec.debtPct.toFixed(0)}% / {rec.hybridPct.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Comparison */}
        <div className="rounded-xl bg-secondary/10 border border-border/20 p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3">Metric Comparison</h4>
          <MetricRow
            label="Expected Return"
            current={cur.expectedReturn}
            recommended={rec.expectedReturn}
            format={(v) => `${v.toFixed(1)}%`}
            higherIsBetter={true}
          />
          <MetricRow
            label="Volatility"
            current={cur.volatility}
            recommended={rec.volatility}
            format={(v) => `${v.toFixed(1)}%`}
            higherIsBetter={false}
          />
          <MetricRow
            label="Diversification"
            current={cur.diversificationScore}
            recommended={rec.diversificationScore}
            format={(v) => `${Math.round(v)}`}
            higherIsBetter={true}
          />
          <MetricRow
            label="AMC Top Concentration"
            current={cur.topAmcPct}
            recommended={rec.topAmcPct}
            format={(v) => `${v.toFixed(0)}%`}
            higherIsBetter={false}
          />
        </div>

        {/* Improvement Score */}
        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl bg-secondary/20 border border-border/30 p-4">
          <div className="flex-shrink-0">
            <div className="relative flex items-center justify-center">
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="38" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                <circle
                  cx="45" cy="45" r="38"
                  fill="none"
                  stroke={
                    improvementScore.totalScore >= 70
                      ? 'hsl(142, 65%, 48%)'
                      : improvementScore.totalScore >= 40
                        ? 'hsl(38, 92%, 55%)'
                        : 'hsl(0, 0%, 60%)'
                  }
                  strokeWidth="8"
                  strokeDasharray={`${(improvementScore.totalScore / 100) * 2 * Math.PI * 38} ${2 * Math.PI * 38}`}
                  strokeLinecap="round"
                  transform="rotate(-90 45 45)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
                <text x="45" y="48" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="20" fontWeight="bold">
                  {improvementScore.totalScore}
                </text>
                <text x="45" y="63" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
                  / 100
                </text>
              </svg>
            </div>
          </div>
          <div className="text-center sm:text-left">
            <p className={cn('text-sm font-bold', impColor)}>Potential Improvement</p>
            <p className="text-xs text-muted-foreground mt-0.5">{improvementScore.label}</p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-muted-foreground">Current Return:</span>
              <span className="font-medium text-foreground">{cur.expectedReturn.toFixed(1)}%</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium text-foreground">{rec.expectedReturn.toFixed(1)}%</span>
              <span className={cn('font-semibold', improvementScore.returnImprovement >= 0 ? 'text-success' : 'text-destructive')}>
                {improvementScore.returnImprovement >= 0 ? '+' : ''}{improvementScore.returnImprovement.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Rebalancing Suggestions */}
        {rebalancingSuggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              Rebalancing Suggestions
            </h4>
            <div className="space-y-2">
              {rebalancingSuggestions.map((suggestion, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground leading-relaxed">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Fund Breakdown */}
        {recAllocations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Recommended Allocation</h4>
            <div className="space-y-2">
              {recAllocations.map((alloc, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{alloc.fund.name}</p>
                    <p className="text-[10px] text-muted-foreground">{alloc.bucket}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${alloc.allocationPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground w-10 text-right">
                      {alloc.allocationPercent.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
