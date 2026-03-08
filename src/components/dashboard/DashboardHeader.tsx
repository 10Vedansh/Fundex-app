import { useState } from 'react';
import { RefreshCw, LogOut, User, Settings, Sliders, Bell, HelpCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { FundexLogo } from '@/components/landing/FundexLogo';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AccountModal } from './AccountModal';
import { PreferencesModal } from './PreferencesModal';
import { FAQModal } from './FAQModal';
import { NotificationsPopover } from './NotificationsPopover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DashboardHeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function DashboardHeader({ onRefresh, isLoading }: DashboardHeaderProps) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [isFAQModalOpen, setIsFAQModalOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              {/* Logo - navigates to dashboard when authenticated */}
              <Link to="/dashboard" className="flex items-center">
                <FundexLogo size="md" className="!h-20" />
              </Link>
            </div>
            
            <div className="flex items-center gap-3">
              {/* FAQ Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-11 w-11 rounded-full"
                      onClick={() => setIsFAQModalOpen(true)}
                    >
                      <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Help & FAQ</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Notifications Button */}
              <NotificationsPopover>
                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full relative">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full" />
                  )}
                </Button>
              </NotificationsPopover>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-11 w-11 rounded-full">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                        <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        {profile?.full_name && (
                          <p className="font-medium">{profile.full_name}</p>
                        )}
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setIsAccountModalOpen(true)} 
                      className="cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4" />
                      My Account
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setIsPreferencesModalOpen(true)} 
                      className="cursor-pointer"
                    >
                      <Sliders className="mr-2 h-4 w-4" />
                      Preferences
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => navigate('/auth')}
                  className="gap-2 gradient-primary text-primary-foreground"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Login</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      <AccountModal 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)} 
      />
      <PreferencesModal 
        isOpen={isPreferencesModalOpen} 
        onClose={() => setIsPreferencesModalOpen(false)} 
      />
      <FAQModal
        isOpen={isFAQModalOpen}
        onClose={() => setIsFAQModalOpen(false)}
      />
    </>
  );
}
