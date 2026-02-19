import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MutualFund, FundSectorData } from '@/types/mutualFund';
import { ReturnAnalysisChart } from './ReturnAnalysisChart';
import { SIPCalculator } from './SIPCalculator';
import { FundNewsSection } from './FundNewsSection';
import { HoldingsTable } from './HoldingsTable';
import { HoldingAnalysisCharts } from './HoldingAnalysisCharts';
import { TermTooltip } from './TermTooltip';
import { generateInvestmentGuidance } from '@/utils/investmentGuidance';
import { TrendingUp, TrendingDown, Shield, Zap, Target, AlertTriangle, ThumbsUp, ThumbsDown, Plus } from 'lucide-react';

interface FundDetailModalProps {
  fund: MutualFund | null;
  sectorData: FundSectorData | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToPortfolio?: (fund: MutualFund) => void;
  userRiskProfile?: string;
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

export function FundDetailModal({ fund, sectorData, isOpen, onClose, onAddToPortfolio, userRiskProfile }: FundDetailModalProps) {
  if (!fund) return null;

  const guidance = generateInvestmentGuidance(fund, userRiskProfile);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-border/50 p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border/30">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              {onAddToPortfolio && (
                <Button size="sm" onClick={() => onAddToPortfolio(fund)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add to Portfolio
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
          </div>
          <DialogTitle className="text-xl font-bold mt-2">{fund.name}</DialogTitle>
          <p className="text-muted-foreground text-sm">{fund.amc} • {fund.category}</p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Key Metrics Grid with tooltips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="1Y CAGR" term="1Y CAGR" value={`${(fund.cagr1Y ?? 0).toFixed(1)}%`} positive={(fund.cagr1Y ?? 0) > 0} />
            <MetricCard label="3Y CAGR" term="3Y CAGR" value={`${(fund.cagr3Y ?? 0).toFixed(1)}%`} positive={(fund.cagr3Y ?? 0) > 0} />
            <MetricCard label="5Y CAGR" term="5Y CAGR" value={`${(fund.cagr5Y ?? 0).toFixed(1)}%`} positive={(fund.cagr5Y ?? 0) > 0} />
            <MetricCard label="NAV" term="NAV" value={`₹${(fund.nav ?? 0).toFixed(2)}`} />
            <MetricCard label="Volatility" term="Volatility" value={`${(fund.volatility ?? 0).toFixed(1)}%`} />
            <MetricCard label="Sharpe Ratio" term="Sharpe Ratio" value={(fund.sharpeRatio ?? 0).toFixed(2)} />
            <MetricCard label="Expense Ratio" term="Expense Ratio" value={`${(fund.expenseRatio ?? 0).toFixed(2)}%`} />
            <MetricCard label="AUM" term="AUM" value={`₹${((fund.aum ?? 0) / 1000).toFixed(1)}K Cr`} />
          </div>

          {/* NAV Performance Chart with timeframe selector */}
          <ReturnAnalysisChart fund={fund} />

          {/* Holdings Table */}
          <HoldingsTable fund={fund} />

          {/* Holding Analysis - Asset Split & Sector Split side by side */}
          <HoldingAnalysisCharts fund={fund} />

          {/* Why Should You Invest / Avoid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card border-success/30 bg-success/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-success">
                  <ThumbsUp className="h-4 w-4" />
                  Why Should You Invest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {guidance.whyInvest.map((item, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-success mt-0.5 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="glass-card border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                  <ThumbsDown className="h-4 w-4" />
                  Why Should You Avoid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {guidance.whyAvoid.map((item, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-destructive mt-0.5 font-bold">✗</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* SIP Calculator */}
          <SIPCalculator fund={fund} />

          {/* Related News */}
          <FundNewsSection fund={fund} />

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

function MetricCard({ label, value, positive, term }: { label: string; value: string; positive?: boolean; term?: string }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30 border border-border/30 relative">
      <div className="flex items-center gap-1">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {term && <TermTooltip term={term} className="mb-1" />}
      </div>
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
