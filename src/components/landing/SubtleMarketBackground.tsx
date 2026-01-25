import { useEffect, useRef } from 'react';

export function SubtleMarketBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener('resize', resize);

    // Pre-generate static NAV curves (calculated once, not every frame)
    const generateCurve = (baseY: number, amplitude: number, points: number): number[] => {
      const curve: number[] = [];
      let value = baseY;
      for (let i = 0; i < points; i++) {
        value += (Math.random() - 0.48) * amplitude * 0.3;
        value = Math.max(baseY - amplitude, Math.min(baseY + amplitude, value));
        curve.push(value);
      }
      return curve;
    };

    const curves = [
      { points: generateCurve(height * 0.3, 30, 100), opacity: 0.06, speed: 0.2 },
      { points: generateCurve(height * 0.5, 40, 100), opacity: 0.05, speed: 0.15 },
      { points: generateCurve(height * 0.7, 25, 100), opacity: 0.04, speed: 0.25 },
    ];

    // Draw function - simplified for performance
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      const time = timeRef.current;

      // Draw curves with simple offset animation
      curves.forEach(curve => {
        const offset = (time * curve.speed) % 50;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(96, 165, 250, ${curve.opacity})`;
        ctx.lineWidth = 1;

        const segmentWidth = width / (curve.points.length - 1);
        
        for (let i = 0; i < curve.points.length; i++) {
          const x = i * segmentWidth - offset;
          const y = curve.points[i];
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      timeRef.current += 1;
      animationRef.current = requestAnimationFrame(draw);
    };

    // Throttle to ~30fps for background (saves CPU)
    let lastTime = 0;
    const throttledDraw = (currentTime: number) => {
      if (currentTime - lastTime >= 33) { // ~30fps
        draw();
        lastTime = currentTime;
      }
      animationRef.current = requestAnimationFrame(throttledDraw);
    };

    animationRef.current = requestAnimationFrame(throttledDraw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      {/* Canvas for animated curves */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
      />
      
      {/* Static grid using CSS (much lighter than canvas) */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Subtle film grain - CSS only */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Depth overlay */}
      <div 
        className="fixed inset-0 z-[2] pointer-events-none bg-gradient-to-b from-transparent via-background/30 to-background/60"
      />
    </>
  );
}
