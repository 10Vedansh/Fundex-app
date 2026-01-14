import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ZAxis,
} from 'recharts';
import { MutualFund, CATEGORY_COLORS, FundCategory } from '@/types/mutualFund';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface RiskReturnChartProps {
  funds: MutualFund[];
  onFundClick?: (fund: MutualFund) => void;
}

interface ChartDataPoint {
  x: number;
  y: number;
  z: number;
  name: string;
  category: FundCategory;
  fund: MutualFund;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint;
    const fund = data.fund;
    
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
        <p className="font-semibold text-foreground mb-2">{fund.name}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Category:</span>
            <span className="text-foreground">{fund.category}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">1Y CAGR:</span>
            <span className="text-success font-medium">{fund.cagr1Y.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Volatility:</span>
            <span className="text-foreground">{fund.volatility.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Sharpe Ratio:</span>
            <span className="text-foreground">{fund.sharpeRatio.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Risk Level:</span>
            <span className="text-foreground">{fund.riskLevel}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function RiskReturnChart({ funds, onFundClick }: RiskReturnChartProps) {
  const chartData = useMemo(() => {
    return funds.map(fund => ({
      x: fund.volatility,
      y: fund.cagr1Y,
      z: fund.sharpeRatio * 100,
      name: fund.name,
      category: fund.category,
      fund,
    }));
  }, [funds]);

  const categories = useMemo(() => {
    return Array.from(new Set(funds.map(f => f.category)));
  }, [funds]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-xl">Risk vs Return Analysis</CardTitle>
        <CardDescription>
          Bubble size represents Sharpe Ratio • Click on bubbles for details
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6">
          {categories.map(category => (
            <div key={category} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: CATEGORY_COLORS[category] }}
              />
              <span className="text-sm text-muted-foreground">{category}</span>
            </div>
          ))}
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.3}
              />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Volatility" 
                unit="%" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                label={{ 
                  value: 'Volatility (%)', 
                  position: 'bottom',
                  offset: 20,
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 12,
                }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="CAGR" 
                unit="%" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                label={{ 
                  value: '1Y CAGR (%)', 
                  angle: -90, 
                  position: 'insideLeft',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 12,
                }}
              />
              <ZAxis 
                type="number" 
                dataKey="z" 
                range={[100, 600]} 
                name="Sharpe"
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter 
                name="Funds" 
                data={chartData} 
                onClick={(data) => onFundClick?.(data.fund)}
                cursor="pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CATEGORY_COLORS[entry.category]}
                    fillOpacity={0.8}
                    stroke={CATEGORY_COLORS[entry.category]}
                    strokeWidth={2}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
