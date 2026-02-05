import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, TrendingUp, AlertTriangle, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationsPopoverProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    title: 'Welcome to CIFRAA!',
    message: 'Your account is set up. Start exploring mutual funds tailored to your profile.',
    time: 'Just now',
    read: false,
  },
  {
    id: '2',
    type: 'info',
    title: 'Market Update',
    message: 'Daily NAV data has been refreshed. Check your watchlist for the latest values.',
    time: '2h ago',
    read: false,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Complete Your Profile',
    message: 'Update your investment preferences for better fund recommendations.',
    time: '1d ago',
    read: true,
  },
];

export function NotificationsPopover({ children }: NotificationsPopoverProps) {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-primary h-auto p-1"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={cn(
                  "w-full p-4 text-left border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors",
                  !notification.read && "bg-primary/5"
                )}
              >
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        !notification.read && "text-foreground"
                      )}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {notification.time}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
