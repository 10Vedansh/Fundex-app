import { useEffect, useRef, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'blur';
  delay?: number;
  duration?: number;
  threshold?: number;
}

export function ScrollReveal({
  children,
  className,
  animation = 'fade-up',
  delay = 0,
  duration = 600,
  threshold = 0.1,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Reset and replay animation on scroll up/down
        setIsVisible(entry.isIntersecting);
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  const getAnimationStyles = () => {
    const baseTransition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out, filter ${duration}ms ease-out`;
    
    const animations = {
      'fade-up': {
        hidden: { opacity: 0, transform: 'translateY(40px)' },
        visible: { opacity: 1, transform: 'translateY(0)' },
      },
      'fade-down': {
        hidden: { opacity: 0, transform: 'translateY(-40px)' },
        visible: { opacity: 1, transform: 'translateY(0)' },
      },
      'fade-left': {
        hidden: { opacity: 0, transform: 'translateX(-40px)' },
        visible: { opacity: 1, transform: 'translateX(0)' },
      },
      'fade-right': {
        hidden: { opacity: 0, transform: 'translateX(40px)' },
        visible: { opacity: 1, transform: 'translateX(0)' },
      },
      'scale': {
        hidden: { opacity: 0, transform: 'scale(0.9)' },
        visible: { opacity: 1, transform: 'scale(1)' },
      },
      'blur': {
        hidden: { opacity: 0, filter: 'blur(10px)', transform: 'translateY(20px)' },
        visible: { opacity: 1, filter: 'blur(0)', transform: 'translateY(0)' },
      },
    };

    const state = isVisible ? animations[animation].visible : animations[animation].hidden;
    
    return {
      ...state,
      transition: baseTransition,
      transitionDelay: `${delay}ms`,
    };
  };

  return (
    <div ref={ref} className={cn(className)} style={getAnimationStyles()}>
      {children}
    </div>
  );
}
