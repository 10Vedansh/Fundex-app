import { useEffect, useRef, useState } from 'react';

interface NAVLine {
  points: number[];
  baseY: number;
  speed: number;
  opacity: number;
  offset: number;
}

export function SubtleMarketBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Generate subtle NAV-like curves (historical market memory)
    const generateNAVPoints = (count: number, baseY: number, volatility: number): number[] => {
      const points: number[] = [];
      let value = baseY;
      for (let i = 0; i < count; i++) {
        // Gentle random walk with slight upward bias (like real markets)
        const drift = 0.02;
        const noise = (Math.random() - 0.5 + drift) * volatility;
        value += noise;
        value = Math.max(baseY - volatility * 8, Math.min(baseY + volatility * 8, value));
        points.push(value);
      }
      return points;
    };

    // Create multiple NAV lines at different depths
    const navLines: NAVLine[] = [
      {
        points: generateNAVPoints(150, height * 0.3, 2),
        baseY: height * 0.3,
        speed: 0.015,
        opacity: 0.04,
        offset: 0
      },
      {
        points: generateNAVPoints(150, height * 0.45, 3),
        baseY: height * 0.45,
        speed: 0.025,
        opacity: 0.03,
        offset: 50
      },
      {
        points: generateNAVPoints(150, height * 0.6, 2.5),
        baseY: height * 0.6,
        speed: 0.02,
        opacity: 0.035,
        offset: 100
      },
      {
        points: generateNAVPoints(150, height * 0.75, 1.8),
        baseY: height * 0.75,
        speed: 0.012,
        opacity: 0.025,
        offset: 150
      }
    ];

    let time = 0;

    const drawNAVLine = (line: NAVLine, scrollOffset: number) => {
      const pointCount = line.points.length;
      const segmentWidth = (width + 200) / pointCount;
      
      // Parallax: deeper lines move slower with scroll
      const parallaxOffset = (scrollOffset * line.speed * 10) + (time * line.speed);
      const xOffset = (parallaxOffset % (width + 200)) - 100;

      ctx.beginPath();
      ctx.strokeStyle = `rgba(100, 130, 180, ${line.opacity})`;
      ctx.lineWidth = 1;

      for (let i = 0; i < pointCount; i++) {
        const x = (i * segmentWidth) - xOffset;
        const y = line.points[i];
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Smooth curve
          const prevX = ((i - 1) * segmentWidth) - xOffset;
          const prevY = line.points[i - 1];
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }
      ctx.stroke();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw NAV lines with parallax
      navLines.forEach(line => {
        drawNAVLine(line, scrollY);
      });

      time += 1;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [scrollY]);

  return (
    <>
      {/* Base canvas for NAV curves */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
      />
      
      {/* Film grain overlay */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
      
      {/* Subtle depth gradient */}
      <div 
        className="fixed inset-0 z-[2] pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, transparent 0%, hsl(var(--background)) 70%),
            linear-gradient(to bottom, transparent 0%, hsl(var(--background) / 0.3) 50%, hsl(var(--background)) 100%)
          `
        }}
      />
    </>
  );
}
