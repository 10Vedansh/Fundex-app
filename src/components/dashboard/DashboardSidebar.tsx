import { LayoutGrid, PieChart, Bookmark, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FundexLogo } from '@/components/landing/FundexLogo';

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  watchlistCount: number;
  portfolioCount: number;
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'sectors', label: 'Sectors', icon: PieChart },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
  { id: 'portfolio', label: 'My Portfolio', icon: Wallet },
];

export function DashboardSidebar({ 
  activeTab, 
  onTabChange, 
  watchlistCount, 
  portfolioCount 
}: DashboardSidebarProps) {
  const getCount = (id: string) => {
    if (id === 'watchlist') return watchlistCount;
    if (id === 'portfolio') return portfolioCount;
    return 0;
  };

  return (
    <aside className="w-60 shrink-0 bg-sidebar-background/80 backdrop-blur-sm hidden lg:flex flex-col border-r border-sidebar-border/50 shadow-[1px_0_8px_-2px_hsl(var(--background)/0.5)]">
      {/* Logo at top */}
      <div className="p-5 border-b border-sidebar-border/30">
        <FundexLogo size="sm" />
      </div>
      
      {/* Vertically centered navigation group */}
      <nav className="flex-1 flex flex-col justify-center px-4">
        <div className="space-y-1.5">
          {navItems.map((item) => {
            const count = getCount(item.id);
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="flex-1 text-left">{item.label}</span>
                {count > 0 && (
                  <span className={cn(
                    "px-2 py-0.5 text-xs rounded-full",
                    isActive 
                      ? "bg-primary/20 text-primary" 
                      : "bg-sidebar-accent text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
      
      {/* Bottom spacer for visual balance */}
      <div className="p-5 border-t border-sidebar-border/30">
        <p className="text-xs text-muted-foreground/60 text-center">50Stacks v1.0</p>
      </div>
    </aside>
  );
}
