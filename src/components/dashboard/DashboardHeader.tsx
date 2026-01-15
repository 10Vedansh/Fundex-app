import { useState } from 'react';
import { RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { LoginModal } from './LoginModal';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function DashboardHeader({ onRefresh, isLoading }: DashboardHeaderProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex flex-col">
                <h1 className="text-2xl font-bold text-foreground">FUNDEX</h1>
                <p className="text-xs text-muted-foreground">Decode Mutual Fund Performance.</p>
              </Link>
              
              {/* Navigation */}
              <nav className="hidden md:flex items-center gap-6">
                <Link 
                  to="/" 
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    location.pathname === '/' ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/founders" 
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    location.pathname === '/founders' ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  Know the Founders
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>Live Data</span>
              </div>
              
              {onRefresh && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              )}

              {/* Login Button */}
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setIsLoginModalOpen(true)}
                className="gap-2 gradient-primary text-primary-foreground"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </>
  );
}
