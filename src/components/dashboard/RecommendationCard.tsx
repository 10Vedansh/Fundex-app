import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FundRecommendation } from '@/types/mutualFund';
import { Sparkles, TrendingUp, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecommendationCardProps {
  recommendation: FundRecommendation;
  rank: number;
}

const getRiskIcon = (riskLevel: string) => {
  switch (riskLevel) {
    case 'Low':
      return <Shield className="h-4 w-4 text-success" />;
    case 'Moderate':
      return <TrendingUp className="h-4 w-4 text-warning" />;
    case 'High':
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
};

const getRiskBadgeColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'Low':
      return 'bg-success/20 text-success border-success/30';
    case 'Moderate':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'High':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function RecommendationCard({ recommendation, rank }: RecommendationCardProps) {
  const { fund, insight } = recommendation;

  return (
    <Card className={cn(
      "glass-card hover-lift relative overflow-hidden",
      rank === 1 && "ring-2 ring-primary/50 glow-primary"
    )}>
      {/* Rank Indicator */}
      <div className="absolute top-0 left-0 w-10 h-10 gradient-primary flex items-center justify-center">
        <span className="text-lg font-bold text-primary-foreground">#{rank}</span>
      </div>

      <CardHeader className="pl-14 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground line-clamp-1">{fund.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{fund.amc}</p>
          </div>
          <Badge variant="outline" className={getRiskBadgeColor(fund.riskLevel)}>
            {getRiskIcon(fund.riskLevel)}
            <span className="ml-1">{fund.riskLevel} Risk</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-3 py-3 border-y border-border/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">1Y CAGR</p>
            <p className={cn(
              "text-sm font-bold",
              fund.cagr1Y >= 0 ? "text-success" : "text-destructive"
            )}>
              {fund.cagr1Y >= 0 ? '+' : ''}{fund.cagr1Y.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">3Y CAGR</p>
            <p className={cn(
              "text-sm font-bold",
              fund.cagr3Y >= 0 ? "text-success" : "text-destructive"
            )}>
              {fund.cagr3Y >= 0 ? '+' : ''}{fund.cagr3Y.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Sharpe</p>
            <p className="text-sm font-bold text-foreground">{fund.sharpeRatio.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Expense</p>
            <p className="text-sm font-bold text-foreground">{fund.expenseRatio.toFixed(2)}%</p>
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">AI Insight</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{insight.insight}</p>
          {insight.rationale && (
            <p className="text-xs text-muted-foreground mt-2 italic">{insight.rationale}</p>
          )}
        </div>

        {/* Additional Info */}
        <div className="flex justify-between text-xs text-muted-foreground pt-2">
          <span>Min: ₹{fund.minInvestment.toLocaleString()}</span>
          <span>AUM: ₹{fund.aum.toLocaleString()}Cr</span>
          <span className="text-foreground">{fund.category}</span>
        </div>
      </CardContent>
    </Card>
  );
}
