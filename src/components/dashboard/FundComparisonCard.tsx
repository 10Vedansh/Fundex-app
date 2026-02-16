import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MutualFund } from '@/types/mutualFund';
import { TrendingUp, TrendingDown, Minus, Scale, Percent, BarChart3, Shield } from 'lucide-react';

interface FundComparisonCardProps {
  fundA: MutualFund | undefined;
  fundB: MutualFund | undefined;
}

interface ComparisonMetric {
  label: string;
  valueA: string | number;
  valueB: string | number;
  winner: 'A' | 'B' | 'tie';
  icon: React.ReactNode;
  higherIsBetter: boolean;
}

export const FundComparisonCard = ({ fundA, fundB }: FundComparisonCardProps) => {
  if (!fundA || !fundB) {
    return null;
  }

  const getWinner = (a: number, b: number, higherIsBetter: boolean): 'A' | 'B' | 'tie' => {
    if (Math.abs(a - b) < 0.01) return 'tie';
    if (higherIsBetter) return a > b ? 'A' : 'B';
    return a < b ? 'A' : 'B';
  };

  const safe = (v: number | undefined | null) => (v != null && !isNaN(v)) ? v : 0;
  const fmt1 = (v: number | undefined | null) => `${safe(v).toFixed(1)}%`;
  const fmt2 = (v: number | undefined | null) => safe(v).toFixed(2);

  const metrics: ComparisonMetric[] = [
    {
      label: '1Y Returns',
      valueA: fmt1(fundA.cagr1Y),
      valueB: fmt1(fundB.cagr1Y),
      winner: getWinner(safe(fundA.cagr1Y), safe(fundB.cagr1Y), true),
      icon: <TrendingUp className="h-4 w-4" />,
      higherIsBetter: true,
    },
    {
      label: '3Y Returns',
      valueA: fmt1(fundA.cagr3Y),
      valueB: fmt1(fundB.cagr3Y),
      winner: getWinner(safe(fundA.cagr3Y), safe(fundB.cagr3Y), true),
      icon: <TrendingUp className="h-4 w-4" />,
      higherIsBetter: true,
    },
    {
      label: 'Expense Ratio',
      valueA: `${fmt2(fundA.expenseRatio)}%`,
      valueB: `${fmt2(fundB.expenseRatio)}%`,
      winner: getWinner(safe(fundA.expenseRatio), safe(fundB.expenseRatio), false),
      icon: <Percent className="h-4 w-4" />,
      higherIsBetter: false,
    },
    {
      label: 'Sharpe Ratio',
      valueA: fmt2(fundA.sharpeRatio),
      valueB: fmt2(fundB.sharpeRatio),
      winner: getWinner(safe(fundA.sharpeRatio), safe(fundB.sharpeRatio), true),
      icon: <Scale className="h-4 w-4" />,
      higherIsBetter: true,
    },
    {
      label: 'AUM (Cr)',
      valueA: `₹${safe(fundA.aum).toLocaleString()}`,
      valueB: `₹${safe(fundB.aum).toLocaleString()}`,
      winner: getWinner(safe(fundA.aum), safe(fundB.aum), true),
      icon: <BarChart3 className="h-4 w-4" />,
      higherIsBetter: true,
    },
    {
      label: 'Volatility',
      valueA: fmt1(fundA.volatility),
      valueB: fmt1(fundB.volatility),
      winner: getWinner(safe(fundA.volatility), safe(fundB.volatility), false),
      icon: <Shield className="h-4 w-4" />,
      higherIsBetter: false,
    },
  ];

  const winsA = metrics.filter(m => m.winner === 'A').length;
  const winsB = metrics.filter(m => m.winner === 'B').length;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Fund Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fund Names Header */}
        <div className="grid grid-cols-3 gap-4 pb-3 border-b border-border/50">
          <div className="text-sm font-medium text-muted-foreground">Metric</div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground truncate" title={fundA.name}>
              {fundA.name.length > 25 ? fundA.name.slice(0, 25) + '...' : fundA.name}
            </p>
            <Badge variant="outline" className="mt-1 text-xs">
              {winsA} wins
            </Badge>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground truncate" title={fundB.name}>
              {fundB.name.length > 25 ? fundB.name.slice(0, 25) + '...' : fundB.name}
            </p>
            <Badge variant="outline" className="mt-1 text-xs">
              {winsB} wins
            </Badge>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="grid grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {metric.icon}
                {metric.label}
              </div>
              <div className={`text-center text-sm font-medium ${
                metric.winner === 'A' 
                  ? 'text-green-500' 
                  : metric.winner === 'tie' 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
              }`}>
                <span className="flex items-center justify-center gap-1">
                  {metric.valueA}
                  {metric.winner === 'A' && <TrendingUp className="h-3 w-3" />}
                </span>
              </div>
              <div className={`text-center text-sm font-medium ${
                metric.winner === 'B' 
                  ? 'text-green-500' 
                  : metric.winner === 'tie' 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
              }`}>
                <span className="flex items-center justify-center gap-1">
                  {metric.valueB}
                  {metric.winner === 'B' && <TrendingUp className="h-3 w-3" />}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="pt-3 border-t border-border/50">
          <p className="text-sm text-center text-muted-foreground">
            {winsA > winsB ? (
              <span><strong className="text-green-500">{fundA.name.split(' ')[0]}</strong> leads in {winsA} metrics</span>
            ) : winsB > winsA ? (
              <span><strong className="text-green-500">{fundB.name.split(' ')[0]}</strong> leads in {winsB} metrics</span>
            ) : (
              <span>Both funds are <strong className="text-primary">evenly matched</strong></span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
