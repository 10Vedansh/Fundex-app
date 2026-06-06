import { useEffect, useRef } from 'react';

export function AnimatedStockGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Generate multiple stock lines with different characteristics
    interface StockLine {
      points: number[];
      baseY: number;
      amplitude: number;
      speed: number;
      phase: number;
      opacity: number;
      color: string;
    }

    const generateInitialPoints = (count: number, baseY: number, amplitude: number): number[] => {
      const points: number[] = [];
      let value = baseY;
      for (let i = 0; i < count; i++) {
        value += (Math.random() - 0.48) * amplitude * 0.5;
        value = Math.max(baseY - amplitude, Math.min(baseY + amplitude, value));
        points.push(value);
      }
      return points;
    };

    const stockLines: StockLine[] = [
      {
        points: generateInitialPoints(200, canvas.height * 0.35, 80),
        baseY: canvas.height * 0.35,
        amplitude: 80,
        speed: 0.3,
        phase: 0,
        opacity: 0.15,
        color: '217, 91%, 60%' // primary blue
      },
      {
        points: generateInitialPoints(200, canvas.height * 0.5, 100),
        baseY: canvas.height * 0.5,
        amplitude: 100,
        speed: 0.25,
        phase: Math.PI / 3,
        opacity: 0.12,
        color: '142, 71%, 45%' // success green
      },
      {
        points: generateInitialPoints(200, canvas.height * 0.65, 70),
        baseY: canvas.height * 0.65,
        amplitude: 70,
        speed: 0.35,
        phase: Math.PI / 2,
        opacity: 0.1,
        color: '265, 83%, 67%' // purple accent
      },
      {
        points: generateInitialPoints(200, canvas.height * 0.45, 120),
        baseY: canvas.height * 0.45,
        amplitude: 120,
        speed: 0.2,
        phase: Math.PI,
        opacity: 0.08,
        color: '38, 92%, 50%' // warning orange
      }
    ];

    // Update stock line points to create flowing animation
    const updateStockLine = (line: StockLine, deltaTime: number) => {
      // Shift points left
      line.points.shift();
      
      // Generate new point based on previous with random walk + trend
      const lastPoint = line.points[line.points.length - 1];
      const trend = Math.sin(time * 0.001 + line.phase) * 0.3;
      const randomWalk = (Math.random() - 0.5 + trend) * line.amplitude * 0.08;
      let newValue = lastPoint + randomWalk;
      
      // Keep within bounds with soft bounce
      if (newValue > line.baseY + line.amplitude) {
        newValue = line.baseY + line.amplitude - Math.random() * 10;
      } else if (newValue < line.baseY - line.amplitude) {
        newValue = line.baseY - line.amplitude + Math.random() * 10;
      }
      
      line.points.push(newValue);
    };

    const drawStockLine = (line: StockLine) => {
      const pointSpacing = canvas.width / (line.points.length - 1);
      
      // Draw area fill under the line
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      
      for (let i = 0; i < line.points.length; i++) {
        const x = i * pointSpacing;
        const y = line.points[i];
        
        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          // Smooth curve using quadratic bezier
          const prevX = (i - 1) * pointSpacing;
          const prevY = line.points[i - 1];
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }
      
      ctx.lineTo(canvas.width, line.points[line.points.length - 1]);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      
      // Create gradient fill
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, `hsla(${line.color}, ${line.opacity})`);
      gradient.addColorStop(1, `hsla(${line.color}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Draw the line itself
      ctx.beginPath();
      for (let i = 0; i < line.points.length; i++) {
        const x = i * pointSpacing;
        const y = line.points[i];
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = (i - 1) * pointSpacing;
          const prevY = line.points[i - 1];
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }
      
      ctx.strokeStyle = `hsla(${line.color}, ${line.opacity * 2.5})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Draw glow effect on the line
      ctx.strokeStyle = `hsla(${line.color}, ${line.opacity * 1.5})`;
      ctx.lineWidth = 4;
      ctx.filter = 'blur(3px)';
      ctx.stroke();
      ctx.filter = 'none';
    };

    // Draw subtle grid lines
    const drawGrid = () => {
      ctx.strokeStyle = 'hsla(217, 33%, 22%, 0.3)';
      ctx.lineWidth = 0.5;
      
      // Horizontal grid lines
      const horizontalLines = 8;
      for (let i = 1; i < horizontalLines; i++) {
        const y = (canvas.height / horizontalLines) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Vertical grid lines
      const verticalLines = 12;
      for (let i = 1; i < verticalLines; i++) {
        const x = (canvas.width / verticalLines) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
    };

    // Draw floating data points
    interface DataPoint {
      x: number;
      y: number;
      size: number;
      opacity: number;
      speed: number;
    }

    const dataPoints: DataPoint[] = [];
    for (let i = 0; i < 15; i++) {
      dataPoints.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 2 + Math.random() * 3,
        opacity: 0.1 + Math.random() * 0.2,
        speed: 0.2 + Math.random() * 0.3
      });
    }

    const updateDataPoints = () => {
      dataPoints.forEach(point => {
        point.y -= point.speed;
        if (point.y < -10) {
          point.y = canvas.height + 10;
          point.x = Math.random() * canvas.width;
        }
      });
    };

    const drawDataPoints = () => {
      dataPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(217, 91%, 60%, ${point.opacity})`;
        ctx.fill();
        
        // Glow
        const glowGradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, point.size * 4
        );
        glowGradient.addColorStop(0, `hsla(217, 91%, 60%, ${point.opacity * 0.5})`);
        glowGradient.addColorStop(1, 'hsla(217, 91%, 60%, 0)');
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
      });
    };

    let lastTime = 0;
    const draw = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw subtle grid
      drawGrid();
      
      // Update and draw stock lines
      if (deltaTime > 0) {
        stockLines.forEach(line => {
          if (time % Math.floor(50 / line.speed) === 0) {
            updateStockLine(line, deltaTime);
          }
        });
      }
      
      stockLines.forEach(line => drawStockLine(line));
      
      // Update and draw data points
      updateDataPoints();
      drawDataPoints();
      
      time++;
      animationId = requestAnimationFrame(draw);
    };

    draw(0);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
}
