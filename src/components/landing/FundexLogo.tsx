import { cn } from '@/lib/utils';
import logoImage from '@/assets/50stacks-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function FundexLogo({ size = 'md', showText = true, className }: LogoProps) {
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-18 w-18',
  };

  const textSizeClasses = {
    sm: 'text-3xl',
    md: 'text-4xl',
    lg: 'text-5xl',
  };

  return (
    <div className={cn('flex items-center gap-0', className)}>
      {/* Money Bag Logo */}
      <img 
        src={logoImage} 
        alt="50Stacks Logo" 
        className={cn('object-contain', sizeClasses[size])}
      />

      {showText && (
        <span className={cn(
          'tracking-normal font-medium',
          textSizeClasses[size],
          'text-foreground'
        )}
        style={{ fontFamily: "'Sacramento', cursive" }}
        >
          50Stacks
        </span>
      )}
    </div>
  );
}
