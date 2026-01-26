import { cn } from '@/lib/utils';
import logoImage from '@/assets/50stacks-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FundexLogo({ size = 'md', className }: LogoProps) {
  const sizeClasses = {
    sm: 'h-12',
    md: 'h-20',
    lg: 'h-28',
  };

  return (
    <img 
      src={logoImage} 
      alt="50Stacks Logo" 
      className={cn('object-contain', sizeClasses[size], className)}
    />
  );
}
