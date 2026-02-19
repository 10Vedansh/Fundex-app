import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MutualFund, CATEGORY_LABELS } from '@/types/mutualFund';
import { TrendingUp, TrendingDown, BarChart3, Percent, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const cat = category.toUpperCase();
  if (cat.startsWith('EQ-')) return 'bg-primary/20 text-primary border-primary/30';
  if (cat.startsWith('DT-')) return 'bg-success/20 text-success border-success/30';
  if (cat.startsWith('HY-')) return 'bg-warning/20 text-warning border-warning/30';
  if (cat.includes('GOLD') || cat.includes('SILVER')) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
  return 'bg-muted text-muted-foreground';
};

const getRiskLabel = (category: string): string => {
  const cat = category.toUpperCase();
  if (cat.includes('SC') || cat.includes('THEMATIC') || cat.includes('SA&T') || cat.includes('PSU') || cat.includes('ENERGY')) return 'High Risk';
  if (cat.startsWith('DT-LIQ') || cat.includes('OVERNHT') || cat.includes('MM')) return 'Low Risk';
  if (cat.startsWith('DT-')) return 'Low to Moderate Risk';
  if (cat.startsWith('HY-')) return 'Moderate Risk';
  if (cat.includes('LC') || cat.includes('L&MC') || cat.includes('FLX') || cat.includes('MLC')) return 'Moderate Risk';
  if (cat.includes('MC')) return 'Moderately High Risk';
  return 'Moderate Risk';
};

const getDisplayCategory = (category: string): string => {
  const label = CATEGORY_LABELS[category];
  if (label) {
    const cat = category.toUpperCase();
    const assetClass = cat.startsWith('EQ-') ? 'EQUITY' : cat.startsWith('DT-') ? 'DEBT' : cat.startsWith('HY-') ? 'HYBRID' : '';
    if (assetClass) return `${assetClass}, ${label}`;
    return label;
  }
  return category;
};

function fmtVal(val: number | null | undefined, decimals = 1, suffix = ''): string {
  if (val === null || val === undefined) return 'NA';
  return `${val.toFixed(decimals)}${suffix}`;
}

export function FundCard({ fund, onClick, isBookmarked = false, onBookmarkToggle }: FundCardProps) {
  const isPositiveReturn = (fund.cagr1Y ?? 0) >= 0;
  const hasReturn = fund.cagr1Y !== null && fund.cagr1Y !== undefined;

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
            <Badge variant="outline" className={cn(getCategoryColor(fund.category), "text-xs px-2.5 py-0.5")}>
              {getDisplayCategory(fund.category)}
            </Badge>
            <Badge variant="outline" className={cn(getStrengthColor(fund.strengthBadge), "text-xs px-2.5 py-0.5")}>
              {fund.strengthBadge}
            </Badge>
          </div>
          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 pr-12 leading-snug">
            {fund.name}
          </h3>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{fund.amc}</span>
            <span className="text-xs bg-muted/50 px-2 py-0.5 rounded-full">{getRiskLabel(fund.category)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-5 pb-5">
        <div className="grid grid-cols-2 gap-5 mt-4">
          {/* CAGR */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {hasReturn ? (
                isPositiveReturn ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )
              ) : null}
              <span>1Y CAGR</span>
            </div>
            <p className={cn(
              "text-xl font-bold",
              !hasReturn ? "text-muted-foreground" : isPositiveReturn ? "text-success" : "text-destructive"
            )}>
              {hasReturn ? `${isPositiveReturn ? '+' : ''}${fund.cagr1Y!.toFixed(1)}%` : 'NA'}
            </p>
          </div>

          {/* Volatility */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span>Volatility</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {fmtVal(fund.volatility, 1, '%')}
            </p>
          </div>

          {/* Sharpe Ratio */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>Sharpe</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {fmtVal(fund.sharpeRatio, 2)}
            </p>
          </div>

          {/* Expense Ratio */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Percent className="h-4 w-4" />
              <span>Expense</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {fmtVal(fund.expenseRatio, 2, '%')}
            </p>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-5 pt-4 border-t border-border/50 flex justify-between text-sm text-muted-foreground">
          <span>NAV: {fund.nav ? `₹${fund.nav.toFixed(2)}` : 'NA'}</span>
          <span>AUM: {fund.aum ? `₹${fund.aum.toLocaleString()}Cr` : 'NA'}</span>
        </div>
      </CardContent>
    </Card>
  );
}
