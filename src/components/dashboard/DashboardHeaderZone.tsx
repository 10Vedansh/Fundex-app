import { useMemo } from 'react';
import { Search, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MutualFund } from '@/types/mutualFund';

interface DashboardHeaderZoneProps {
  firstName: string | null | undefined;
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  globalFilteredFunds: MutualFund[];
  onFundClick: (fund: MutualFund) => void;
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
  globalSearch,
  onGlobalSearchChange,
  globalFilteredFunds,
  onFundClick,
  showSearch = true,
  showInfoText = true,
  showGreeting = true,
}: DashboardHeaderZoneProps) {
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

  // If no greeting and no search, don't render the zone
  if (!showGreeting && !showSearch) {
    return null;
  }

  return (
    <div className="relative mb-8">
      {/* Header zone with subtle gradient background */}
      <div className="relative bg-gradient-to-b from-card/40 via-card/20 to-transparent rounded-xl px-6 py-8 border border-border/10">
        {/* Greeting Section - Only on Overview */}
        {showGreeting && (
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-2">
              {greeting}, {displayName}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              {subtext}
            </p>
          </div>
        )}

        {/* Global Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search mutual funds by name or AMC..."
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              className="pl-12 bg-secondary/40 border-border/40 h-12 text-base focus:bg-secondary/60 focus:border-primary/30 transition-all"
            />
            {globalSearch && globalFilteredFunds.length > 0 && (
              <Card className="absolute top-full left-0 right-0 mt-2 z-50 glass-card max-h-80 overflow-auto">
                <CardContent className="p-2">
                  {globalFilteredFunds.map(fund => (
                    <button
                      key={fund.id}
                      onClick={() => {
                        onFundClick(fund);
                        onGlobalSearchChange('');
                      }}
                      className="w-full p-3 text-left hover:bg-secondary/50 rounded-lg transition-colors"
                    >
                      <p className="font-medium text-sm">{fund.name}</p>
                      <p className="text-xs text-muted-foreground">{fund.amc} • {fund.category}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Informational Context */}
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
