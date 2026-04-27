import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search as SearchIcon, X, Clock, TrendingUp, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFundCache } from '@/hooks/useFundCache';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/hooks/useAuth';
import { MutualFund, CATEGORY_LABELS } from '@/types/mutualFund';
import { FundDetailModal } from '@/components/dashboard/FundDetailModal';
import { getCachedSectorData } from '@/utils/sectorDataGenerator';
import { cn } from '@/lib/utils';
import { DashboardBackground } from '@/components/dashboard/DashboardBackground';

const RECENTS_KEY = 'cifraa_recent_searches';
const MAX_RECENTS = 8;

function getRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function pushRecent(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return;
  const next = [trimmed, ...getRecents().filter((r) => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENTS);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

function clearRecents() {
  localStorage.removeItem(RECENTS_KEY);
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return 'NA';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function FundResultCard({
  fund,
  isBookmarked,
  onBookmarkToggle,
  onClick,
}: {
  fund: MutualFund;
  isBookmarked: boolean;
  onBookmarkToggle: (f: MutualFund) => void;
  onClick: () => void;
}) {
  const ret3Y = fund.ret3Y ?? fund.cagr3Y;
  const label = CATEGORY_LABELS[fund.category] || fund.category;
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:border-white/25 transition-colors bg-card/70 backdrop-blur-sm"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] border-white/15 text-muted-foreground">
                {label}
              </Badge>
              <span className="text-xs text-muted-foreground">{fund.amc}</span>
            </div>
            <h4 className="font-semibold text-sm md:text-base text-foreground line-clamp-2 leading-snug">
              {fund.name}
            </h4>

            <div className="flex items-center gap-5 mt-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">3Y CAGR</p>
                <p
                  className={cn(
                    'text-sm font-semibold',
                    ret3Y == null ? 'text-muted-foreground' : ret3Y >= 0 ? 'text-success' : 'text-destructive'
                  )}
                >
                  {fmtPct(ret3Y)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sharpe</p>
                <p className="text-sm font-semibold text-foreground">
                  {fund.sharpeRatio != null ? fund.sharpeRatio.toFixed(2) : 'NA'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expense</p>
                <p className="text-sm font-semibold text-foreground">
                  {fund.expenseRatio != null ? `${fund.expenseRatio.toFixed(2)}%` : 'NA'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookmarkToggle(fund);
            }}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Bookmark"
          >
            <Bookmark
              className={cn(
                'h-4 w-4 transition-colors',
                isBookmarked ? 'fill-foreground text-foreground' : 'text-muted-foreground'
              )}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialQuery = params.get('q') || '';
  const { user, isLoading: authLoading } = useAuth();
  const { funds } = useFundCache();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  const [query, setQuery] = useState(initialQuery);
  const [recents, setRecents] = useState<string[]>(getRecents);
  const [selectedFund, setSelectedFund] = useState<MutualFund | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Push to recents when query stabilizes
  useEffect(() => {
    if (!query.trim()) return;
    const t = setTimeout(() => {
      pushRecent(query);
      setRecents(getRecents());
    }, 800);
    return () => clearTimeout(t);
  }, [query]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return funds
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.amc.toLowerCase().includes(q) ||
          (f.fundManager && f.fundManager.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [query, funds]);

  // Trending = top 6 by 3Y CAGR (suggestions when no query)
  const trending = useMemo(() => {
    return [...funds]
      .filter((f) => (f.ret3Y ?? f.cagr3Y) != null)
      .sort((a, b) => (b.ret3Y ?? b.cagr3Y)! - (a.ret3Y ?? a.cagr3Y)!)
      .slice(0, 6);
  }, [funds]);

  const modalSectorData = useMemo(() => {
    if (!selectedFund) return null;
    return getCachedSectorData(selectedFund);
  }, [selectedFund]);

  return (
    <div className="min-h-screen bg-background relative">
      <DashboardBackground />

      {/* Search header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-3xl mx-auto flex items-center gap-2 px-3 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mutual funds, AMCs, fund managers..."
              className="w-full h-11 pl-10 pr-10 rounded-full bg-secondary/60 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 text-sm"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/5"
                aria-label="Clear"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-3 py-4 pb-32">
        {/* Empty state — recents + trending */}
        {!query.trim() && (
          <div className="space-y-8 animate-fade-in">
            {recents.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" /> Recent searches
                  </h3>
                  <button
                    onClick={() => {
                      clearRecents();
                      setRecents([]);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {recents.map((r) => (
                    <button
                      key={r}
                      onClick={() => setQuery(r)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 flex items-center gap-3 transition-colors"
                    >
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground">{r}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3 px-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" /> Top performers (3Y)
              </h3>
              <div className="space-y-2">
                {trending.map((f) => (
                  <FundResultCard
                    key={f.id}
                    fund={f}
                    isBookmarked={isInWatchlist(f.id)}
                    onBookmarkToggle={toggleWatchlist}
                    onClick={() => setSelectedFund(f)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Live results */}
        {query.trim() && (
          <div className="space-y-2 animate-fade-in">
            {results.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-sm">
                  No funds match <span className="text-foreground font-medium">"{query}"</span>
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground px-1 mb-2">
                  {results.length} result{results.length !== 1 && 's'}
                </p>
                {results.map((f) => (
                  <FundResultCard
                    key={f.id}
                    fund={f}
                    isBookmarked={isInWatchlist(f.id)}
                    onBookmarkToggle={toggleWatchlist}
                    onClick={() => setSelectedFund(f)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </main>

      <FundDetailModal
        fund={selectedFund}
        sectorData={modalSectorData}
        isOpen={!!selectedFund}
        onClose={() => setSelectedFund(null)}
        isBookmarked={selectedFund ? isInWatchlist(selectedFund.id) : false}
        onBookmarkToggle={toggleWatchlist}
      />
    </div>
  );
}
