import { cn } from '@/lib/utils';
import logoImage from '@/assets/50stacks-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function FundexLogo({ size = 'md', showText = true, className }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  const textSizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Money Bag Logo */}
      <img 
        src={logoImage} 
        alt="50Stacks Logo" 
        className={cn('object-contain', sizeClasses[size])}
      />

      {showText && (
        <span className={cn(
          'tracking-normal',
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
