import { LayoutGrid, PieChart, Bookmark, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  watchlistCount: number;
  portfolioCount: number;
}

const navItems = [
  { id: 'overview', label: 'Home', icon: LayoutGrid },
  { id: 'sectors', label: 'Sectors', icon: PieChart },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet },
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
    <aside className="w-20 shrink-0 bg-sidebar-background/60 backdrop-blur-sm hidden lg:flex flex-col items-center border-r border-sidebar-border/30">
      {/* Vertically centered navigation group */}
      <nav className="flex-1 flex flex-col justify-center py-8">
        <div className="space-y-2">
          {navItems.map((item) => {
            const count = getCount(item.id);
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center w-14 h-14 rounded-xl text-xs font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 mb-1",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="text-[10px] leading-tight">{item.label}</span>
                {count > 0 && (
                  <span className={cn(
                    "absolute -top-0.5 -right-0.5 px-1.5 py-0.5 text-[9px] rounded-full min-w-[16px] text-center",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted-foreground/20 text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
