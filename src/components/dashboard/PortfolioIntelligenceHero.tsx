import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { runPortfolioReview } from '@/utils/portfolioReviewEngine';
import { comparePortfolios } from '@/utils/portfolioComparisonEngine';
import { AlertTriangle, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import type { AnalyticsHolding } from './PortfolioAnalytics';
import type { MutualFund } from '@/types/mutualFund';

interface PortfolioIntelligenceHeroProps {
  holdings: AnalyticsHolding[];
  funds: MutualFund[];
  riskTolerance: string;
  investmentGoal: string;
  investmentHorizon: string;
  experienceLevel: string;
  investmentAmount: string;
  onViewRecommended?: () => void;
}

export function PortfolioIntelligenceHero(props: PortfolioIntelligenceHeroProps) {
  const { holdings, funds, onViewRecommended, ...prefs } = props;

  const reviewResult = useMemo(() => runPortfolioReview(holdings), [holdings]);
  const comparisonResult = useMemo(() => comparePortfolios({
    holdings,
    funds,
    ...prefs,
  }), [holdings, funds, prefs.riskTolerance, prefs.investmentGoal, prefs.investmentHorizon, prefs.experienceLevel, prefs.investmentAmount]);

  if (!reviewResult || !comparisonResult) return null;

  const { healthScore } = reviewResult;
  const { currentPortfolio: cur, recommendedPortfolio: rec, improvementScore, rebalancingSuggestions } = comparisonResult;

  const healthPct = Math.round((healthScore.score / healthScore.max) * 100);
  const healthColor = healthPct >= 70 ? 'text-success' : healthPct >= 40 ? 'text-warning' : 'text-destructive';
  const healthBarColor = healthPct >= 70 ? 'bg-success' : healthPct >= 40 ? 'bg-warning' : 'bg-destructive';

  const impColor = improvementScore.totalScore >= 70
    ? 'text-success' : improvementScore.totalScore >= 40
      ? 'text-warning' : improvementScore.totalScore >= 15
        ? 'text-primary' : 'text-muted-foreground';

  const topIssues = reviewResult.risks.slice(0, 3);
  const topActions = rebalancingSuggestions.slice(0, 3);

  const returnDiff = rec.expectedReturn - cur.expectedReturn;
  const diveDiff = rec.diversificationScore - cur.diversificationScore;

  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-5 border-b border-border/10">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">CIFRAA Portfolio Intelligence</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            AI-powered analysis of your portfolio health, performance, and improvement potential
          </p>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/10">
          {/* Health Score */}
          <div className="p-4 bg-card/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Health Score</p>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className={cn('text-2xl font-bold', healthColor)}>{healthScore.score}</span>
              <span className="text-xs text-muted-foreground">/{healthScore.max}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', healthBarColor)} style={{ width: `${healthPct}%` }} />
            </div>
          </div>

          {/* Improvement Score */}
          <div className="p-4 bg-card/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Improvement</p>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className={cn('text-2xl font-bold', impColor)}>{improvementScore.totalScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <p className={cn('text-[10px] font-medium', impColor)}>{improvementScore.label}</p>
          </div>

          {/* Return comparison */}
          <div className="p-4 bg-card/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Expected Return</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-foreground">{cur.expectedReturn.toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground">→</span>
              <span className={cn('text-lg font-bold', returnDiff > 0 ? 'text-success' : 'text-destructive')}>
                {rec.expectedReturn.toFixed(1)}%
              </span>
            </div>
            <p className={cn('text-[10px] font-medium', returnDiff > 0 ? 'text-success' : 'text-destructive')}>
              {returnDiff > 0 ? '+' : ''}{returnDiff.toFixed(1)}% potential improvement
            </p>
          </div>

          {/* Diversification comparison */}
          <div className="p-4 bg-card/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Diversification</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-foreground">{cur.diversificationScore}</span>
              <span className="text-xs text-muted-foreground">→</span>
              <span className={cn('text-lg font-bold', diveDiff > 0 ? 'text-success' : 'text-destructive')}>
                {rec.diversificationScore}
              </span>
            </div>
            <p className={cn('text-[10px] font-medium', diveDiff > 0 ? 'text-success' : 'text-destructive')}>
              {diveDiff > 0 ? '+' : ''}{diveDiff} point improvement
            </p>
          </div>
        </div>

        {/* Issues + Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/10">
          {topIssues.length > 0 && (
            <div className="p-4 bg-card/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <p className="text-xs font-medium text-foreground">Top Issues</p>
              </div>
              <ul className="space-y-1.5">
                {topIssues.map((issue, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                    <span className="text-destructive mt-0.5">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {topActions.length > 0 && (
            <div className="p-4 bg-card/50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <p className="text-xs font-medium text-foreground">Recommended Actions</p>
              </div>
              <ul className="space-y-1.5">
                {topActions.map((action, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                    <span className="text-success mt-0.5">•</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="p-4 border-t border-border/10">
          <Button
            variant="default"
            size="sm"
            className="w-full sm:w-auto"
            onClick={onViewRecommended}
          >
            View Recommended Portfolio
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
