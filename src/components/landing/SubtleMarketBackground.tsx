import { useEffect, useRef, useState } from 'react';

interface NAVLine {
  points: number[];
  baseY: number;
  speed: number;
  opacity: number;
}

interface FloatingNumber {
  x: number;
  y: number;
  value: string;
  opacity: number;
  speed: number;
  size: number;
}

interface DataPoint {
  x: number;
  y: number;
  size: number;
  pulse: number;
  speed: number;
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
    let time = 0;

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

    // Generate NAV-like curves
    const generateNAVPoints = (count: number, baseY: number, volatility: number): number[] => {
      const points: number[] = [];
      let value = baseY;
      for (let i = 0; i < count; i++) {
        const drift = 0.02;
        const noise = (Math.random() - 0.5 + drift) * volatility;
        value += noise;
        value = Math.max(baseY - volatility * 10, Math.min(baseY + volatility * 10, value));
        points.push(value);
      }
      return points;
    };

    // Create multiple NAV lines with more visibility
    const navLines: NAVLine[] = [
      {
        points: generateNAVPoints(200, height * 0.25, 3),
        baseY: height * 0.25,
        speed: 0.3,
        opacity: 0.08
      },
      {
        points: generateNAVPoints(200, height * 0.4, 4),
        baseY: height * 0.4,
        speed: 0.4,
        opacity: 0.06
      },
      {
        points: generateNAVPoints(200, height * 0.55, 3.5),
        baseY: height * 0.55,
        speed: 0.35,
        opacity: 0.07
      },
      {
        points: generateNAVPoints(200, height * 0.7, 2.5),
        baseY: height * 0.7,
        speed: 0.25,
        opacity: 0.05
      },
      {
        points: generateNAVPoints(200, height * 0.85, 3),
        baseY: height * 0.85,
        speed: 0.45,
        opacity: 0.04
      }
    ];

    // Floating financial numbers
    const floatingNumbers: FloatingNumber[] = [];
    const numberValues = ['₹24.5K', '₹1.2L', '+12.4%', '₹58.3K', '-2.1%', '₹3.4L', '+8.7%', '₹92.1K', '₹15.6L', '+5.2%', '₹7.8K', '-0.8%'];
    for (let i = 0; i < 15; i++) {
      floatingNumbers.push({
        x: Math.random() * width,
        y: Math.random() * height * 3,
        value: numberValues[Math.floor(Math.random() * numberValues.length)],
        opacity: 0.03 + Math.random() * 0.04,
        speed: 0.1 + Math.random() * 0.2,
        size: 10 + Math.random() * 4
      });
    }

    // Pulsing data points
    const dataPoints: DataPoint[] = [];
    for (let i = 0; i < 25; i++) {
      dataPoints.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1.5 + Math.random() * 2,
        pulse: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.02
      });
    }

    // Update NAV line points for animation
    const updateNAVLine = (line: NAVLine) => {
      line.points.shift();
      const lastPoint = line.points[line.points.length - 1];
      const trend = Math.sin(time * 0.002) * 0.3;
      const randomWalk = (Math.random() - 0.5 + trend) * 1.5;
      let newValue = lastPoint + randomWalk;
      
      const maxDeviation = 40;
      if (newValue > line.baseY + maxDeviation) {
        newValue = line.baseY + maxDeviation - Math.random() * 5;
      } else if (newValue < line.baseY - maxDeviation) {
        newValue = line.baseY - maxDeviation + Math.random() * 5;
      }
      
      line.points.push(newValue);
    };

    const drawNAVLine = (line: NAVLine, scrollOffset: number) => {
      const pointCount = line.points.length;
      const segmentWidth = (width + 100) / pointCount;
      const parallaxOffset = (scrollOffset * 0.05 * line.speed);

      // Draw line with gradient
      ctx.beginPath();
      for (let i = 0; i < pointCount; i++) {
        const x = (i * segmentWidth) - (time * line.speed) % (segmentWidth * 10);
        const y = line.points[i] - parallaxOffset;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = ((i - 1) * segmentWidth) - (time * line.speed) % (segmentWidth * 10);
          const prevY = line.points[i - 1] - parallaxOffset;
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }
      
      // Stroke with primary color
      ctx.strokeStyle = `rgba(96, 165, 250, ${line.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Add subtle glow
      ctx.strokeStyle = `rgba(96, 165, 250, ${line.opacity * 0.5})`;
      ctx.lineWidth = 4;
      ctx.filter = 'blur(3px)';
      ctx.stroke();
      ctx.filter = 'none';
    };

    const drawFloatingNumbers = (scrollOffset: number) => {
      ctx.font = '500 12px "Inter", system-ui, sans-serif';
      
      floatingNumbers.forEach(num => {
        const y = num.y - (scrollOffset * num.speed * 0.3) - (time * num.speed);
        const displayY = ((y % (height * 2)) + height * 2) % (height * 2) - height * 0.5;
        
        if (displayY > -50 && displayY < height + 50) {
          const isPositive = num.value.includes('+');
          const isNegative = num.value.includes('-');
          
          if (isPositive) {
            ctx.fillStyle = `rgba(74, 222, 128, ${num.opacity})`;
          } else if (isNegative) {
            ctx.fillStyle = `rgba(248, 113, 113, ${num.opacity})`;
          } else {
            ctx.fillStyle = `rgba(148, 163, 184, ${num.opacity})`;
          }
          
          ctx.fillText(num.value, num.x, displayY);
        }
      });
    };

    const drawDataPoints = () => {
      dataPoints.forEach(point => {
        const pulse = Math.sin(time * point.speed + point.pulse) * 0.5 + 0.5;
        const size = point.size * (0.8 + pulse * 0.4);
        const opacity = 0.1 + pulse * 0.15;
        
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96, 165, 250, ${opacity})`;
        ctx.fill();
        
        // Glow
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * 4);
        gradient.addColorStop(0, `rgba(96, 165, 250, ${opacity * 0.4})`);
        gradient.addColorStop(1, 'rgba(96, 165, 250, 0)');
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });
    };

    // Draw subtle grid
    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.03)';
      ctx.lineWidth = 1;
      
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw grid
      drawGrid();

      // Update and draw NAV lines
      if (time % 3 === 0) {
        navLines.forEach(line => updateNAVLine(line));
      }
      navLines.forEach(line => drawNAVLine(line, scrollY));

      // Draw floating numbers
      drawFloatingNumbers(scrollY);

      // Draw data points
      drawDataPoints();

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
      {/* Base canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
      />
      
      {/* Film grain */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Depth gradient */}
      <div 
        className="fixed inset-0 z-[2] pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 0%, transparent 0%, hsl(var(--background) / 0.6) 60%),
            linear-gradient(to bottom, transparent 0%, hsl(var(--background) / 0.4) 100%)
          `
        }}
      />
    </>
  );
}
