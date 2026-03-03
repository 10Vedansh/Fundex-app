import { LayoutGrid, PieChart, Bookmark, Wallet, ListFilter, Bot, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  watchlistCount: number;
  portfolioCount: number;
}

const navItems = [
  { id: 'overview', label: 'Home', icon: LayoutGrid },
  { id: 'allfunds', label: 'All Funds', icon: ListFilter },
  { id: 'sectors', label: 'Sectors', icon: PieChart },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet },
  { id: 'build', label: 'Build', icon: Briefcase },
  { id: 'ai', label: 'AI', icon: Bot },
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
    <aside className="w-24 shrink-0 bg-sidebar-background/80 backdrop-blur-md hidden lg:flex flex-col items-center border-r border-sidebar-border/40 fixed left-0 top-[73px] bottom-0 z-40">
      {/* Vertically centered navigation group */}
      <nav className="flex-1 flex flex-col justify-center py-8 w-full px-2">
        <div className="flex flex-col items-center gap-5">
          {navItems.map((item) => {
            const count = getCount(item.id);
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center w-[76px] h-[60px] rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 mb-1",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="text-[11px] leading-tight font-medium">{item.label}</span>
                {count > 0 && (
                  <span className={cn(
                    "absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] rounded-full min-w-[18px] text-center font-semibold",
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
