import { useState, useMemo } from 'react';
import { MutualFund, AssetClass, CATEGORY_LABELS } from '@/types/mutualFund';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Bookmark,
  ArrowLeft,
  TrendingUp,
  Shield,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

// ── Asset class config ──
const ASSET_CLASSES: AssetClass[] = ['Equity', 'Debt', 'Commodities', 'Hybrid'];

const ASSET_CLASS_META: Record<AssetClass, { icon: React.ReactNode; description: string; color: string }> = {
  Equity: {
    icon: <TrendingUp className="h-6 w-6" />,
    description: 'Invest in stocks for long-term growth',
    color: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 hover:border-blue-500/50',
  },
  Debt: {
    icon: <Shield className="h-6 w-6" />,
    description: 'Stable returns with lower risk',
    color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-500/50',
  },
  Commodities: {
    icon: <DollarSign className="h-6 w-6" />,
    description: 'Gold, silver & commodity funds',
    color: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 hover:border-amber-500/50',
  },
  Hybrid: {
    icon: <BarChart3 className="h-6 w-6" />,
    description: 'Balanced mix of equity & debt',
    color: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 hover:border-purple-500/50',
  },
};

const SUB_CATEGORIES: Record<AssetClass, string[]> = {
  Equity: ['All', 'Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap', 'Multi Cap', 'ELSS', 'Sectoral / Thematic', 'Index Funds', 'International'],
  Debt: ['All', 'Liquid', 'Ultra Short Duration', 'Short Duration', 'Medium Duration', 'Long Duration', 'Corporate Bond', 'Credit Risk', 'Gilt', 'Dynamic Bond'],
  Commodities: ['All', 'Gold Funds', 'Silver Funds'],
  Hybrid: ['All', 'Aggressive Hybrid', 'Conservative Hybrid', 'Balanced Advantage', 'Arbitrage', 'Multi Asset Allocation'],
};

// Map workbook category codes to asset classes
function getAssetClass(fund: MutualFund): AssetClass {
  if (fund.assetClass) return fund.assetClass;
  const cat = (fund.category || '').toLowerCase();
  if (cat.startsWith('eq-') || cat === 'equity' || cat === 'index') return 'Equity';
  if (cat.startsWith('dt-') || cat === 'debt' || cat === 'liquid') return 'Debt';
  if (cat.startsWith('hy-') || cat === 'hybrid') return 'Hybrid';
  if (cat.includes('gold') || cat.includes('silver')) return 'Commodities';
  return 'Equity';
}

// Map category code to sub-category for filtering
function getSubCategory(fund: MutualFund): string {
  const cat = fund.category || '';
  const label = CATEGORY_LABELS[cat];
  if (label) return label;
  // Fallback mapping
  const lower = cat.toLowerCase();
  if (lower.includes('lc') || lower.includes('large')) return 'Large Cap';
  if (lower.includes('mc') || lower.includes('mid')) return 'Mid Cap';
  if (lower.includes('sc') || lower.includes('small')) return 'Small Cap';
  if (lower.includes('flx') || lower.includes('flexi')) return 'Flexi Cap';
  if (lower.includes('mlc') || lower.includes('multi cap')) return 'Multi Cap';
  if (lower.includes('elss')) return 'ELSS';
  if (lower.includes('index') || lower.includes('etf') || lower.includes('nifty') || lower.includes('sensex')) return 'Index Funds';
  if (lower.includes('intl') || lower.includes('international')) return 'International';
  if (lower.includes('gold')) return 'Gold Funds';
  if (lower.includes('silver')) return 'Silver Funds';
  if (lower.includes('liq')) return 'Liquid';
  if (lower.includes('ah') || lower.includes('aggressive')) return 'Aggressive Hybrid';
  if (lower.includes('ch') || lower.includes('conservative')) return 'Conservative Hybrid';
  if (lower.includes('daa') || lower.includes('balanced')) return 'Balanced Advantage';
  if (lower.includes('ar') || lower.includes('arbitrage')) return 'Arbitrage';
  if (lower.includes('maa') || lower.includes('multi asset')) return 'Multi Asset Allocation';
  return 'Sectoral / Thematic';
}

function matchesSubCategory(fund: MutualFund, subCat: string): boolean {
  if (subCat === 'All') return true;
  const fundSubCat = getSubCategory(fund);
  return fundSubCat.toLowerCase().includes(subCat.toLowerCase()) ||
    subCat.toLowerCase().includes(fundSubCat.toLowerCase());
}

// ── Section tab definitions ──
type SectionTab = 'overview' | 'returns' | 'risk' | 'nav' | 'fees';

