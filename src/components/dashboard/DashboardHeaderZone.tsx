import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Info } from 'lucide-react';
import { MutualFund } from '@/types/mutualFund';

interface DashboardHeaderZoneProps {
  firstName: string | null | undefined;
  /** Kept for backward compat — unused since search now navigates to /search */
  globalSearch?: string;
  onGlobalSearchChange?: (value: string) => void;
  globalFilteredFunds?: MutualFund[];
  onFundClick?: (fund: MutualFund) => void;
  showSearch?: boolean;
  showInfoText?: boolean;
  showGreeting?: boolean;
}

const subtexts = [
  "Let's make informed decisions for your financial goals.",
  "Here's a curated view of funds aligned with your goals.",
  "Track, compare, and grow your investments with clarity.",
];

export function DashboardHeaderZone({
  firstName,
  showSearch = true,
  showInfoText = true,
  showGreeting = true,
}: DashboardHeaderZoneProps) {
  const navigate = useNavigate();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const subtext = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return subtexts[dayOfYear % subtexts.length];
  }, []);

  const displayName = firstName || 'there';

  if (!showGreeting && !showSearch) {
    return null;
  }

  return (
    <div className="relative mb-8">
      <div className="relative bg-gradient-to-b from-card/40 via-card/20 to-transparent rounded-xl px-6 py-8 border border-border/10">
        {showGreeting && (
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-2">
              {greeting}, {displayName}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">{subtext}</p>
          </div>
        )}

        {/* YouTube-style search trigger — opens dedicated /search page */}
        {showSearch && (
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="group relative w-full text-left"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <div className="pl-12 pr-4 h-12 flex items-center rounded-md bg-secondary/40 border border-border/40 text-base text-muted-foreground group-hover:bg-secondary/60 group-hover:border-white/20 transition-all">
              Search mutual funds by name or AMC...
            </div>
          </button>
        )}

        {showInfoText && showGreeting && (
          <p className="text-sm text-muted-foreground/80 mt-4 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Funds shown are based on your risk profile and goals.</span>
          </p>
        )}
      </div>
    </div>
  );
}

