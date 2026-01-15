import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MutualFund, FundSectorData, SECTOR_COLORS } from '@/types/mutualFund';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  AlertTriangle,
  BarChart3,
  Percent,
  Award,
  IndianRupee,
  Activity,
  Users,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FundDetailModalProps {
  fund: MutualFund | null;
  sectorData: FundSectorData | null;
  isOpen: boolean;
  onClose: () => void;
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

const generateInvestorGuidance = (fund: MutualFund) => {
  const whoShouldInvest: string[] = [];
  const whoShouldAvoid: string[] = [];

  // Based on risk level
  if (fund.riskLevel === 'Low') {
    whoShouldInvest.push('Conservative investors seeking capital preservation');
    whoShouldInvest.push('Retirees looking for stable returns');
    whoShouldAvoid.push('Aggressive investors seeking high growth');
  } else if (fund.riskLevel === 'High') {
    whoShouldInvest.push('Aggressive investors with high risk appetite');
    whoShouldInvest.push('Long-term investors (5+ years horizon)');
    whoShouldAvoid.push('Risk-averse investors nearing retirement');
    whoShouldAvoid.push('Those needing capital in short term');
  } else {
    whoShouldInvest.push('Balanced investors seeking growth with stability');
    whoShouldInvest.push('Medium-term investors (3-5 years horizon)');
    whoShouldAvoid.push('Very conservative investors');
  }

  // Based on category
  if (fund.category === 'Equity') {
    whoShouldInvest.push('Those seeking wealth creation through equities');
    whoShouldAvoid.push('Investors uncomfortable with market volatility');
  } else if (fund.category === 'Debt') {
    whoShouldInvest.push('Investors seeking regular income');
    whoShouldAvoid.push('Those seeking equity-like returns');
  } else if (fund.category === 'Hybrid') {
    whoShouldInvest.push('First-time mutual fund investors');
  } else if (fund.category === 'Liquid') {
    whoShouldInvest.push('Parking surplus funds for short duration');
    whoShouldAvoid.push('Long-term wealth creation seekers');
  }

  // Based on expense ratio
  if (fund.expenseRatio > 1.5) {
    whoShouldAvoid.push('Cost-conscious passive investors');
  }

  return { whoShouldInvest, whoShouldAvoid };
};

export function FundDetailModal({ fund, sectorData, isOpen, onClose }: FundDetailModalProps) {
  if (!fund) return null;

  const isPositiveReturn = fund.cagr1Y >= 0;
  const { whoShouldInvest, whoShouldAvoid } = useMemo(() => generateInvestorGuidance(fund), [fund]);

  // Chart data for risk-return positioning
  const riskReturnData = [
    {
      name: fund.name,
      volatility: fund.volatility,
      returns: fund.cagr1Y,
      size: fund.sharpeRatio * 100,
    },
  ];

  // Sector chart data
  const pieData = sectorData?.sectors.map(s => ({
    ...s,
    value: s.percentage,
  })) || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 bg-background/95 backdrop-blur-xl border-border overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <DialogHeader className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={getCategoryColor(fund.category)}>
                  {fund.category}
                </Badge>
                <Badge variant="outline" className={getStrengthColor(fund.strengthBadge)}>
                  {fund.strengthBadge}
                </Badge>
                <Badge variant="outline" className="bg-secondary/50">
                  <Award className="h-3 w-3 mr-1" />
                  Rank #{fund.rank}
                </Badge>
                <Badge variant="outline" className="bg-secondary/50">
                  Direct Plan • Growth
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {fund.name}
              </DialogTitle>
              <p className="text-muted-foreground">{fund.amc}</p>
            </DialogHeader>

            <Separator />

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* 1Y CAGR */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    {isPositiveReturn ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span>1Y CAGR</span>
                  </div>
                  <p className={cn("text-2xl font-bold", isPositiveReturn ? "text-success" : "text-destructive")}>
                    {isPositiveReturn ? '+' : ''}{fund.cagr1Y.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>

              {/* 3Y CAGR */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>3Y CAGR</span>
                  </div>
                  <p className={cn("text-2xl font-bold", fund.cagr3Y >= 0 ? "text-success" : "text-destructive")}>
                    {fund.cagr3Y >= 0 ? '+' : ''}{fund.cagr3Y.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>

              {/* 5Y CAGR */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>5Y CAGR</span>
                  </div>
                  <p className={cn("text-2xl font-bold", fund.cagr5Y >= 0 ? "text-success" : "text-destructive")}>
                    {fund.cagr5Y >= 0 ? '+' : ''}{fund.cagr5Y.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>

              {/* Volatility */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <BarChart3 className="h-3 w-3" />
                    <span>Volatility</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{fund.volatility.toFixed(1)}%</p>
                </CardContent>
              </Card>

              {/* Sharpe Ratio */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Target className="h-3 w-3" />
                    <span>Sharpe Ratio</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{fund.sharpeRatio.toFixed(2)}</p>
                </CardContent>
              </Card>

              {/* Expense Ratio */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Percent className="h-3 w-3" />
                    <span>Expense Ratio</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{fund.expenseRatio.toFixed(2)}%</p>
                </CardContent>
              </Card>

              {/* NAV */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <IndianRupee className="h-3 w-3" />
                    <span>NAV</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">₹{fund.nav.toFixed(2)}</p>
                </CardContent>
              </Card>

              {/* AUM */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Activity className="h-3 w-3" />
                    <span>AUM</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">₹{fund.aum.toLocaleString()}Cr</p>
                </CardContent>
              </Card>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground">Alpha</p>
                <p className="text-lg font-semibold text-foreground">{fund.alpha.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground">Beta</p>
                <p className="text-lg font-semibold text-foreground">{fund.beta.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground">Min Investment</p>
                <p className="text-lg font-semibold text-foreground">₹{fund.minInvestment}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground">Exit Load</p>
                <p className="text-sm font-semibold text-foreground">{fund.exitLoad}</p>
              </div>
            </div>

            <Separator />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk vs Return Chart */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Risk vs Return Position
                  </h4>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                          type="number"
                          dataKey="volatility"
                          name="Volatility"
                          unit="%"
                          domain={[0, 'auto']}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          label={{ value: 'Risk (Volatility %)', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="returns"
                          name="Returns"
                          unit="%"
                          domain={['auto', 'auto']}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          label={{ value: 'Returns %', angle: -90, position: 'left', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Scatter data={riskReturnData} fill="hsl(var(--primary))">
                          {riskReturnData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Sector Allocation Chart */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Sector Allocation
                  </h4>
                  {pieData.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <div className="h-[180px] w-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={2} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-1">
                        {pieData.slice(0, 5).map((sector, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sector.color }} />
                            <span className="text-muted-foreground truncate flex-1">{sector.sector}</span>
                            <span className="text-foreground font-medium">{sector.percentage.toFixed(1)}%</span>
                          </div>
                        ))}
                        {pieData.length > 5 && (
                          <p className="text-xs text-muted-foreground">+{pieData.length - 5} more sectors</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sector data not available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Who Should Invest / Avoid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-card border-success/30">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-success mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Who Should Invest
                  </h4>
                  <ul className="space-y-2">
                    {whoShouldInvest.map((item, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-success mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="glass-card border-destructive/30">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
                    <UserX className="h-4 w-4" />
                    Who Should Avoid
                  </h4>
                  <ul className="space-y-2">
                    {whoShouldAvoid.map((item, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-destructive mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Disclaimer */}
            <Card className="bg-warning/10 border-warning/30">
              <CardContent className="py-3 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-warning">Disclaimer:</strong> Past performance is not indicative of future results. Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing.
                </p>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
