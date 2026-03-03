import { LayoutGrid, PieChart, Bookmark, Wallet, ListFilter, Bot, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  watchlistCount: number;
  portfolioCount: number;
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'allfunds', label: 'All Funds', icon: ListFilter },
  { id: 'sectors', label: 'Sectors', icon: PieChart },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet },
  { id: 'build', label: 'Build', icon: Briefcase },
  { id: 'ai', label: 'AI', icon: Bot },
];

export function MobileNavTabs({ 
  activeTab, 
  onTabChange, 
  watchlistCount, 
  portfolioCount 
}: MobileNavTabsProps) {
  const getCount = (id: string) => {
    if (id === 'watchlist') return watchlistCount;
    if (id === 'portfolio') return portfolioCount;
    return 0;
  };

  return (
    <div className="lg:hidden overflow-x-auto pb-2 -mx-4 px-4">
      <div className="flex gap-2 min-w-max">
        {navItems.map((item) => {
          const count = getCount(item.id);
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground bg-secondary/50 hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 text-xs rounded-full",
                  isActive 
                    ? "bg-primary/20 text-primary" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
