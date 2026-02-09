import { useState, useMemo } from 'react';
import { MutualFund } from '@/types/mutualFund';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ArrowUpDown,
  Bookmark,
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

const SUB_CATEGORIES: Record<AssetClass, string[]> = {
  Equity: [
    'All',
    'Large Cap',
    'Mid Cap',
    'Small Cap',
    'Flexi Cap',
    'Multi Cap',
    'ELSS',
    'Sectoral / Thematic',
    'Index Funds',
    'International Equity',
  ],
  Debt: [
    'All',
    'Liquid',
    'Ultra Short Duration',
    'Short Duration',
    'Medium Duration',
    'Long Duration',
    'Corporate Bond',
    'Credit Risk',
    'Gilt',
    'Dynamic Bond',
  ],
  Commodities: ['All', 'Gold Funds', 'Silver Funds', 'Commodity ETFs'],
  Hybrid: [
    'All',
    'Aggressive Hybrid',
    'Conservative Hybrid',
    'Balanced Advantage',
    'Arbitrage',
    'Multi Asset Allocation',
  ],
};

// Map existing fund categories to the new taxonomy
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

// Expandable column group definitions
type ColumnGroup = 'returns' | 'risk' | 'nav' | 'fees';

interface ColumnGroupDef {
  id: ColumnGroup;
  label: string;
  columns: { key: string; label: string; render: (f: MutualFund) => string }[];
}

