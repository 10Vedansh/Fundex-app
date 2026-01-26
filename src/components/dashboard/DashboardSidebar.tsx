import { LayoutGrid, PieChart, Bookmark, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <aside className="w-56 shrink-0 border-r border-border/50 bg-sidebar-background/50 backdrop-blur-sm hidden lg:block">
      <nav className="sticky top-[73px] p-4 space-y-1">
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
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
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
                    : "bg-secondary text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
