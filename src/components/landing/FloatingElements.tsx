import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export function FloatingElements() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const circles = el.querySelectorAll('.floating-circle');
    
    circles.forEach((circle, i) => {
      gsap.to(circle, {
        y: `${20 + i * 10}`,
        x: `${10 + i * 5}`,
        duration: 4 + i,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.5,
      });
    });

    return () => {
      gsap.killTweensOf(circles);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large gradient orbs */}
      <div 
        className="floating-circle absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
        }}
      />
      <div 
        className="floating-circle absolute top-1/3 -left-48 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--chart-index) / 0.05) 0%, transparent 70%)',
        }}
      />
      <div 
        className="floating-circle absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--success) / 0.04) 0%, transparent 70%)',
        }}
      />
      
      {/* Grid lines */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border) / 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border) / 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  );
}
