import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AnalyticsHolding {
  fund_name: string;
  amc: string;
  category: string;
  invested: number;
  currentValue: number;
  assetClass?: string;
  riskLevel?: string;
}

interface PortfolioAnalyticsProps {
  holdings: AnalyticsHolding[];
}

const ASSET_CLASS_COLORS: Record<string, string> = {
  Equity: 'hsl(217, 91%, 60%)',
  Debt: 'hsl(142, 71%, 45%)',
  Hybrid: 'hsl(38, 92%, 50%)',
  Commodities: 'hsl(265, 83%, 67%)',
  Other: 'hsl(0, 0%, 50%)',
};

const RISK_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  Low: { color: 'text-success', bg: 'bg-success/15', border: 'border-success/20', label: 'Low Risk' },
  Moderate: { color: 'text-warning', bg: 'bg-warning/15', border: 'border-warning/20', label: 'Moderate Risk' },
  High: { color: 'text-destructive', bg: 'bg-destructive/15', border: 'border-destructive/20', label: 'High Risk' },
};

const AMC_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(265, 83%, 67%)',
  'hsl(173, 80%, 40%)',
  'hsl(340, 82%, 52%)',
  'hsl(45, 93%, 47%)',
  'hsl(200, 98%, 39%)',
  'hsl(291, 64%, 42%)',
  'hsl(16, 100%, 66%)',
];

function getCategoryAssetClass(category: string): string {
  if (!category) return 'Other';
  const uc = category.trim().toUpperCase();
  if (uc.startsWith('EQ-') || uc === 'EQUITY') return 'Equity';
  if (uc.startsWith('DT-') || uc === 'DEBT') return 'Debt';
  if (uc.startsWith('HY-') || uc === 'HYBRID') return 'Hybrid';
  if (uc === 'GOLD-FUNDS' || uc === 'SILVER-FUNDS') return 'Commodities';
  return 'Other';
}

function formatCurrency(value: number): string {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  }
  return `₹${Math.round(value).toLocaleString()}`;
}

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload?.[0]) {
    const d = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="font-medium text-foreground text-xs">{d.name}</p>
        <p className="text-sm text-primary font-semibold">{d.percentage.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground">{formatCurrency(d.value)}</p>
      </div>
    );
  }
  return null;
};

const BarTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.[0]) {
    const d = payload[0].payload;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="font-medium text-foreground text-xs">{d.amc}</p>
        <p className="text-sm text-primary font-semibold">{d.percentage.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground">{formatCurrency(d.value)}</p>
      </div>
    );
  }
  return null;
};

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="hsl(var(--foreground))"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[10px] font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function PortfolioAnalytics({ holdings }: PortfolioAnalyticsProps) {
  const totalInvested = useMemo(
    () => holdings.reduce((s, h) => s + h.invested, 0),
    [holdings],
  );
  const totalCurrentValue = useMemo(
    () => holdings.reduce((s, h) => s + h.currentValue, 0),
    [holdings],
  );
  const profitLoss = totalCurrentValue - totalInvested;
  const returnPercent = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;
  const isPositive = profitLoss >= 0;

  const assetAllocation = useMemo(() => {
    const groups: Record<string, { value: number; invested: number }> = {};
    holdings.forEach((h) => {
      const ac = h.assetClass || getCategoryAssetClass(h.category);
      if (!groups[ac]) groups[ac] = { value: 0, invested: 0 };
      groups[ac].value += h.currentValue;
      groups[ac].invested += h.invested;
    });
    const total = Object.values(groups).reduce((s, g) => s + g.value, 0);
    return Object.entries(groups)
      .map(([name, data]) => ({
        name,
        value: data.value,
        invested: data.invested,
        percentage: total > 0 ? (data.value / total) * 100 : 0,
        color: ASSET_CLASS_COLORS[name] || ASSET_CLASS_COLORS.Other,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [holdings]);

  const amcConcentration = useMemo(() => {
    const groups: Record<string, number> = {};
    holdings.forEach((h) => {
      const amc = h.amc || 'Unknown';
      groups[amc] = (groups[amc] || 0) + h.currentValue;
    });
    const total = Object.values(groups).reduce((s, v) => s + v, 0);
    const sorted = Object.entries(groups)
      .map(([amc, value]) => ({
        amc,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    if (sorted.length <= 5) return sorted;

    const top5 = sorted.slice(0, 5);
    const othersValue = sorted.slice(5).reduce((s, a) => s + a.value, 0);
    const othersPct = total > 0 ? (othersValue / total) * 100 : 0;
    top5.push({ amc: 'Others', value: othersValue, percentage: othersPct });
    return top5;
  }, [holdings]);

  const riskDistribution = useMemo(() => {
    const groups: Record<string, { count: number; value: number; invested: number }> = {
      Low: { count: 0, value: 0, invested: 0 },
      Moderate: { count: 0, value: 0, invested: 0 },
      High: { count: 0, value: 0, invested: 0 },
    };
    holdings.forEach((h) => {
      const rl = h.riskLevel || 'Moderate';
      if (!groups[rl]) groups[rl] = { count: 0, value: 0, invested: 0 };
      groups[rl].count += 1;
      groups[rl].value += h.currentValue;
      groups[rl].invested += h.invested;
    });
    const total = Object.values(groups).reduce((s, g) => s + g.value, 0);
    return Object.entries(groups).map(([level, data]) => ({
      level,
      ...data,
      percentage: total > 0 ? (data.value / total) * 100 : 0,
      ...(RISK_STYLE[level] || RISK_STYLE.Moderate),
    }));
  }, [holdings]);

  const diversificationScore = useMemo(() => {
    const total = holdings.reduce((s, h) => s + h.currentValue, 0);
    if (total === 0 || holdings.length === 0) return { score: 0, label: 'Weak' };

    // AMC concentration (max 30)
    const amcGroups: Record<string, number> = {};
    holdings.forEach((h) => {
      const amc = h.amc || 'Unknown';
      amcGroups[amc] = (amcGroups[amc] || 0) + h.currentValue;
    });
    const topAmcPct = Math.max(...Object.values(amcGroups).map((v) => (v / total) * 100));
    let amcScore = 0;
    if (topAmcPct < 20) amcScore = 30;
    else if (topAmcPct < 30) amcScore = 25;
    else if (topAmcPct < 40) amcScore = 20;
    else if (topAmcPct < 50) amcScore = 10;
    else amcScore = 0;

    // Asset class spread (max 30)
    const assetClasses = new Set(holdings.map((h) => h.assetClass || getCategoryAssetClass(h.category)));
    let assetScore = 0;
    if (assetClasses.size >= 3) assetScore = 30;
    else if (assetClasses.size === 2) assetScore = 20;
    else if (assetClasses.size === 1) assetScore = 10;
    else assetScore = 0;

    // Fund count (max 20)
    let countScore = 0;
    if (holdings.length >= 10) countScore = 20;
    else if (holdings.length >= 7) countScore = 15;
    else if (holdings.length >= 4) countScore = 10;
    else if (holdings.length >= 2) countScore = 5;
    else countScore = 0;

    // Category spread (max 20)
    const categories = new Set(holdings.map((h) => h.category).filter(Boolean));
    let catScore = 0;
    if (categories.size >= 8) catScore = 20;
    else if (categories.size >= 5) catScore = 15;
    else if (categories.size >= 3) catScore = 10;
    else if (categories.size >= 2) catScore = 5;
    else catScore = 0;

    const score = Math.min(100, amcScore + assetScore + countScore + catScore);
    let label: string;
    if (score >= 90) label = 'Excellent';
    else if (score >= 75) label = 'Good';
    else if (score >= 60) label = 'Moderate';
    else label = 'Weak';

    return { score, label, amcScore, assetScore, countScore, catScore, topAmcPct, assetClassCount: assetClasses.size, fundCount: holdings.length, categoryCount: categories.size };
  }, [holdings]);

  if (holdings.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* SECTION 1: Portfolio Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Invested</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(totalInvested)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Current Value</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(totalCurrentValue)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Profit / Loss</p>
            <p className={cn('text-lg font-bold', isPositive ? 'text-success' : 'text-destructive')}>
              {isPositive ? '+' : ''}{formatCurrency(profitLoss)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Return %</p>
            <p className={cn('text-lg font-bold', isPositive ? 'text-success' : 'text-destructive')}>
              {isPositive ? '+' : ''}{returnPercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2: Asset Allocation */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetAllocation}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderPieLabel}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {assetAllocation.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center space-y-3">
              {assetAllocation.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.value)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: AMC Concentration */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">AMC Concentration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={amcConcentration}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${v}%`}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  type="category"
                  dataKey="amc"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  width={90}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="percentage" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {amcConcentration.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={AMC_COLORS[i % AMC_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {amcConcentration.map((item) => (
              <div key={item.amc} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground truncate flex-1">{item.amc}</span>
                <span className="font-medium text-foreground">{item.percentage.toFixed(1)}%</span>
                <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4: Risk Distribution */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {riskDistribution.map((item) => (
              <div
                key={item.level}
                className={cn('rounded-xl p-4 border', item.bg, item.border)}
              >
                <p className={cn('text-sm font-semibold mb-3', item.color)}>
                  {item.label}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Funds</span>
                    <span className="font-medium text-foreground">{item.count}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Allocation</span>
                    <span className="font-medium text-foreground">{item.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Value</span>
                    <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 5: Diversification Score */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Diversification Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex items-center justify-center">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  stroke="hsl(var(--secondary))"
                  strokeWidth="10"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  stroke={
                    diversificationScore.score >= 75
                      ? 'hsl(142, 65%, 48%)'
                      : diversificationScore.score >= 60
                        ? 'hsl(38, 92%, 55%)'
                        : 'hsl(0, 72%, 56%)'
                  }
                  strokeWidth="10"
                  strokeDasharray={`${(diversificationScore.score / 100) * 2 * Math.PI * 60} ${2 * Math.PI * 60}`}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                />
                <text
                  x="70"
                  y="62"
                  textAnchor="middle"
                  className="text-3xl font-bold"
                  fill="hsl(var(--foreground))"
                  fontSize="28"
                >
                  {diversificationScore.score}
                </text>
                <text
                  x="70"
                  y="82"
                  textAnchor="middle"
                  className="text-xs"
                  fill="hsl(var(--muted-foreground))"
                  fontSize="11"
                >
                  / 100
                </text>
              </svg>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p
                  className={cn(
                    'text-lg font-bold',
                    diversificationScore.score >= 75
                      ? 'text-success'
                      : diversificationScore.score >= 60
                        ? 'text-warning'
                        : 'text-destructive',
                  )}
                >
                  {diversificationScore.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {diversificationScore.label === 'Excellent'
                    ? 'Well-diversified portfolio with balanced exposure across AMCs, asset classes, and categories.'
                    : diversificationScore.label === 'Good'
                      ? 'Good diversification. Consider further spreading across asset classes and categories.'
                      : diversificationScore.label === 'Moderate'
                        ? 'Moderate diversification. Review concentration in any single AMC or asset class.'
                        : 'Portfolio is concentrated. Consider adding funds across different AMCs, asset classes, and categories.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AMC Spread</span>
                  <span className="font-medium text-foreground">{diversificationScore.amcScore}/30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset Classes</span>
                  <span className="font-medium text-foreground">{diversificationScore.assetScore}/30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fund Count</span>
                  <span className="font-medium text-foreground">{diversificationScore.countScore}/20</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category Spread</span>
                  <span className="font-medium text-foreground">{diversificationScore.catScore}/20</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
