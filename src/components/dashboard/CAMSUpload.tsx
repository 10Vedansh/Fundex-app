import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HoldingData {
  fund_name: string;
  amc: string;
  folio_number?: string;
  units?: number | null;
  nav?: number | null;
  current_value?: number | null;
  cost_value?: number | null;
  category?: string;
}

interface ParsedPortfolio {
  investor_name?: string;
  holdings: HoldingData[];
  total_current_value?: number | null;
  total_cost_value?: number | null;
}

type HealthStatus = 'healthy' | 'moderate' | 'degrading';

function getHealthStatus(holding: HoldingData): HealthStatus {
  const cost = holding.cost_value ?? 0;
  const current = holding.current_value ?? 0;
  if (cost === 0) return 'moderate';
  const returnPct = ((current - cost) / cost) * 100;
  if (returnPct > 5) return 'healthy';
  if (returnPct >= -5) return 'moderate';
  return 'degrading';
}

function getOverallHealth(holdings: HoldingData[]): HealthStatus {
  const statuses = holdings.map(getHealthStatus);
  const degradingCount = statuses.filter(s => s === 'degrading').length;
  const healthyCount = statuses.filter(s => s === 'healthy').length;
  if (degradingCount > holdings.length * 0.4) return 'degrading';
  if (healthyCount > holdings.length * 0.5) return 'healthy';
  return 'moderate';
}

const HEALTH_CONFIG = {
  healthy: { label: 'Healthy', color: 'text-success', bg: 'bg-success/15', icon: TrendingUp, barColor: 'bg-success' },
  moderate: { label: 'Moderate', color: 'text-warning', bg: 'bg-warning/15', icon: Minus, barColor: 'bg-warning' },
  degrading: { label: 'Needs Attention', color: 'text-destructive', bg: 'bg-destructive/15', icon: TrendingDown, barColor: 'bg-destructive' },
};

async function extractTextFromPDF(file: File, password?: string): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingParams: any = { data: arrayBuffer };
  if (password) {
    loadingParams.password = password;
  }
  
  const pdf = await pdfjsLib.getDocument(loadingParams).promise;
  const pages: string[] = [];

  for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    pages.push(pageText);
  }

  return pages.join('\n\n');
}

interface CAMSUploadProps {
  compact?: boolean;
  onDataLoaded?: () => void;
}


