import { useMemo } from 'react';

interface DashboardGreetingProps {
  firstName: string | null | undefined;
}

const subtexts = [
  "Let's make informed decisions for your financial goals.",
  "Here's a curated view of funds aligned with your goals.",
  "Track, compare, and grow your investments with clarity.",
];

export function DashboardGreeting({ firstName }: DashboardGreetingProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const subtext = useMemo(() => {
    // Pick a consistent subtext based on the day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return subtexts[dayOfYear % subtexts.length];
  }, []);

  const displayName = firstName || 'there';

  return (
    <div className="mb-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
        {greeting}, {displayName}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm md:text-base">
        {subtext}
      </p>
    </div>
  );
}
