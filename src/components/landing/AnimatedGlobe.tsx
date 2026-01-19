import { useEffect, useRef } from 'react';

export function AnimatedGlobe() {
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

    // Globe parameters
    const centerX = canvas.width * 0.7;
    const centerY = canvas.height * 0.5;
    const radius = Math.min(canvas.width, canvas.height) * 0.35;

    // Network nodes
    interface Node {
      lat: number;
      lng: number;
      size: number;
      pulse: number;
    }

    const nodes: Node[] = [];
    for (let i = 0; i < 40; i++) {
      nodes.push({
        lat: (Math.random() - 0.5) * Math.PI,
        lng: Math.random() * Math.PI * 2,
        size: 1.5 + Math.random() * 2,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    // Convert spherical to 2D coordinates
    const sphericalTo2D = (lat: number, lng: number, rotation: number) => {
      const adjustedLng = lng + rotation;
      const x = Math.cos(lat) * Math.sin(adjustedLng);
      const y = Math.sin(lat);
      const z = Math.cos(lat) * Math.cos(adjustedLng);
      
      // Only show front-facing points
      if (z < 0) return null;
      
      return {
        x: centerX + x * radius,
        y: centerY - y * radius,
        z: z,
        opacity: 0.3 + z * 0.7,
      };
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const rotation = time * 0.0003; // Slow rotation

      // Draw globe outline with gradient
      const gradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        0,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.08)');
      gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.04)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw latitude lines
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.lineWidth = 1;
      for (let lat = -60; lat <= 60; lat += 30) {
        const latRad = (lat * Math.PI) / 180;
        ctx.beginPath();
        for (let lng = 0; lng <= 360; lng += 5) {
          const lngRad = (lng * Math.PI) / 180;
          const point = sphericalTo2D(latRad, lngRad, rotation);
          if (point) {
            if (lng === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          }
        }
        ctx.stroke();
      }

      // Draw longitude lines
      for (let lng = 0; lng < 360; lng += 30) {
        const lngRad = (lng * Math.PI) / 180;
        ctx.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 5) {
          const latRad = (lat * Math.PI) / 180;
          const point = sphericalTo2D(latRad, lngRad, rotation);
          if (point) {
            if (!started) {
              ctx.moveTo(point.x, point.y);
              started = true;
            } else {
              ctx.lineTo(point.x, point.y);
            }
          }
        }
        ctx.stroke();
      }

      // Draw nodes and connections
      const visibleNodes: { x: number; y: number; opacity: number; size: number }[] = [];
      
      nodes.forEach((node, i) => {
        const point = sphericalTo2D(node.lat, node.lng, rotation);
        if (point) {
          const pulse = Math.sin(time * 0.002 + node.pulse) * 0.5 + 0.5;
          visibleNodes.push({
            x: point.x,
            y: point.y,
            opacity: point.opacity,
            size: node.size * (0.8 + pulse * 0.4),
          });
        }
      });

      // Draw connections between nearby nodes
      ctx.lineWidth = 0.5;
      visibleNodes.forEach((node, i) => {
        visibleNodes.slice(i + 1).forEach((other) => {
          const dist = Math.hypot(node.x - other.x, node.y - other.y);
          if (dist < 100) {
            const opacity = (1 - dist / 100) * 0.3 * Math.min(node.opacity, other.opacity);
            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        });
      });

      // Draw nodes
      visibleNodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${node.opacity * 0.8})`;
        ctx.fill();
        
        // Glow effect
        const glowGradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.size * 3
        );
        glowGradient.addColorStop(0, `rgba(59, 130, 246, ${node.opacity * 0.3})`);
        glowGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
      });

      // Draw flowing data lines
      const numFlowLines = 5;
      for (let i = 0; i < numFlowLines; i++) {
        const progress = ((time * 0.0005 + i / numFlowLines) % 1);
        const startNode = nodes[i % nodes.length];
        const endNode = nodes[(i + 3) % nodes.length];
        
        const startPoint = sphericalTo2D(startNode.lat, startNode.lng, rotation);
        const endPoint = sphericalTo2D(endNode.lat, endNode.lng, rotation);
        
        if (startPoint && endPoint) {
          const currentX = startPoint.x + (endPoint.x - startPoint.x) * progress;
          const currentY = startPoint.y + (endPoint.y - startPoint.y) * progress;
          
          ctx.beginPath();
          ctx.arc(currentX, currentY, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
          ctx.fill();
        }
      }

      time += 16;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}
