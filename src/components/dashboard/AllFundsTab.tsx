import { useState, useMemo } from 'react';
import { MutualFund } from '@/types/mutualFund';
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
  Receipt,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

// ── Category / Sub-category taxonomy ──────────────────────────
const ASSET_CLASSES = ['Equity', 'Debt', 'Commodities', 'Hybrid'] as const;
type AssetClass = (typeof ASSET_CLASSES)[number];

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
  Equity: ['All', 'Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap', 'Multi Cap', 'ELSS', 'Sectoral / Thematic', 'Index Funds', 'International Equity'],
  Debt: ['All', 'Liquid', 'Ultra Short Duration', 'Short Duration', 'Medium Duration', 'Long Duration', 'Corporate Bond', 'Credit Risk', 'Gilt', 'Dynamic Bond'],
  Commodities: ['All', 'Gold Funds', 'Silver Funds', 'Commodity ETFs'],
  Hybrid: ['All', 'Aggressive Hybrid', 'Conservative Hybrid', 'Balanced Advantage', 'Arbitrage', 'Multi Asset Allocation'],
};

function mapFundToAssetClass(fund: MutualFund): AssetClass | null {
  switch (fund.category) {
    case 'Equity':
    case 'Index':
      return 'Equity';
    case 'Debt':
    case 'Liquid':
      return 'Debt';
    case 'Hybrid':
      return 'Hybrid';
    default:
      return null;
  }
}

// ── Section tab definitions ──────────────────────────
type SectionTab = 'overview' | 'returns' | 'risk' | 'nav' | 'fees';

interface SectionDef {
  id: SectionTab;
  label: string;
  columns: { key: string; label: string; align?: string; render: (f: MutualFund) => string }[];
}

