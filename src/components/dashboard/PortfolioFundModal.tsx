import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MutualFund } from '@/types/mutualFund';
import { PortfolioItem } from '@/hooks/usePortfolio';
import { ReturnAnalysisChart } from './ReturnAnalysisChart';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Calendar, Wallet, Target } from 'lucide-react';

interface PortfolioFundModalProps {
  fund: MutualFund | null;
  portfolioItem: PortfolioItem | null;
  isOpen: boolean;
  onClose: () => void;
  insight: { type: 'continue' | 'review' | 'reduce'; message: string } | null;
}

export function PortfolioFundModal({ fund, portfolioItem, isOpen, onClose, insight }: PortfolioFundModalProps) {
  if (!fund || !portfolioItem) return null;

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'continue':
        return 'bg-success/20 text-success border-success/30';
      case 'reduce':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-warning/20 text-warning border-warning/30';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'continue':
        return <TrendingUp className="h-4 w-4" />;
      case 'reduce':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getInsightLabel = (type: string) => {
    switch (type) {
      case 'continue':
        return 'Consider Continuing';
      case 'reduce':
        return 'Consider Reducing';
      default:
        return 'Consider Reviewing';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card border-border/50">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              {fund.category}
            </Badge>
            {portfolioItem.is_sip && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                SIP Active
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl font-bold">{fund.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{fund.amc}</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Investment Details */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="glass-card border-border/30">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invested Amount</p>
                  <p className="text-lg font-semibold">
                    ₹{portfolioItem.invested_amount?.toLocaleString() || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {portfolioItem.is_sip && portfolioItem.sip_amount && (
              <Card className="glass-card border-border/30">
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly SIP</p>
                    <p className="text-lg font-semibold">
                      ₹{portfolioItem.sip_amount.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Return Analysis Chart */}
          <ReturnAnalysisChart fund={fund} />

          {/* Returns Summary */}
          <Card className="glass-card border-border/30">
            <CardContent className="py-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Returns Summary
              </h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">1Y CAGR</p>
                  <p className={`text-lg font-semibold ${fund.cagr1Y >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {fund.cagr1Y >= 0 ? '+' : ''}{fund.cagr1Y.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">3Y CAGR</p>
                  <p className={`text-lg font-semibold ${fund.cagr3Y >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {fund.cagr3Y >= 0 ? '+' : ''}{fund.cagr3Y.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">5Y CAGR</p>
                  <p className={`text-lg font-semibold ${fund.cagr5Y >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {fund.cagr5Y >= 0 ? '+' : ''}{fund.cagr5Y.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Sharpe</p>
                  <p className="text-lg font-semibold text-foreground">
                    {fund.sharpeRatio.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Educational Insight */}
          {insight && (
            <Card className={`border ${getInsightStyle(insight.type)}`}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getInsightStyle(insight.type)}`}>
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-1">{getInsightLabel(insight.type)}</p>
                    <p className="text-sm text-muted-foreground">{insight.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <span>
                <strong className="text-warning">Educational insights only. Not investment advice.</strong>{' '}
                Past performance does not guarantee future results. Please consult a qualified financial advisor.
              </span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
