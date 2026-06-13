import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { runPortfolioReview } from '@/utils/portfolioReviewEngine';
import type { AnalyticsHolding } from './PortfolioAnalytics';
import {
  ThumbsUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface PortfolioReviewProps {
  holdings: AnalyticsHolding[];
}

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  'thumbs-up': ThumbsUp,
  'alert-triangle': AlertTriangle,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'shield': Shield,
  'info': Info,
};

const INSIGHT_STYLES: Record<string, { bg: string; border: string; iconColor: string }> = {
  positive: { bg: 'bg-success/10', border: 'border-success/20', iconColor: 'text-success' },
  warning: { bg: 'bg-warning/10', border: 'border-warning/20', iconColor: 'text-warning' },
  negative: { bg: 'bg-destructive/10', border: 'border-destructive/20', iconColor: 'text-destructive' },
  info: { bg: 'bg-primary/10', border: 'border-primary/20', iconColor: 'text-primary' },
};

export function PortfolioReview({ holdings }: PortfolioReviewProps) {
  const review = useMemo(() => runPortfolioReview(holdings), [holdings]);

  if (!review) return null;

  const { healthScore, insights, strengths, risks, summary } = review;

  const scoreColor =
    healthScore.score >= 75
      ? 'text-success'
      : healthScore.score >= 60
        ? 'text-warning'
        : 'text-destructive';

  const strokeColor =
    healthScore.score >= 75
      ? 'hsl(142, 65%, 48%)'
      : healthScore.score >= 60
        ? 'hsl(38, 92%, 55%)'
        : 'hsl(0, 72%, 56%)';

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (healthScore.score / 100) * circumference;

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">AI Portfolio Review</CardTitle>
            <p className="text-xs text-muted-foreground">Rule-based portfolio analysis</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* Health Score */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative flex-shrink-0">
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle
                cx="65"
                cy="65"
                r="54"
                fill="none"
                stroke="hsl(var(--secondary))"
                strokeWidth="10"
              />
              <circle
                cx="65"
                cy="65"
                r="54"
                fill="none"
                stroke={strokeColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 65 65)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
              <text
                x="65"
                y="58"
                textAnchor="middle"
                fill="hsl(var(--foreground))"
                fontSize="28"
                fontWeight="bold"
              >
                {healthScore.score}
              </text>
              <text
                x="65"
                y="78"
                textAnchor="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize="11"
              >
                / {healthScore.max}
              </text>
            </svg>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className={cn('text-xl font-bold', scoreColor)}>
              Portfolio Health Score
            </p>
            <p className={cn('text-sm font-semibold mt-0.5', scoreColor)}>
              {healthScore.label}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Diversification</span>
                <span className={cn('font-medium', healthScore.factors.diversification.score >= 28 ? 'text-success' : healthScore.factors.diversification.score >= 20 ? 'text-warning' : 'text-destructive')}>
                  {healthScore.factors.diversification.score}/{healthScore.factors.diversification.max}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AMC Concentration</span>
                <span className={cn('font-medium', healthScore.factors.amcConcentration.score >= 15 ? 'text-success' : healthScore.factors.amcConcentration.score >= 10 ? 'text-warning' : 'text-destructive')}>
                  {healthScore.factors.amcConcentration.score}/{healthScore.factors.amcConcentration.max}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Asset Allocation</span>
                <span className={cn('font-medium', healthScore.factors.assetAllocation.score >= 15 ? 'text-success' : healthScore.factors.assetAllocation.score >= 10 ? 'text-warning' : 'text-destructive')}>
                  {healthScore.factors.assetAllocation.score}/{healthScore.factors.assetAllocation.max}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Balance</span>
                <span className={cn('font-medium', healthScore.factors.riskBalance.score >= 15 ? 'text-success' : healthScore.factors.riskBalance.score >= 10 ? 'text-warning' : 'text-destructive')}>
                  {healthScore.factors.riskBalance.score}/{healthScore.factors.riskBalance.max}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            Insights
          </h4>
          <div className="space-y-2">
            {insights.map((insight, i) => {
              const Icon = INSIGHT_ICONS[insight.icon] || Info;
              const style = INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.info;
              return (
                <div
                  key={i}
                  className={cn('flex items-start gap-2.5 p-3 rounded-lg border', style.bg, style.border)}
                >
                  <Icon className={cn('h-4 w-4 flex-shrink-0 mt-0.5', style.iconColor)} />
                  <p className="text-xs text-foreground leading-relaxed">{insight.message}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths & Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Strengths
            </h4>
            {strengths.length > 0 ? (
              <ul className="space-y-1.5">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-success flex-shrink-0 mt-1.5" />
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">No specific strengths identified.</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <XCircle className="h-3.5 w-3.5 text-destructive" />
              Risks
            </h4>
            {risks.length > 0 ? (
              <ul className="space-y-1.5">
                {risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0 mt-1.5" />
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">No significant risks detected.</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-secondary/30 rounded-xl p-4 border border-border/30">
          <h4 className="text-sm font-semibold text-foreground mb-2">Portfolio Summary</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
        </div>
      </CardContent>
    </Card>
  );
}