const SECTIONS: SectionDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    columns: [
      { key: 'amc', label: 'AMC', render: (f) => f.amc },
      { key: 'category', label: 'Category', render: (f) => f.category },
      { key: 'expenseRatio', label: 'Expense', align: 'right', render: (f) => `${f.expenseRatio.toFixed(2)}%` },
      { key: 'aum', label: 'AUM (Cr)', align: 'right', render: (f) => `₹${f.aum.toLocaleString()}` },
      { key: 'riskLevel', label: 'Risk', align: 'center', render: (f) => f.riskLevel },
      { key: 'cagr1Y', label: '1Y Return', align: 'right', render: (f) => `${f.cagr1Y > 0 ? '+' : ''}${f.cagr1Y.toFixed(1)}%` },
      { key: 'cagr3Y', label: '3Y CAGR', align: 'right', render: (f) => `${f.cagr3Y > 0 ? '+' : ''}${f.cagr3Y.toFixed(1)}%` },
      { key: 'cagr5Y', label: '5Y CAGR', align: 'right', render: (f) => `${f.cagr5Y > 0 ? '+' : ''}${f.cagr5Y.toFixed(1)}%` },
    ],
  },
  {
    id: 'returns',
    label: 'Returns',
    columns: [
      { key: 'cagr1Y', label: '1Y Return', align: 'right', render: (f) => `${f.cagr1Y > 0 ? '+' : ''}${f.cagr1Y.toFixed(1)}%` },
      { key: 'cagr3Y', label: '3Y CAGR', align: 'right', render: (f) => `${f.cagr3Y > 0 ? '+' : ''}${f.cagr3Y.toFixed(1)}%` },
      { key: 'cagr5Y', label: '5Y CAGR', align: 'right', render: (f) => `${f.cagr5Y > 0 ? '+' : ''}${f.cagr5Y.toFixed(1)}%` },
      { key: 'alpha', label: 'Alpha', align: 'right', render: (f) => f.alpha.toFixed(2) },
      { key: 'benchmark', label: 'Benchmark', render: (f) => f.benchmark },
    ],
  },
  {
    id: 'risk',
    label: 'Risk',
    columns: [
      { key: 'riskLevel', label: 'Risk Level', align: 'center', render: (f) => f.riskLevel },
      { key: 'volatility', label: 'Volatility', align: 'right', render: (f) => `${f.volatility.toFixed(1)}%` },
      { key: 'beta', label: 'Beta', align: 'right', render: (f) => f.beta.toFixed(2) },
      { key: 'sharpe', label: 'Sharpe', align: 'right', render: (f) => f.sharpeRatio.toFixed(2) },
    ],
  },
  {
    id: 'nav',
    label: 'NAV',
    columns: [
      { key: 'nav', label: 'Current NAV', align: 'right', render: (f) => `₹${f.nav.toFixed(2)}` },
      { key: 'aum', label: 'AUM (Cr)', align: 'right', render: (f) => `₹${f.aum.toLocaleString()}` },
    ],
  },
  {
    id: 'fees',
    label: 'Fees & Details',
    columns: [
      { key: 'expense', label: 'Expense Ratio', align: 'right', render: (f) => `${f.expenseRatio.toFixed(2)}%` },
      { key: 'exitLoad', label: 'Exit Load', render: (f) => f.exitLoad },
      { key: 'minInv', label: 'Min Investment', align: 'right', render: (f) => `₹${f.minInvestment.toLocaleString()}` },
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
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-primary" />
    ) : (
      <ChevronDown className="h-3 w-3 text-primary" />
    );
  };

  const currentSection = SECTIONS.find((s) => s.id === activeSection)!;

  const filtered = useMemo(() => {
    if (!selectedAssetClass) return [];
    let list = funds.filter((f) => mapFundToAssetClass(f) === selectedAssetClass);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) => f.name.toLowerCase().includes(q) || f.amc.toLowerCase().includes(q)
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
        case 'cagr1Y': va = a.cagr1Y; vb = b.cagr1Y; break;
        case 'cagr3Y': va = a.cagr3Y; vb = b.cagr3Y; break;
        case 'cagr5Y': va = a.cagr5Y; vb = b.cagr5Y; break;
      }
      if (typeof va === 'string') {
        const cmp = va.localeCompare(vb as string);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

    return list;
  }, [funds, selectedAssetClass, search, sortKey, sortDir]);

  const returnColor = (val: number) => (val >= 0 ? 'text-success' : 'text-destructive');

  const renderCellValue = (fund: MutualFund, col: SectionDef['columns'][number]) => {
    const value = col.render(fund);
    // Color return values
    if (['cagr1Y', 'cagr3Y', 'cagr5Y'].includes(col.key)) {
      const num = col.key === 'cagr1Y' ? fund.cagr1Y : col.key === 'cagr3Y' ? fund.cagr3Y : fund.cagr5Y;
      return <span className={cn('font-medium', returnColor(num))}>{value}</span>;
    }
    if (col.key === 'riskLevel') {
      return (
        <Badge
          variant="outline"
          className={cn(
            'text-xs font-medium border-0',
            fund.riskLevel === 'Low' && 'bg-success/15 text-success',
            fund.riskLevel === 'Moderate' && 'bg-warning/15 text-warning',
            fund.riskLevel === 'High' && 'bg-destructive/15 text-destructive'
          )}
        >
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
            const count = funds.filter((f) => mapFundToAssetClass(f) === ac).length;
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

  // ── Table view for selected asset class ──
  return (
    <div className="animate-fade-in space-y-0">
      {/* Back button + asset class title */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
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

      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by fund name or AMC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 bg-secondary/40 border-border/40 h-11 text-sm w-full"
        />
      </div>

      {/* Section tabs (Overview / Returns / Risk / NAV / Fees) */}
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
          <CardContent className="py-12 text-center text-muted-foreground">
            No funds match your filters.
          </CardContent>
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
                  <TableRow
                    key={fund.id}
                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => onFundClick(fund)}
                  >
                    <TableCell className="sticky left-0 bg-card/90 z-10 px-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onBookmarkToggle(fund); }}
                        className="p-1 hover:bg-secondary/50 rounded"
                      >
                        <Bookmark
                          className={cn('h-4 w-4', isInWatchlist(fund.id) ? 'fill-primary text-primary' : 'text-muted-foreground')}
                        />
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
