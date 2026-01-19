import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { MutualFund } from '@/types/mutualFund';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ReturnAnalysisChartProps {
  fund: MutualFund;
  compact?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Returns:</span>
          <span className={`font-semibold ${payload[0].value >= 0 ? 'text-success' : 'text-destructive'}`}>
            {payload[0].value.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function ReturnAnalysisChart({ fund, compact = false }: ReturnAnalysisChartProps) {
  const chartData = useMemo(() => {
    // Generate historical returns data based on CAGRs
    // This simulates what the returns would look like over time
    const data = [
      { period: '1Y', returns: fund.cagr1Y, fullLabel: '1 Year' },
      { period: '3Y', returns: fund.cagr3Y, fullLabel: '3 Years (Annualized)' },
      { period: '5Y', returns: fund.cagr5Y, fullLabel: '5 Years (Annualized)' },
    ];
    return data;
  }, [fund]);

  const minReturn = Math.min(...chartData.map(d => d.returns), 0);
  const maxReturn = Math.max(...chartData.map(d => d.returns), 0);

  return (
    <Card className="glass-card border-border/30">
      <CardHeader className={compact ? 'pb-2 pt-4 px-4' : 'pb-2'}>
        <CardTitle className={compact ? 'text-sm font-medium' : 'text-sm font-medium'}>
          Return Analysis
        </CardTitle>
        {!compact && (
          <CardDescription className="text-xs">
            Annualized returns over different time periods
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={compact ? 'px-4 pb-4' : ''}>
        <div className={compact ? 'h-32' : 'h-48'}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.3} 
                vertical={false}
              />
              <XAxis 
                dataKey="period" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
                domain={[minReturn - 5, maxReturn + 5]}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="returns"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#returnGradient)"
                dot={{ 
                  fill: 'hsl(var(--primary))', 
                  strokeWidth: 2, 
                  stroke: 'hsl(var(--background))',
                  r: 4 
                }}
                activeDot={{ 
                  r: 6, 
                  fill: 'hsl(var(--primary))',
                  stroke: 'hsl(var(--background))',
                  strokeWidth: 2
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Returns summary below chart */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/30">
          {chartData.map((item) => (
            <div key={item.period} className="text-center">
              <p className="text-xs text-muted-foreground">{item.period}</p>
              <p className={`text-sm font-semibold ${item.returns >= 0 ? 'text-success' : 'text-destructive'}`}>
                {item.returns >= 0 ? '+' : ''}{item.returns.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
