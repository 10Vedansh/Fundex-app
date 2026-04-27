import { useState, useMemo, useRef } from 'react';
import { MutualFund, AssetClass, CATEGORY_LABELS } from '@/types/mutualFund';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  ChevronRight,
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
  Equity: ['Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap', 'Multi Cap', 'ELSS', 'Sectoral / Thematic', 'Index Funds', 'International'],
  Debt: ['Liquid', 'Ultra Short Duration', 'Short Duration', 'Medium Duration', 'Long Duration', 'Corporate Bond', 'Credit Risk', 'Gilt', 'Dynamic Bond'],
  Commodities: ['Gold Funds', 'Silver Funds'],
  Hybrid: ['Aggressive Hybrid', 'Conservative Hybrid', 'Balanced Advantage', 'Arbitrage', 'Multi Asset Allocation'],
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

function getSubCategory(fund: MutualFund): string {
  const cat = fund.category || '';
  const label = CATEGORY_LABELS[cat];
  if (label) return label;
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

const fmt = (v: number | null | undefined, suffix = '') => {
  if (v == null || v === 0) return 'NA';
  return `${v > 0 && suffix === '%' ? '+' : ''}${v.toFixed(suffix === '%' ? 1 : 2)}${suffix}`;
};
const fmtCr = (v: number | null | undefined) => {
  if (v == null || v === 0) return 'NA';
  return `₹${v.toLocaleString()}`;
};

const SECTIONS: SectionDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    columns: [
      { key: 'expenseRatio', label: 'Expense', align: 'right', render: (f) => fmt(f.expenseRatio, '%') },
      { key: 'aum', label: 'AUM (Cr)', align: 'right', render: (f) => fmtCr(f.aum) },
      { key: 'riskLevel', label: 'Risk', align: 'center', render: (f) => f.riskLevel },
      { key: 'cagr1Y', label: '1Y', align: 'right', render: (f) => fmt(f.ret1Y ?? f.cagr1Y, '%') },
      { key: 'cagr3Y', label: '3Y', align: 'right', render: (f) => fmt(f.ret3Y ?? f.cagr3Y, '%') },
      { key: 'cagr5Y', label: '5Y', align: 'right', render: (f) => fmt(f.ret5Y ?? f.cagr5Y, '%') },
    ],
  },
  {
    id: 'returns',
    label: 'Returns',
    columns: [
      { key: 'ret1M', label: '1M', align: 'right', render: (f) => fmt(f.ret1M, '%') },
      { key: 'ret3M', label: '3M', align: 'right', render: (f) => fmt(f.ret3M, '%') },
      { key: 'ret6M', label: '6M', align: 'right', render: (f) => fmt(f.ret6M, '%') },
      { key: 'cagr1Y', label: '1Y', align: 'right', render: (f) => fmt(f.ret1Y ?? f.cagr1Y, '%') },
      { key: 'cagr3Y', label: '3Y', align: 'right', render: (f) => fmt(f.ret3Y ?? f.cagr3Y, '%') },
      { key: 'cagr5Y', label: '5Y', align: 'right', render: (f) => fmt(f.ret5Y ?? f.cagr5Y, '%') },
    ],
  },
  {
    id: 'risk',
    label: 'Risk',
    columns: [
      { key: 'riskLevel', label: 'Risk', align: 'center', render: (f) => f.riskLevel },
      { key: 'stdDev', label: 'Std Dev', align: 'right', render: (f) => fmt(f.stdDev ?? f.volatility) },
      { key: 'beta', label: 'Beta', align: 'right', render: (f) => fmt(f.beta) },
      { key: 'sharpe', label: 'Sharpe', align: 'right', render: (f) => fmt(f.sharpeRatio) },
      { key: 'sortino', label: 'Sortino', align: 'right', render: (f) => fmt(f.sortinoRatio) },
      { key: 'alpha', label: 'Alpha', align: 'right', render: (f) => fmt(f.alpha) },
    ],
  },
  {
    id: 'nav',
    label: 'NAV',
    columns: [
      { key: 'nav', label: 'NAV', align: 'right', render: (f) => { const v = f.latestNav ?? f.nav; return v != null ? `₹${v.toFixed(2)}` : 'NA'; } },
      { key: 'previousNav', label: 'Prev NAV', align: 'right', render: (f) => f.previousNav != null ? `₹${f.previousNav.toFixed(2)}` : '--' },
      { key: 'high52W', label: '52W High', align: 'right', render: (f) => f.high52W != null ? `₹${f.high52W.toFixed(2)}` : '--' },
      { key: 'low52W', label: '52W Low', align: 'right', render: (f) => f.low52W != null ? `₹${f.low52W.toFixed(2)}` : '--' },
      { key: 'aum', label: 'AUM', align: 'right', render: (f) => fmtCr(f.aum) },
    ],
  },
  {
    id: 'fees',
    label: 'Fees',
    columns: [
      { key: 'expense', label: 'Expense', align: 'right', render: (f) => fmt(f.expenseRatio, '%') },
      { key: 'exitLoad', label: 'Exit Load', render: (f) => f.exitLoad || 'Nil' },
      { key: 'minInv', label: 'Min Inv', align: 'right', render: (f) => fmtCr(f.minInvestment) },
      { key: 'fundManager', label: 'Manager', render: (f) => f.fundManager || '--' },
    ],
  },
];

