import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MutualFund, FundSectorData } from '@/types/mutualFund';
import { SectorAllocationChart } from './SectorAllocationChart';
import { TrendingUp, TrendingDown, Shield, Zap, Target, AlertTriangle, Users, Ban } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FundDetailModalProps {
  fund: MutualFund | null;
  sectorData: FundSectorData | null;
  isOpen: boolean;
  onClose: () => void;
}

function getRiskIcon(riskLevel: string) {
  switch (riskLevel) {
    case 'Low': return <Shield className="h-4 w-4" />;
    case 'Moderate': return <Target className="h-4 w-4" />;
    case 'High': return <Zap className="h-4 w-4" />;
    default: return null;
  }
}

function getRiskColor(riskLevel: string) {
  switch (riskLevel) {
    case 'Low': return 'bg-success/20 text-success border-success/30';
    case 'Moderate': return 'bg-warning/20 text-warning border-warning/30';
    case 'High': return 'bg-destructive/20 text-destructive border-destructive/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

function generateInvestorGuidance(fund: MutualFund) {
  const shouldInvest: string[] = [];
  const shouldAvoid: string[] = [];

  // Based on risk level
  if (fund.riskLevel === 'Low') {
    shouldInvest.push('Conservative investors seeking capital preservation');
    shouldInvest.push('Retirees looking for stable income');
    shouldAvoid.push('Aggressive investors seeking high growth');
  } else if (fund.riskLevel === 'High') {
    shouldInvest.push('Aggressive investors with long-term horizon');
    shouldInvest.push('Young professionals with high risk appetite');
    shouldAvoid.push('Risk-averse investors nearing retirement');
    shouldAvoid.push('Those needing funds within 3 years');
  } else {
    shouldInvest.push('Balanced investors seeking moderate growth');
    shouldInvest.push('Those with 5+ year investment horizon');
  }

  // Based on category
  if (fund.category === 'Equity') {
    shouldInvest.push('Investors seeking inflation-beating returns');
    shouldAvoid.push('Those uncomfortable with market volatility');
  } else if (fund.category === 'Debt') {
    shouldInvest.push('Investors prioritizing capital safety');
    shouldAvoid.push('Those seeking aggressive wealth creation');
  } else if (fund.category === 'Liquid') {
    shouldInvest.push('Those needing high liquidity for emergencies');
    shouldAvoid.push('Long-term wealth creation goals');
  }

  // Based on expense ratio
  if (fund.expenseRatio < 0.5) {
    shouldInvest.push('Cost-conscious investors');
  } else if (fund.expenseRatio > 1.5) {
    shouldAvoid.push('Those sensitive to fund costs');
  }

  return { shouldInvest: shouldInvest.slice(0, 4), shouldAvoid: shouldAvoid.slice(0, 3) };
}

export function FundDetailModal({ fund, sectorData, isOpen, onClose }: FundDetailModalProps) {
  if (!fund) return null;

  const guidance = generateInvestorGuidance(fund);
  
  // Risk-Return chart data
  const chartData = [{ x: fund.volatility, y: fund.cagr1Y, name: fund.name }];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-border/50 p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border/30">
          <div className="flex flex-wrap items-start gap-3">
            <Badge variant="outline" className={getRiskColor(fund.riskLevel)}>
              {getRiskIcon(fund.riskLevel)}
              <span className="ml-1">{fund.riskLevel} Risk</span>
            </Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              {fund.category}
            </Badge>
            {fund.strengthBadge && (
              <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent/30">
                {fund.strengthBadge}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl font-bold mt-2">{fund.name}</DialogTitle>
          <p className="text-muted-foreground text-sm">{fund.amc} • {fund.category}</p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              label="1Y CAGR" 
              value={`${fund.cagr1Y.toFixed(1)}%`} 
              positive={fund.cagr1Y > 0}
            />
            <MetricCard 
              label="3Y CAGR" 
              value={`${fund.cagr3Y.toFixed(1)}%`} 
              positive={fund.cagr3Y > 0}
            />
            <MetricCard 
              label="5Y CAGR" 
              value={`${fund.cagr5Y.toFixed(1)}%`} 
              positive={fund.cagr5Y > 0}
            />
            <MetricCard 
              label="NAV" 
              value={`₹${fund.nav.toFixed(2)}`} 
            />
            <MetricCard 
              label="Volatility" 
              value={`${fund.volatility.toFixed(1)}%`} 
            />
            <MetricCard 
              label="Sharpe Ratio" 
              value={fund.sharpeRatio.toFixed(2)} 
            />
            <MetricCard 
              label="Expense Ratio" 
              value={`${fund.expenseRatio.toFixed(2)}%`} 
            />
            <MetricCard 
              label="AUM" 
              value={`₹${(fund.aum / 1000).toFixed(1)}K Cr`} 
            />
          </div>

          {/* Risk vs Return Chart */}
          <Card className="glass-card border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Risk vs Return Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Risk" 
                      unit="%" 
                      domain={[0, 'dataMax + 5']}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      label={{ value: 'Risk (Volatility)', position: 'bottom', fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="Return" 
                      unit="%" 
                      domain={['dataMin - 5', 'dataMax + 5']}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      label={{ value: 'Return (1Y CAGR)', angle: -90, position: 'left', fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Scatter data={chartData}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill="hsl(var(--primary))" />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sector Allocation */}
          {sectorData && (
            <div className="grid grid-cols-1">
              <SectorAllocationChart sectorData={sectorData} />
            </div>
          )}

          {/* Who Should Invest / Avoid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card border-success/30 bg-success/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-success">
                  <Users className="h-4 w-4" />
                  Who Should Invest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {guidance.shouldInvest.map((item, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-success mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="glass-card border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                  <Ban className="h-4 w-4" />
                  Who Should Avoid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {guidance.shouldAvoid.map((item, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-destructive mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              Past performance does not guarantee future results. Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-semibold ${
        positive !== undefined 
          ? positive ? 'text-success' : 'text-destructive'
          : 'text-foreground'
      }`}>
        {positive !== undefined && (
          positive ? <TrendingUp className="h-3 w-3 inline mr-1" /> : <TrendingDown className="h-3 w-3 inline mr-1" />
        )}
        {value}
      </p>
    </div>
  );
}
