import { useState } from 'react';
import {
  LayoutGrid,
  ListFilter,
  Bookmark,
  Wallet,
  Briefcase,
  MoreHorizontal,
  PieChart,
  User,
  Sliders,
  Bell,
  HelpCircle,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { AccountModal } from './AccountModal';
import { PreferencesModal } from './PreferencesModal';
import { FAQModal } from './FAQModal';
import { NotificationsPopover } from './NotificationsPopover';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  watchlistCount: number;
  portfolioCount: number;
}

const primaryTabs = [
  { id: 'overview', label: 'Home', icon: LayoutGrid },
  { id: 'allfunds', label: 'All Funds', icon: ListFilter },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet },
  { id: 'build', label: 'Build', icon: Briefcase },
];

export function MobileBottomNav({
  activeTab,
  onTabChange,
  watchlistCount,
  portfolioCount,
}: MobileBottomNavProps) {
  const { unreadCount } = useNotifications();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  const getCount = (id: string) => {
    if (id === 'watchlist') return watchlistCount;
    if (id === 'portfolio') return portfolioCount;
    return 0;
  };

  const handleSignOut = async () => {
    setMoreOpen(false);
    await signOut();
    navigate('/');
  };

  const openFromMore = (open: () => void) => {
    setMoreOpen(false);
    // small delay so the sheet close animation doesn't fight the modal mount
    setTimeout(open, 120);
  };

  return (
    <>
      <nav
        className={cn(
          'lg:hidden fixed bottom-0 left-0 right-0 z-50',
          'bg-card/90 backdrop-blur-xl border-t border-border/40',
          'pb-[env(safe-area-inset-bottom)]'
        )}
      >
        <div className="grid grid-cols-6 h-14">
          {primaryTabs.map((item) => {
            const count = getCount(item.id);
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label={item.label}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full bg-primary" />
                )}
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </button>
            );
          })}

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 transition-colors',
                  moreOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="More"
              >
                <div className="relative">
                  <MoreHorizontal className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-[10px] font-medium leading-none">More</span>
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="rounded-t-2xl border-t border-border/40 bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
            >
              <SheetHeader>
                <SheetTitle>More</SheetTitle>
              </SheetHeader>

              <div className="grid grid-cols-3 gap-3 py-4">
                <MoreItem
                  icon={Sparkles}
                  label="Auctus AI"
                  onClick={() => {
                    onTabChange('ai');
                    setMoreOpen(false);
                  }}
                />
                <MoreItem
                  icon={PieChart}
                  label="Sectors"
                  onClick={() => {
                    onTabChange('sectors');
                    setMoreOpen(false);
                  }}
                />
                <MoreItem
                  icon={User}
                  label="My Account"
                  onClick={() => openFromMore(() => setAccountOpen(true))}
                />
                <MoreItem
                  icon={Sliders}
                  label="Preferences"
                  onClick={() => openFromMore(() => setPrefsOpen(true))}
                />
                <NotificationsPopover>
                  <button
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border/40 bg-secondary/40 hover:bg-secondary/70 transition-colors"
                  >
                    <div className="relative">
                      <Bell className="h-5 w-5 text-foreground" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-xs font-medium">Notifications</span>
                  </button>
                </NotificationsPopover>
                <MoreItem
                  icon={HelpCircle}
                  label="Help & FAQ"
                  onClick={() => openFromMore(() => setFaqOpen(true))}
                />
                <MoreItem
                  icon={LogOut}
                  label="Sign Out"
                  destructive
                  onClick={handleSignOut}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Modals reused from desktop header */}
      <AccountModal isOpen={accountOpen} onClose={() => setAccountOpen(false)} />
      <PreferencesModal isOpen={prefsOpen} onClose={() => setPrefsOpen(false)} />
      <FAQModal isOpen={faqOpen} onClose={() => setFaqOpen(false)} />
    </>
  );
}

function MoreItem({
  icon: Icon,
  label,
  onClick,
  destructive,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  badge?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border/40 bg-secondary/40 hover:bg-secondary/70 transition-colors',
        destructive && 'text-destructive hover:bg-destructive/10'
      )}
    >
      <div className="relative">
        <Icon className={cn('h-5 w-5', !destructive && 'text-foreground')} />
        {badge && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