interface SectionDef {
  id: SectionTab;
  label: string;
  columns: { key: string; label: string; align?: string; render: (f: MutualFund) => string }[];
}

const fmt = (v: number | null | undefined, suffix = '') => v != null ? `${v > 0 && suffix === '%' ? '+' : ''}${v.toFixed(suffix === '%' ? 1 : 2)}${suffix}` : '--';
const fmtCr = (v: number | null | undefined) => v != null ? `₹${v.toLocaleString()}` : '--';

const SECTIONS: SectionDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    columns: [
      { key: 'amc', label: 'AMC', render: (f) => f.amc },
      { key: 'category', label: 'Category', render: (f) => CATEGORY_LABELS[f.category] || f.category },
      { key: 'expenseRatio', label: 'Expense', align: 'right', render: (f) => fmt(f.expenseRatio, '%') },
      { key: 'aum', label: 'AUM (Cr)', align: 'right', render: (f) => fmtCr(f.aum) },
      { key: 'riskLevel', label: 'Risk', align: 'center', render: (f) => f.riskLevel },
      { key: 'cagr1Y', label: '1Y Return', align: 'right', render: (f) => fmt(f.ret1Y ?? f.cagr1Y, '%') },
      { key: 'cagr3Y', label: '3Y CAGR', align: 'right', render: (f) => fmt(f.ret3Y ?? f.cagr3Y, '%') },
      { key: 'cagr5Y', label: '5Y CAGR', align: 'right', render: (f) => fmt(f.ret5Y ?? f.cagr5Y, '%') },
    ],
  },
  {
    id: 'returns',
    label: 'Returns',
    columns: [
      { key: 'ret1W', label: '1W', align: 'right', render: (f) => fmt(f.ret1W, '%') },
      { key: 'ret1M', label: '1M', align: 'right', render: (f) => fmt(f.ret1M, '%') },
      { key: 'ret3M', label: '3M', align: 'right', render: (f) => fmt(f.ret3M, '%') },
      { key: 'ret6M', label: '6M', align: 'right', render: (f) => fmt(f.ret6M, '%') },
      { key: 'cagr1Y', label: '1Y', align: 'right', render: (f) => fmt(f.ret1Y ?? f.cagr1Y, '%') },
      { key: 'cagr3Y', label: '3Y', align: 'right', render: (f) => fmt(f.ret3Y ?? f.cagr3Y, '%') },
      { key: 'cagr5Y', label: '5Y', align: 'right', render: (f) => fmt(f.ret5Y ?? f.cagr5Y, '%') },
      { key: 'ret10Y', label: '10Y', align: 'right', render: (f) => fmt(f.ret10Y, '%') },
      { key: 'alpha', label: 'Alpha', align: 'right', render: (f) => fmt(f.alpha) },
    ],
  },
  {
    id: 'risk',
    label: 'Risk',
    columns: [
      { key: 'riskLevel', label: 'Risk Level', align: 'center', render: (f) => f.riskLevel },
      { key: 'stdDev', label: 'Std Dev', align: 'right', render: (f) => fmt(f.stdDev ?? f.volatility) },
      { key: 'beta', label: 'Beta', align: 'right', render: (f) => fmt(f.beta) },
      { key: 'sharpe', label: 'Sharpe', align: 'right', render: (f) => fmt(f.sharpeRatio) },
      { key: 'sortino', label: 'Sortino', align: 'right', render: (f) => fmt(f.sortinoRatio) },
      { key: 'alpha', label: 'Alpha', align: 'right', render: (f) => fmt(f.alpha) },
      { key: 'infoRatio', label: 'Info Ratio', align: 'right', render: (f) => fmt(f.infoRatio) },
    ],
  },
  {
    id: 'nav',
    label: 'NAV',
    columns: [
      { key: 'nav', label: 'Latest NAV', align: 'right', render: (f) => `₹${(f.latestNav ?? f.nav).toFixed(2)}` },
      { key: 'previousNav', label: 'Previous NAV', align: 'right', render: (f) => f.previousNav != null ? `₹${f.previousNav.toFixed(2)}` : '--' },
      { key: 'high52W', label: '52W High', align: 'right', render: (f) => f.high52W != null ? `₹${f.high52W.toFixed(2)}` : '--' },
      { key: 'low52W', label: '52W Low', align: 'right', render: (f) => f.low52W != null ? `₹${f.low52W.toFixed(2)}` : '--' },
      { key: 'aum', label: 'AUM (Cr)', align: 'right', render: (f) => fmtCr(f.aum) },
    ],
  },
  {
    id: 'fees',
    label: 'Fees & Details',
    columns: [
      { key: 'expense', label: 'Expense Ratio', align: 'right', render: (f) => fmt(f.expenseRatio, '%') },
      { key: 'exitLoad', label: 'Exit Load', render: (f) => f.exitLoad || 'Nil' },
      { key: 'minInv', label: 'Min Investment', align: 'right', render: (f) => fmtCr(f.minInvestment) },
      { key: 'turnover', label: 'Turnover', align: 'right', render: (f) => f.turnover != null ? `${f.turnover}%` : '--' },
      { key: 'fundManager', label: 'Fund Manager', render: (f) => f.fundManager || '--' },
      { key: 'launch', label: 'Launch', render: (f) => f.launch || '--' },
    ],
  },
];

