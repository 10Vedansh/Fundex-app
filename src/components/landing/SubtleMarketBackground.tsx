import { useEffect, useRef } from 'react';

interface FlowLine {
  points: number[];
  color: string;
  glowColor: string;
  speed: number;
  baseY: number;
}

export function SubtleMarketBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const offsetRef = useRef(0);

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

    // Generate smooth flowing curve points
    const generateFlowCurve = (baseY: number, amplitude: number, frequency: number, points: number): number[] => {
      const curve: number[] = [];
      for (let i = 0; i < points; i++) {
        const x = i / points;
        // Combine multiple sine waves for organic flow
        const y = baseY + 
          Math.sin(x * Math.PI * frequency) * amplitude * 0.6 +
          Math.sin(x * Math.PI * frequency * 2.3 + 1) * amplitude * 0.3 +
          Math.sin(x * Math.PI * frequency * 0.7 + 2) * amplitude * 0.4;
        curve.push(y);
      }
      return curve;
    };

    // Create multiple flowing lines with different colors like the reference
    const flowLines: FlowLine[] = [
      // Blue lines (top layer)
      { points: generateFlowCurve(height * 0.28, 35, 3, 200), color: 'rgba(100, 180, 255, 0.15)', glowColor: 'rgba(100, 180, 255, 0.08)', speed: 0.3, baseY: height * 0.28 },
      { points: generateFlowCurve(height * 0.35, 40, 2.5, 200), color: 'rgba(80, 160, 240, 0.12)', glowColor: 'rgba(80, 160, 240, 0.06)', speed: 0.25, baseY: height * 0.35 },
      
      // Teal/Cyan lines (middle)
      { points: generateFlowCurve(height * 0.45, 45, 2.8, 200), color: 'rgba(80, 200, 180, 0.12)', glowColor: 'rgba(80, 200, 180, 0.06)', speed: 0.35, baseY: height * 0.45 },
      { points: generateFlowCurve(height * 0.52, 38, 3.2, 200), color: 'rgba(100, 220, 200, 0.10)', glowColor: 'rgba(100, 220, 200, 0.05)', speed: 0.28, baseY: height * 0.52 },
      
      // Orange/Gold lines (lower)
      { points: generateFlowCurve(height * 0.58, 42, 2.2, 200), color: 'rgba(220, 160, 80, 0.12)', glowColor: 'rgba(220, 160, 80, 0.06)', speed: 0.32, baseY: height * 0.58 },
      { points: generateFlowCurve(height * 0.65, 35, 2.6, 200), color: 'rgba(200, 140, 60, 0.10)', glowColor: 'rgba(200, 140, 60, 0.05)', speed: 0.22, baseY: height * 0.65 },
      
      // Additional subtle lines
      { points: generateFlowCurve(height * 0.40, 50, 1.8, 200), color: 'rgba(140, 180, 220, 0.08)', glowColor: 'rgba(140, 180, 220, 0.04)', speed: 0.18, baseY: height * 0.40 },
      { points: generateFlowCurve(height * 0.55, 30, 3.5, 200), color: 'rgba(180, 200, 150, 0.08)', glowColor: 'rgba(180, 200, 150, 0.04)', speed: 0.4, baseY: height * 0.55 },
    ];

    // Small floating particles
    const particles: { x: number; y: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.1 + Math.random() * 0.3
      });
    }

    const drawLine = (line: FlowLine, offset: number) => {
      const segmentWidth = (width * 1.5) / line.points.length;
      const animOffset = (offset * line.speed) % (segmentWidth * 50);

      // Draw glow first
      ctx.beginPath();
      ctx.strokeStyle = line.glowColor;
      ctx.lineWidth = 6;
      
      for (let i = 0; i < line.points.length; i++) {
        const x = i * segmentWidth - animOffset;
        const y = line.points[i];
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = (i - 1) * segmentWidth - animOffset;
          const prevY = line.points[i - 1];
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }
      ctx.stroke();

      // Draw main line
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 1.5;
      
      for (let i = 0; i < line.points.length; i++) {
        const x = i * segmentWidth - animOffset;
        const y = line.points[i];
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = (i - 1) * segmentWidth - animOffset;
          const prevY = line.points[i - 1];
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }
      ctx.stroke();
    };

    const drawParticles = () => {
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 200, 220, ${p.alpha})`;
        ctx.fill();
      });
    };

    let lastTime = 0;
    const draw = (currentTime: number) => {
      // Throttle to ~24fps for smooth but light animation
      if (currentTime - lastTime < 42) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }
      lastTime = currentTime;

      ctx.clearRect(0, 0, width, height);

      // Draw all flowing lines
      flowLines.forEach(line => drawLine(line, offsetRef.current));

      // Draw particles
      drawParticles();

      offsetRef.current += 1;
      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      {/* Main canvas for animated lines */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
      />
      
      {/* Film grain texture */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Vignette effect */}
      <div 
        className="fixed inset-0 z-[2] pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 80% at 50% 50%, transparent 0%, hsl(var(--background)) 100%)
          `
        }}
      />
    </>
  );
}