export function CAMSUpload({ compact = false, onDataLoaded }: CAMSUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [portfolio, setPortfolio] = useState<ParsedPortfolio | null>(null);
  const [expandedFund, setExpandedFund] = useState<number | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [pdfPassword, setPdfPassword] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processPDF = useCallback(async (file: File, password?: string) => {
    setIsProcessing(true);
    setPortfolio(null);

    try {
      toast.info('Extracting text from PDF...');
      const textContent = await extractTextFromPDF(file, password);

      if (textContent.length < 50) {
        toast.error('Could not extract text from PDF. It may be image-based.');
        setIsProcessing(false);
        return;
      }

      toast.info('Analyzing portfolio with AI...');
      const { data, error } = await supabase.functions.invoke('parse-cams', {
        body: { textContent: textContent.slice(0, 30000) },
      });

      if (error) throw error;
      if (!data || !data.holdings || data.holdings.length === 0) {
        toast.error('No holdings found. Please check if it\'s a valid CAMS statement.');
        setIsProcessing(false);
        return;
      }

      setPortfolio(data);
      onDataLoaded?.();
      setNeedsPassword(false);
      setPendingFile(null);
      setPdfPassword('');
      toast.success(`Found ${data.holdings.length} fund(s) in your portfolio`);
    } catch (err: any) {
      console.error('CAMS parse error:', err);
      // Check if it's a password error
      if (err.message?.includes('password') || err.name === 'PasswordException') {
        setNeedsPassword(true);
        setPendingFile(file);
        setIsProcessing(false);
        toast.error('This PDF is password-protected. Please enter the password.');
        return;
      }
      toast.error(err.message || 'Failed to parse document');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB.');
      return;
    }

    await processPDF(file);
  }, [processPDF]);

  const handlePasswordSubmit = async () => {
    if (!pendingFile || !pdfPassword) return;
    await processPDF(pendingFile, pdfPassword);
  };

  const reset = () => {
    setPortfolio(null);
    setExpandedFund(null);
    setNeedsPassword(false);
    setPdfPassword('');
    setPendingFile(null);
  };

  // Password prompt UI
  if (needsPassword) {
    return (
      <Card className="glass-card">
        <CardContent className="py-10 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Password Required</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            This CAMS statement is password-protected. Please enter the PDF password to continue.
          </p>
          <div className="flex gap-2 w-full max-w-xs">
            <input
              type="password"
              value={pdfPassword}
              onChange={(e) => setPdfPassword(e.target.value)}
              placeholder="Enter PDF password"
              className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <Button onClick={handlePasswordSubmit} disabled={isProcessing || !pdfPassword} size="sm">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-3 text-muted-foreground" onClick={reset}>
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Compact button mode - shown in portfolio tab header when user has manual portfolio items
  if (compact && !portfolio) {
    return (
      <label className="cursor-pointer">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isProcessing}
        />
        <Button asChild variant="outline" size="sm" disabled={isProcessing}>
          <span>
            {isProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload CAMS
              </>
            )}
          </span>
        </Button>
      </label>
    );
  }

  // Full upload UI - shown when portfolio is empty
  if (!portfolio && !compact) {
    return (
      <Card className="glass-card">
        <CardContent className="py-10 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Upload CAMS Statement</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Upload your CAMS Consolidated Account Statement (PDF) to analyze your portfolio health, 
            get fund-level insights, and find better alternatives for underperforming funds.
          </p>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
            <Button asChild disabled={isProcessing}>
              <span>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CAMS PDF
                  </>
                )}
              </span>
            </Button>
          </label>
        </CardContent>
      </Card>
    );
  }

  if (!portfolio) return null;

  // Portfolio results view
  const overall = getOverallHealth(portfolio.holdings);
  const overallConfig = HEALTH_CONFIG[overall];
  const totalCurrent = portfolio.total_current_value ?? portfolio.holdings.reduce((s, h) => s + (h.current_value ?? 0), 0);
  const totalCost = portfolio.total_cost_value ?? portfolio.holdings.reduce((s, h) => s + (h.cost_value ?? 0), 0);
  const totalReturn = totalCost > 0 ? ((totalCurrent - totalCost) / totalCost) * 100 : 0;

  // More realistic projections using category-based expected returns
  const annualizedReturn = totalCost > 0 ? totalReturn / 100 : 0;
  const conservativeGrowth = Math.max(0.06, Math.min(annualizedReturn * 0.7, 0.14));
  const baseGrowth = Math.max(0.08, Math.min(annualizedReturn * 0.85, 0.16));
  const proj1Y = totalCurrent * (1 + conservativeGrowth);
  const proj3Y = totalCurrent * Math.pow(1 + baseGrowth, 3);
  const proj5Y = totalCurrent * Math.pow(1 + baseGrowth, 5);

  // Find replacement suggestions for degrading funds
  const degradingHoldings = portfolio.holdings.filter(h => getHealthStatus(h) === 'degrading');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {portfolio.investor_name && (
            <p className="text-sm text-muted-foreground">Portfolio of <span className="text-foreground font-medium">{portfolio.investor_name}</span></p>
          )}
          <h3 className="text-lg font-semibold">{portfolio.holdings.length} Fund(s) Found</h3>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Upload New
        </Button>
      </div>

      {/* Health-o-Meter */}
      <Card className="glass-card overflow-hidden">
        <CardContent className="py-6">
          <div className="flex items-center gap-4 mb-5">
            <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center', overallConfig.bg)}>
              <overallConfig.icon className={cn('h-8 w-8', overallConfig.color)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Portfolio Health-o-Meter</p>
              <p className={cn('text-3xl font-bold', overallConfig.color)}>{overallConfig.label}</p>
            </div>
          </div>
          {/* Health bar with percentages */}
          <div className="space-y-2">
            <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-muted/30">
              {(['healthy', 'moderate', 'degrading'] as HealthStatus[]).map(status => {
                const count = portfolio.holdings.filter(h => getHealthStatus(h) === status).length;
                const pct = (count / portfolio.holdings.length) * 100;
                return pct > 0 ? (
                  <div key={status} className={cn('h-full rounded-full transition-all', HEALTH_CONFIG[status].barColor)} style={{ width: `${pct}%` }} />
                ) : null;
              })}
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Healthy ({portfolio.holdings.filter(h => getHealthStatus(h) === 'healthy').length})</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Moderate ({portfolio.holdings.filter(h => getHealthStatus(h) === 'moderate').length})</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Needs Attention ({portfolio.holdings.filter(h => getHealthStatus(h) === 'degrading').length})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Investment</p>
            <p className="text-lg font-bold">₹{Math.round(totalCost).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Current Value</p>
            <p className={cn('text-lg font-bold', totalReturn >= 0 ? 'text-success' : 'text-destructive')}>₹{Math.round(totalCurrent).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Expected (3Y)</p>
            <p className="text-lg font-bold text-foreground">₹{Math.round(proj3Y).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Expected (5Y)</p>
            <p className="text-lg font-bold text-foreground">₹{Math.round(proj5Y).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Fund Holdings */}
      <div className="space-y-3">
        {portfolio.holdings.map((holding, idx) => {
          const status = getHealthStatus(holding);
          const config = HEALTH_CONFIG[status];
          const returnPct = (holding.cost_value && holding.cost_value > 0) 
            ? ((holding.current_value ?? 0) - holding.cost_value) / holding.cost_value * 100 
            : null;
          const isExpanded = expandedFund === idx;

          return (
            <Card key={idx} className="glass-card">
              <CardContent className="py-4">
                <div 
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => setExpandedFund(isExpanded ? null : idx)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-foreground truncate">{holding.fund_name}</h4>
                      <Badge variant="outline" className={cn('text-[10px] shrink-0 border-0', config.bg, config.color)}>
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{holding.amc}</span>
                      {holding.category && <span>• {holding.category}</span>}
                      {returnPct != null && (
                        <span className={cn(returnPct >= 0 ? 'text-success' : 'text-destructive')}>
                          {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {holding.current_value != null && (
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap">₹{Math.round(holding.current_value).toLocaleString()}</span>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/30 space-y-2 text-xs">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {holding.units != null && <div><span className="text-muted-foreground">Units:</span> <span className="font-medium">{holding.units.toFixed(3)}</span></div>}
                      {holding.nav != null && <div><span className="text-muted-foreground">NAV:</span> <span className="font-medium">₹{holding.nav.toFixed(2)}</span></div>}
                      {holding.cost_value != null && <div><span className="text-muted-foreground">Cost:</span> <span className="font-medium">₹{Math.round(holding.cost_value).toLocaleString()}</span></div>}
                      {holding.folio_number && <div><span className="text-muted-foreground">Folio:</span> <span className="font-medium">{holding.folio_number}</span></div>}
                    </div>
                    {status === 'degrading' && (
                      <div className="mt-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-destructive font-medium mb-1">⚠️ This fund is underperforming</p>
                        <p className="text-muted-foreground mb-2">Consider switching to a better-performing fund in the same {holding.category || 'category'}.</p>
                        <p className="text-foreground font-medium mb-1">Suggested Replacements:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                          <li>Use the AI tab → ask "Best {holding.category || 'fund'} alternatives"</li>
                          <li>Check the All Funds tab for top performers in this category</li>
                          <li>Look for funds with higher Sharpe ratio and lower expense</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-warning/10 border-warning/30">
        <CardContent className="py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-warning">Disclaimer:</strong> Health analysis is based on cost vs current value from the CAMS statement. 
            Projections use conservative estimates (6-16% annual growth capped) and are not guaranteed. Consult a financial advisor before making changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
