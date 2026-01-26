import { cn } from '@/lib/utils';
import logoImage from '@/assets/50stacks-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FundexLogo({ size = 'md', className }: LogoProps) {
  const sizeClasses = {
    sm: 'h-24',
    md: 'h-36',
    lg: 'h-48',
  };

  return (
    <img 
      src={logoImage} 
      alt="50Stacks Logo" 
      className={cn('object-contain', sizeClasses[size], className)}
    />
  );
}
