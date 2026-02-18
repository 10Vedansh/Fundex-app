import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MutualFund } from '@/types/mutualFund';
import { TrendingUp, TrendingDown, BarChart3, Percent, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TermTooltip } from './TermTooltip';

interface FundCardProps {
  fund: MutualFund;
  onClick?: () => void;
  isBookmarked?: boolean;
  onBookmarkToggle?: (fund: MutualFund) => void;
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

export function FundCard({ fund, onClick, isBookmarked = false, onBookmarkToggle }: FundCardProps) {
  const isPositiveReturn = fund.cagr1Y >= 0;

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmarkToggle?.(fund);
  };

  return (
    <Card 
      className={cn(
        "glass-card hover-lift cursor-pointer group relative overflow-hidden",
        "transition-all duration-300"
      )}
      onClick={onClick}
    >
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-4 right-4 h-10 w-10 p-0 z-10"
        onClick={handleBookmarkClick}
      >
        <Bookmark 
          className={cn(
            "h-5 w-5 transition-colors",
            isBookmarked 
              ? "fill-primary text-primary" 
              : "text-muted-foreground hover:text-primary"
          )} 
        />
      </Button>

      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2 pr-12">
            <Badge variant="outline" className={cn(getCategoryColor(fund.category), "text-sm px-3 py-1")}>
              {fund.category}
            </Badge>
            <Badge variant="outline" className={cn(getStrengthColor(fund.strengthBadge), "text-sm px-3 py-1")}>
              {fund.strengthBadge}
            </Badge>
          </div>
          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 pr-12 leading-snug">
            {fund.name}
          </h3>
          <p className="text-sm text-muted-foreground">{fund.amc}</p>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-5 pb-5">
        <div className="grid grid-cols-2 gap-5 mt-4">
          {/* CAGR */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {isPositiveReturn ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span>1Y CAGR</span>
              <TermTooltip term="1Y CAGR" />
            </div>
            <p className={cn(
              "text-xl font-bold",
              isPositiveReturn ? "text-success" : "text-destructive"
            )}>
              {isPositiveReturn ? '+' : ''}{fund.cagr1Y.toFixed(1)}%
            </p>
          </div>

          {/* Volatility */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span>Volatility</span>
              <TermTooltip term="Volatility" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {fund.volatility.toFixed(1)}%
            </p>
          </div>

          {/* Sharpe Ratio */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>Sharpe</span>
              <TermTooltip term="Sharpe" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {fund.sharpeRatio.toFixed(2)}
            </p>
          </div>

          {/* Expense Ratio */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Percent className="h-4 w-4" />
              <span>Expense</span>
              <TermTooltip term="Expense" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {fund.expenseRatio.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-5 pt-4 border-t border-border/50 flex justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">NAV: ₹{fund.nav.toFixed(2)} <TermTooltip term="NAV" /></span>
          <span className="flex items-center gap-1">AUM: ₹{fund.aum.toLocaleString()}Cr <TermTooltip term="AUM" /></span>
        </div>
      </CardContent>
    </Card>
  );
}