const COLUMN_GROUPS: ColumnGroupDef[] = [
  {
    id: 'returns',
    label: '📈 Returns',
    columns: [
      { key: '1y', label: '1Y', render: (f) => `${f.cagr1Y.toFixed(1)}%` },
      { key: '3y', label: '3Y CAGR', render: (f) => `${f.cagr3Y.toFixed(1)}%` },
      { key: '5y', label: '5Y CAGR', render: (f) => `${f.cagr5Y.toFixed(1)}%` },
      { key: 'alpha', label: 'Alpha', render: (f) => f.alpha.toFixed(2) },
      { key: 'benchmark', label: 'Benchmark', render: (f) => f.benchmark },
    ],
  },
  {
    id: 'risk',
    label: '🧠 Risk',
    columns: [
      { key: 'riskLevel', label: 'Risk Level', render: (f) => f.riskLevel },
      { key: 'volatility', label: 'Volatility', render: (f) => `${f.volatility.toFixed(1)}%` },
      { key: 'beta', label: 'Beta', render: (f) => f.beta.toFixed(2) },
      { key: 'sharpe', label: 'Sharpe', render: (f) => f.sharpeRatio.toFixed(2) },
    ],
  },
  {
    id: 'nav',
    label: '💰 NAV',
    columns: [
      { key: 'nav', label: 'Current NAV', render: (f) => `₹${f.nav.toFixed(2)}` },
    ],
  },
  {
    id: 'fees',
    label: '🧾 Fees & Details',
    columns: [
      { key: 'expense', label: 'Expense Ratio', render: (f) => `${f.expenseRatio.toFixed(2)}%` },
      { key: 'exitLoad', label: 'Exit Load', render: (f) => f.exitLoad },
      { key: 'minInv', label: 'Min Investment', render: (f) => `₹${f.minInvestment.toLocaleString()}` },
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
  const [assetClass, setAssetClass] = useState<AssetClass>('Equity');
  const [subCategory, setSubCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('cagr1Y');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedGroups, setExpandedGroups] = useState<Set<ColumnGroup>>(new Set());

  // Reset sub-category when asset class changes
  const handleAssetClassChange = (ac: AssetClass) => {
    setAssetClass(ac);
    setSubCategory('All');
  };

  const toggleGroup = (g: ColumnGroup) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
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

  // Filter + sort
  const filtered = useMemo(() => {
    let list = funds.filter((f) => mapFundToAssetClass(f) === assetClass);

    // Sub-category is informational mapping (mock data doesn't have sub-cats)
    // For now "All" shows everything in the asset class

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (f) => f.name.toLowerCase().includes(q) || f.amc.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let va: number | string = 0,
        vb: number | string = 0;
      switch (sortKey) {
        case 'name':
          va = a.name;
          vb = b.name;
          break;
        case 'amc':
          va = a.amc;
          vb = b.amc;
          break;
        case 'expenseRatio':
          va = a.expenseRatio;
          vb = b.expenseRatio;
          break;
        case 'aum':
          va = a.aum;
          vb = b.aum;
          break;
        case 'riskLevel':
          va = a.riskLevel;
          vb = b.riskLevel;
          break;
        case 'cagr1Y':
          va = a.cagr1Y;
          vb = b.cagr1Y;
          break;
        case 'cagr3Y':
          va = a.cagr3Y;
          vb = b.cagr3Y;
          break;
        case 'cagr5Y':
          va = a.cagr5Y;
          vb = b.cagr5Y;
          break;
      }
      if (typeof va === 'string') {
        const cmp = va.localeCompare(vb as string);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });

    return list;
  }, [funds, assetClass, search, sortKey, sortDir]);

  const riskColor = (level: string) => {
    switch (level) {
      case 'Low':
        return 'text-success';
      case 'Moderate':
        return 'text-warning';
      case 'High':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const returnColor = (val: number) => (val >= 0 ? 'text-success' : 'text-destructive');

  // Count visible primary columns + expanded group columns
  const expandedColCount = COLUMN_GROUPS.reduce(
    (sum, g) => sum + (expandedGroups.has(g.id) ? g.columns.length : 0),
    0
  );

  return (
    <div className="animate-fade-in space-y-5">
      {/* Asset class tabs */}
      <div className="flex gap-2 flex-wrap">
        {ASSET_CLASSES.map((ac) => (
          <button
            key={ac}
            onClick={() => handleAssetClassChange(ac)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
              assetClass === ac
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
            )}
          >
            {ac}
          </button>
        ))}
      </div>

      {/* Sub-category pills */}
      <div className="flex gap-2 flex-wrap">
        {SUB_CATEGORIES[assetClass].map((sc) => (
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
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by fund name or AMC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-secondary/50 border-border/50"
        />
      </div>

      {/* Expandable group toggles */}
      <div className="flex gap-2 flex-wrap">
        {COLUMN_GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => toggleGroup(g.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              expandedGroups.has(g.id)
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-secondary/30 text-muted-foreground border-border/30 hover:bg-secondary/60'
            )}
          >
            {expandedGroups.has(g.id) ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {g.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} fund{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Table */}
      {isLoading ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">Loading funds...</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            No funds match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border/40 overflow-hidden bg-card/60 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead className="w-8 sticky left-0 bg-secondary/80 z-10" />
                  <TableHead
                    className="sticky left-8 bg-secondary/80 z-10 min-w-[240px] cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    <span className="flex items-center gap-1">
                      Fund Name <SortIcon col="name" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none min-w-[140px]"
                    onClick={() => handleSort('amc')}
                  >
                    <span className="flex items-center gap-1">
                      AMC <SortIcon col="amc" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right"
                    onClick={() => handleSort('expenseRatio')}
                  >
                    <span className="flex items-center gap-1 justify-end">
                      Expense <SortIcon col="expenseRatio" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right"
                    onClick={() => handleSort('aum')}
                  >
                    <span className="flex items-center gap-1 justify-end">
                      AUM (Cr) <SortIcon col="aum" />
                    </span>
                  </TableHead>
                  <TableHead className="text-center">Risk</TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right"
                    onClick={() => handleSort('cagr1Y')}
                  >
                    <span className="flex items-center gap-1 justify-end">
                      1Y <SortIcon col="cagr1Y" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right"
                    onClick={() => handleSort('cagr3Y')}
                  >
                    <span className="flex items-center gap-1 justify-end">
                      3Y <SortIcon col="cagr3Y" />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right"
                    onClick={() => handleSort('cagr5Y')}
                  >
                    <span className="flex items-center gap-1 justify-end">
                      5Y <SortIcon col="cagr5Y" />
                    </span>
                  </TableHead>

                  {/* Expanded group headers */}
                  {COLUMN_GROUPS.filter((g) => expandedGroups.has(g.id)).map((g) =>
                    g.columns.map((col) => (
                      <TableHead key={`${g.id}-${col.key}`} className="text-right whitespace-nowrap">
                        {col.label}
                      </TableHead>
                    ))
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((fund) => (
                  <TableRow
                    key={fund.id}
                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => onFundClick(fund)}
                  >
                    {/* Bookmark */}
                    <TableCell className="sticky left-0 bg-card/90 z-10 px-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookmarkToggle(fund);
                        }}
                        className="p-1 hover:bg-secondary/50 rounded"
                      >
                        <Bookmark
                          className={cn(
                            'h-4 w-4',
                            isInWatchlist(fund.id)
                              ? 'fill-primary text-primary'
                              : 'text-muted-foreground'
                          )}
                        />
                      </button>
                    </TableCell>

                    {/* Fund name */}
                    <TableCell className="sticky left-8 bg-card/90 z-10 font-medium text-sm max-w-[260px]">
                      <span className="line-clamp-2">{fund.name}</span>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">{fund.amc}</TableCell>

                    <TableCell className="text-right text-sm">
                      {fund.expenseRatio.toFixed(2)}%
                    </TableCell>

                    <TableCell className="text-right text-sm">
                      ₹{fund.aum.toLocaleString()}
                    </TableCell>

                    <TableCell className="text-center">
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
                    </TableCell>

                    <TableCell className={cn('text-right text-sm font-medium', returnColor(fund.cagr1Y))}>
                      {fund.cagr1Y > 0 ? '+' : ''}
                      {fund.cagr1Y.toFixed(1)}%
                    </TableCell>
                    <TableCell className={cn('text-right text-sm font-medium', returnColor(fund.cagr3Y))}>
                      {fund.cagr3Y > 0 ? '+' : ''}
                      {fund.cagr3Y.toFixed(1)}%
                    </TableCell>
                    <TableCell className={cn('text-right text-sm font-medium', returnColor(fund.cagr5Y))}>
                      {fund.cagr5Y > 0 ? '+' : ''}
                      {fund.cagr5Y.toFixed(1)}%
                    </TableCell>

                    {/* Expanded group data */}
                    {COLUMN_GROUPS.filter((g) => expandedGroups.has(g.id)).map((g) =>
                      g.columns.map((col) => (
                        <TableCell
                          key={`${g.id}-${col.key}`}
                          className="text-right text-sm text-muted-foreground whitespace-nowrap"
                        >
                          {col.render(fund)}
                        </TableCell>
                      ))
                    )}
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
