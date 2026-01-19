import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface FundexLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function FundexLogo({ size = 'md', showText = true, className }: FundexLogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  const iconSizeClasses = {
    sm: 16,
    md: 20,
    lg: 28,
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* Uprising Graph Logo */}
      <div className={cn('relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/90 to-accent', sizeClasses[size])}>
        <TrendingUp 
          size={iconSizeClasses[size]} 
          className="text-primary-foreground" 
          strokeWidth={2.5}
        />
      </div>

      {showText && (
        <span className={cn(
          'font-bold tracking-tight',
          textSizeClasses[size],
          'bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent'
        )}>
          Fundex
        </span>
      )}
    </div>
  );
}