type SortKey = 'name' | 'amc' | 'expenseRatio' | 'aum' | 'riskLevel' | 'cagr1Y' | 'cagr3Y' | 'cagr5Y';

const INITIAL_VISIBLE = 15;
const LOAD_MORE_COUNT = 20;

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
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionTab>('overview');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('cagr1Y');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ key: string; startX: number; startW: number } | null>(null);

  // Mouse handlers for column resize
  const onResizeStart = (key: string, currentW: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startW: currentW };
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const next = Math.max(60, resizingRef.current.startW + delta);
      setColWidths((prev) => ({ ...prev, [resizingRef.current!.key]: next }));
    };
    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleAssetClassSelect = (ac: AssetClass) => {
    setSelectedAssetClass(ac);
    setSelectedSubCategory(null);
    setActiveSection('overview');
    setVisibleCount(INITIAL_VISIBLE);
  };

  const handleSubCategorySelect = (sc: string) => {
    setSelectedSubCategory(sc);
    setSearch('');
    setVisibleCount(INITIAL_VISIBLE);
  };

  const handleBack = () => {
    if (selectedSubCategory) {
      setSelectedSubCategory(null);
      setSearch('');
      setVisibleCount(INITIAL_VISIBLE);
    } else {
      setSelectedAssetClass(null);
      setSearch('');
    }
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

  // Count funds per sub-category within selected asset class
  const subCategoryCounts = useMemo(() => {
    if (!selectedAssetClass) return {};
    const acFunds = funds.filter((f) => getAssetClass(f) === selectedAssetClass);
    const counts: Record<string, number> = {};
    for (const sc of SUB_CATEGORIES[selectedAssetClass]) {
      counts[sc] = acFunds.filter((f) => matchesSubCategory(f, sc)).length;
    }
    return counts;
  }, [funds, selectedAssetClass]);

  const filtered = useMemo(() => {
    if (!selectedAssetClass || !selectedSubCategory) return [];
    let list = funds.filter((f) => getAssetClass(f) === selectedAssetClass);
    list = list.filter((f) => matchesSubCategory(f, selectedSubCategory));

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
  }, [funds, selectedAssetClass, selectedSubCategory, search, sortKey, sortDir]);

  const visibleFunds = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const returnColor = (val: number | null | undefined) => {
    if (val == null) return 'text-muted-foreground';
    return val >= 0 ? 'text-success' : 'text-destructive';
  };

  const renderCellValue = (fund: MutualFund, col: SectionDef['columns'][number]) => {
    const value = col.render(fund);
    if (['cagr1Y', 'cagr3Y', 'cagr5Y', 'ret1M', 'ret3M', 'ret6M', 'ret10Y', 'alpha'].includes(col.key)) {
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

  // ── Level 1: Asset class selection cards ──
  if (!selectedAssetClass) {
    return (
      <div className="animate-fade-in space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Explore All Funds</h2>
        <p className="text-sm text-muted-foreground">Select an asset class to browse mutual funds</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {ASSET_CLASSES.map((ac) => {
            const meta = ASSET_CLASS_META[ac];
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
                <div className="text-primary mb-2">{meta.icon}</div>
                <h3 className="text-xl font-bold text-foreground">{ac}</h3>
                <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
                <div className="mt-4 text-xs text-muted-foreground">
                  Browse categories →
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Level 2: Sub-category cards ──
  if (!selectedSubCategory) {
    const subCats = SUB_CATEGORIES[selectedAssetClass];
    return (
      <div className="animate-fade-in space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={handleBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="text-lg font-semibold text-foreground">{selectedAssetClass} — Choose Category</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-fr">
          {subCats.map((sc) => {
            const count = subCategoryCounts[sc] || 0;
            return (
              <button
                key={sc}
                onClick={() => handleSubCategorySelect(sc)}
                className={cn(
                  'min-h-[120px] p-6 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm transition-all duration-200 text-left group flex flex-col justify-between',
                  'hover:border-primary/40 hover:bg-primary/5 hover:shadow-md active:scale-[0.98]',
                  count === 0 && 'opacity-50 cursor-not-allowed'
                )}
                disabled={count === 0}
              >
                <h3 className="text-base font-semibold text-foreground leading-tight">{sc}</h3>
                <div className="flex items-center justify-end">
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }


  // ── Level 3: Table view ──
  return (
    <div className="animate-fade-in space-y-0">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={handleBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="text-lg font-semibold text-foreground">{selectedSubCategory}</h2>
        <span className="text-xs text-muted-foreground">({filtered.length} funds)</span>
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
      <div className="flex gap-0 mb-0 border-b border-border/40 pb-0">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-[1px] text-center',
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
        <div className="rounded-b-xl border border-border/40 border-t-0 overflow-x-auto bg-card/60 backdrop-blur-sm">
          <Table style={{ tableLayout: 'fixed', minWidth: '900px' }}>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                <TableHead className="w-8" style={{ width: 40 }} />
                <TableHead
                  className="cursor-pointer select-none relative group"
                  style={{ width: colWidths['__name'] ?? 240 }}
                  onClick={() => handleSort('name')}
                >
                  <span className="flex items-center gap-1">Fund <SortIcon col="name" /></span>
                  <span
                    onMouseDown={onResizeStart('__name', colWidths['__name'] ?? 240)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-primary/40 transition-colors"
                  />
                </TableHead>
                {currentSection.columns.map((col) => {
                  const sortable = ['amc', 'expenseRatio', 'aum', 'riskLevel', 'cagr1Y', 'cagr3Y', 'cagr5Y'].includes(col.key);
                  const w = colWidths[col.key] ?? 110;
                  return (
                    <TableHead
                      key={col.key}
                      className={cn(
                        'whitespace-nowrap text-xs relative group',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        sortable && 'cursor-pointer select-none'
                      )}
                      style={{ width: w }}
                      onClick={sortable ? () => handleSort(col.key as SortKey) : undefined}
                    >
                      <span className={cn('flex items-center gap-1', col.align === 'right' && 'justify-end', col.align === 'center' && 'justify-center')}>
                        {col.label}
                        {sortable && <SortIcon col={col.key as SortKey} />}
                      </span>
                      <span
                        onMouseDown={onResizeStart(col.key, w)}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-primary/40 transition-colors"
                      />
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleFunds.map((fund) => (
                <TableRow key={fund.id} className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => onFundClick(fund)}>
                  <TableCell className="px-2" style={{ width: 40 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onBookmarkToggle(fund); }}
                      className="p-1 hover:bg-secondary/50 rounded"
                    >
                      <Bookmark className={cn('h-4 w-4', isInWatchlist(fund.id) ? 'fill-primary text-primary' : 'text-muted-foreground')} />
                    </button>
                  </TableCell>
                  <TableCell className="font-medium text-xs" style={{ width: colWidths['__name'] ?? 240 }}>
                    <span className="line-clamp-2 break-words">{fund.name}</span>
                  </TableCell>
                  {currentSection.columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        'text-xs',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center'
                      )}
                      style={{ width: colWidths[col.key] ?? 110 }}
                    >
                      <div className="truncate">{renderCellValue(fund, col)}</div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Load More */}
          {hasMore && (
            <div className="p-4 text-center border-t border-border/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((c) => c + LOAD_MORE_COUNT)}
                className="text-xs"
              >
                Show More ({filtered.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