type SortKey = 'name' | 'amc' | 'expenseRatio' | 'aum' | 'riskLevel' | 'cagr1Y' | 'cagr3Y' | 'cagr5Y';

interface AllFundsTabProps {
  funds: MutualFund[];
  isLoading: boolean;
  onFundClick: (fund: MutualFund) => void;
  isInWatchlist: (id: string) => boolean;
  onBookmarkToggle: (fund: MutualFund) => void;
}

export function AllFundsTab({
  funds,
  isLoading,
  onFundClick,
  isInWatchlist,
  onBookmarkToggle,
}: AllFundsTabProps) {
  const [selectedAssetClass, setSelectedAssetClass] = useState<AssetClass | null>(null);
  const [subCategory, setSubCategory] = useState('All');
  const [activeSection, setActiveSection] = useState<SectionTab>('overview');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('cagr1Y');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleAssetClassSelect = (ac: AssetClass) => {
    setSelectedAssetClass(ac);
    setSubCategory('All');
    setActiveSection('overview');
  };

  const handleBack = () => {
    setSelectedAssetClass(null);
    setSearch('');
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />;
  };

  const currentSection = SECTIONS.find((s) => s.id === activeSection)!;

  // Count funds per asset class
  const assetClassCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ac of ASSET_CLASSES) counts[ac] = 0;
    for (const f of funds) {
      const ac = getAssetClass(f);
      if (counts[ac] !== undefined) counts[ac]++;
    }
    return counts;
  }, [funds]);

  const filtered = useMemo(() => {
    if (!selectedAssetClass) return [];
    let list = funds.filter((f) => getAssetClass(f) === selectedAssetClass);

    // Apply sub-category filter
    if (subCategory !== 'All') {
      list = list.filter((f) => matchesSubCategory(f, subCategory));
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) => f.name.toLowerCase().includes(q) || f.amc.toLowerCase().includes(q) ||
          (f.fundManager && f.fundManager.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let va: number | string = 0, vb: number | string = 0;
      switch (sortKey) {
        case 'name': va = a.name; vb = b.name; break;
        case 'amc': va = a.amc; vb = b.amc; break;
        case 'expenseRatio': va = a.expenseRatio; vb = b.expenseRatio; break;
        case 'aum': va = a.aum; vb = b.aum; break;
        case 'riskLevel': va = a.riskLevel; vb = b.riskLevel; break;
        case 'cagr1Y': va = a.ret1Y ?? a.cagr1Y; vb = b.ret1Y ?? b.cagr1Y; break;
        case 'cagr3Y': va = a.ret3Y ?? a.cagr3Y; vb = b.ret3Y ?? b.cagr3Y; break;
        case 'cagr5Y': va = a.ret5Y ?? a.cagr5Y; vb = b.ret5Y ?? b.cagr5Y; break;
      }
      if (typeof va === 'string') {
        const cmp = va.localeCompare(vb as string);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

    return list;
  }, [funds, selectedAssetClass, subCategory, search, sortKey, sortDir]);

  const returnColor = (val: number | null | undefined) => {
    if (val == null) return 'text-muted-foreground';
    return val >= 0 ? 'text-success' : 'text-destructive';
  };

  const renderCellValue = (fund: MutualFund, col: SectionDef['columns'][number]) => {
    const value = col.render(fund);
    if (['cagr1Y', 'cagr3Y', 'cagr5Y', 'ret1W', 'ret1M', 'ret3M', 'ret6M', 'ret10Y', 'alpha'].includes(col.key)) {
      const num = col.key === 'cagr1Y' ? (fund.ret1Y ?? fund.cagr1Y) :
        col.key === 'cagr3Y' ? (fund.ret3Y ?? fund.cagr3Y) :
        col.key === 'cagr5Y' ? (fund.ret5Y ?? fund.cagr5Y) :
        col.key === 'alpha' ? fund.alpha :
        (fund as any)[col.key];
      return <span className={cn('font-medium', returnColor(num))}>{value}</span>;
    }
    if (col.key === 'riskLevel') {
      return (
        <Badge variant="outline" className={cn(
          'text-xs font-medium border-0',
          fund.riskLevel === 'Low' && 'bg-success/15 text-success',
          fund.riskLevel === 'Moderate' && 'bg-warning/15 text-warning',
          fund.riskLevel === 'High' && 'bg-destructive/15 text-destructive'
        )}>
          {fund.riskLevel}
        </Badge>
      );
    }
    return <span className="text-muted-foreground">{value}</span>;
  };

  // ── Asset class selection cards ──
  if (!selectedAssetClass) {
    return (
      <div className="animate-fade-in space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Explore All Funds</h2>
        <p className="text-sm text-muted-foreground">Select an asset class to browse mutual funds</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {ASSET_CLASSES.map((ac) => {
            const meta = ASSET_CLASS_META[ac];
            const count = assetClassCounts[ac] || 0;
            return (
              <button
                key={ac}
                onClick={() => handleAssetClassSelect(ac)}
                className={cn(
                  'relative p-6 rounded-xl border bg-gradient-to-br transition-all duration-300 text-left group',
                  'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
                  meta.color
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-primary mb-2">{meta.icon}</div>
                    <h3 className="text-xl font-bold text-foreground">{ac}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
                  </div>
                  <span className="text-2xl font-bold text-muted-foreground/50">{count}</span>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  {SUB_CATEGORIES[ac].length - 1} sub-categories →
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Table view ──
  return (
    <div className="animate-fade-in space-y-0">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={handleBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="text-lg font-semibold text-foreground">{selectedAssetClass} Funds</h2>
        <span className="text-xs text-muted-foreground">({filtered.length} funds)</span>
      </div>

      {/* Sub-category pills */}
      <div className="flex gap-2 flex-wrap mb-3">
        {SUB_CATEGORIES[selectedAssetClass].map((sc) => (
          <button
            key={sc}
            onClick={() => setSubCategory(sc)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              subCategory === sc
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/60 border border-transparent'
            )}
          >
            {sc}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by fund name, AMC, or fund manager..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 bg-secondary/40 border-border/40 h-11 text-sm w-full"
        />
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 flex-wrap mb-0 border-b border-border/40 pb-0">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={cn(
              'px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-[1px]',
              activeSection === sec.id
                ? 'text-primary border-b-primary bg-primary/5'
                : 'text-muted-foreground border-b-transparent hover:text-foreground hover:bg-secondary/30'
            )}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <Card className="glass-card rounded-t-none border-t-0">
          <CardContent className="py-12 text-center text-muted-foreground">Loading funds...</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="glass-card rounded-t-none border-t-0">
          <CardContent className="py-12 text-center text-muted-foreground">No funds match your filters.</CardContent>
        </Card>
      ) : (
        <div className="rounded-b-xl border border-border/40 border-t-0 overflow-hidden bg-card/60 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead className="w-8 sticky left-0 bg-secondary/80 z-10" />
                  <TableHead
                    className="sticky left-8 bg-secondary/80 z-10 min-w-[220px] cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    <span className="flex items-center gap-1">Fund Name <SortIcon col="name" /></span>
                  </TableHead>
                  {currentSection.columns.map((col) => {
                    const sortable = ['amc', 'expenseRatio', 'aum', 'riskLevel', 'cagr1Y', 'cagr3Y', 'cagr5Y'].includes(col.key);
                    return (
                      <TableHead
                        key={col.key}
                        className={cn(
                          'whitespace-nowrap',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          sortable && 'cursor-pointer select-none'
                        )}
                        onClick={sortable ? () => handleSort(col.key as SortKey) : undefined}
                      >
                        <span className={cn('flex items-center gap-1', col.align === 'right' && 'justify-end', col.align === 'center' && 'justify-center')}>
                          {col.label}
                          {sortable && <SortIcon col={col.key as SortKey} />}
                        </span>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((fund) => (
                  <TableRow key={fund.id} className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => onFundClick(fund)}>
                    <TableCell className="sticky left-0 bg-card/90 z-10 px-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onBookmarkToggle(fund); }}
                        className="p-1 hover:bg-secondary/50 rounded"
                      >
                        <Bookmark className={cn('h-4 w-4', isInWatchlist(fund.id) ? 'fill-primary text-primary' : 'text-muted-foreground')} />
                      </button>
                    </TableCell>
                    <TableCell className="sticky left-8 bg-card/90 z-10 font-medium text-sm max-w-[240px]">
                      <span className="line-clamp-2">{fund.name}</span>
                    </TableCell>
                    {currentSection.columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'text-sm whitespace-nowrap',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center'
                        )}
                      >
                        {renderCellValue(fund, col)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
