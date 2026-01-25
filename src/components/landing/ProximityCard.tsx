import { useState, useEffect, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ProximityCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export function ProximityCard({ children, className, intensity = 0.02 }: ProximityCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;
      const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
      
      // Only respond within 200px radius
      const maxDistance = 200;
      if (distance < maxDistance) {
        const factor = 1 - (distance / maxDistance);
        setTransform({
          x: distanceX * intensity * factor,
          y: distanceY * intensity * factor,
          scale: 1 + (factor * 0.01)
        });
      } else {
        setTransform({ x: 0, y: 0, scale: 1 });
      }
    };

    const handleMouseLeave = () => {
      setTransform({ x: 0, y: 0, scale: 1 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [intensity]);

  return (
    <div
      ref={cardRef}
      className={cn(className)}
      style={{
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transition: 'transform 200ms ease-out'
      }}
    >
      {children}
    </div>
  );
}
