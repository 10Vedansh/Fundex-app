import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MutualFund } from '@/types/mutualFund';
import { TrendingUp, TrendingDown, BarChart3, Percent, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FundCardProps {
  fund: MutualFund;
  onClick?: () => void;
}

const getStrengthColor = (badge: string) => {
  switch (badge) {
    case 'Strong':
      return 'bg-success/20 text-success border-success/30';
    case 'Balanced':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'Risky':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Equity':
      return 'bg-primary/20 text-primary border-primary/30';
    case 'Debt':
      return 'bg-success/20 text-success border-success/30';
    case 'Hybrid':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'Index':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Liquid':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function FundCard({ fund, onClick }: FundCardProps) {
  const isPositiveReturn = fund.cagr1Y >= 0;

  return (
    <Card 
      className={cn(
        "glass-card hover-lift cursor-pointer group relative overflow-hidden",
        "transition-all duration-300"
      )}
      onClick={onClick}
    >
      {/* Rank Badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/50 text-xs font-medium text-muted-foreground">
          <Award className="h-3 w-3" />
          #{fund.rank}
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={getCategoryColor(fund.category)}>
              {fund.category}
            </Badge>
            <Badge variant="outline" className={getStrengthColor(fund.strengthBadge)}>
              {fund.strengthBadge}
            </Badge>
          </div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 pr-12">
            {fund.name}
          </h3>
          <p className="text-xs text-muted-foreground">{fund.amc}</p>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* CAGR */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {isPositiveReturn ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span>1Y CAGR</span>
            </div>
            <p className={cn(
              "text-lg font-bold",
              isPositiveReturn ? "text-success" : "text-destructive"
            )}>
              {isPositiveReturn ? '+' : ''}{fund.cagr1Y.toFixed(1)}%
            </p>
          </div>

          {/* Volatility */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              <span>Volatility</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {fund.volatility.toFixed(1)}%
            </p>
          </div>

          {/* Sharpe Ratio */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Sharpe</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {fund.sharpeRatio.toFixed(2)}
            </p>
          </div>

          {/* Expense Ratio */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Percent className="h-3 w-3" />
              <span>Expense</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {fund.expenseRatio.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-4 pt-4 border-t border-border/50 flex justify-between text-xs text-muted-foreground">
          <span>NAV: ₹{fund.nav.toFixed(2)}</span>
          <span>AUM: ₹{fund.aum.toLocaleString()}Cr</span>
        </div>
      </CardContent>
    </Card>
  );
}
