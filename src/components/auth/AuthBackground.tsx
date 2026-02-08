import { useRef, useEffect, useCallback } from 'react';

const SYMBOLS = ['$', '€', '£', '¥', '₹', '₿', '%', '∑', '∞', '÷', '±', '≈'];
const SPACING = 45;
const FONT_SIZE = 11;
const FLIP_DURATION = 24;

interface CellState {
  symbolIndex: number;
  nextSymbolIndex: number;
  flipFrame: number;
  opacity: number;
}

function SymbolCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellsRef = useRef<CellState[]>([]);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const colsRef = useRef(0);

  const initCells = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cols = Math.ceil(w / SPACING);
    const rows = Math.ceil(h / SPACING);
    colsRef.current = cols;

    const total = cols * rows;
    const cells: CellState[] = [];
    for (let i = 0; i < total; i++) {
      cells.push({
        symbolIndex: Math.floor(Math.random() * SYMBOLS.length),
        nextSymbolIndex: 0,
        flipFrame: -1,
        opacity: 0.04 + Math.random() * 0.06,
      });
    }
    cellsRef.current = cells;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initCells();
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      initCells();
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cells = cellsRef.current;
      const cols = colsRef.current;
      const frame = frameRef.current;

      // Trigger random flips - slower rate for calm feel
      if (frame % 8 === 0) {
        const flipCount = Math.max(1, Math.floor(cells.length * 0.001));
        for (let i = 0; i < flipCount; i++) {
          const idx = Math.floor(Math.random() * cells.length);
          if (cells[idx].flipFrame === -1) {
            cells[idx].flipFrame = 0;
            let next = cells[idx].symbolIndex;
            while (next === cells[idx].symbolIndex) {
              next = Math.floor(Math.random() * SYMBOLS.length);
            }
            cells[idx].nextSymbolIndex = next;
          }
        }
      }

      for (let i = 0; i < cells.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = SPACING / 2 + col * SPACING;
        const y = SPACING / 2 + row * SPACING;

        const cell = cells[i];
        let scaleX = 1;
        let symbol = SYMBOLS[cell.symbolIndex];

        if (cell.flipFrame >= 0) {
          const progress = cell.flipFrame / FLIP_DURATION;
          if (progress < 0.5) {
            scaleX = 1 - progress * 2;
          } else {
            scaleX = (progress - 0.5) * 2;
            symbol = SYMBOLS[cell.nextSymbolIndex];
          }

          cell.flipFrame++;
          if (cell.flipFrame > FLIP_DURATION) {
            cell.symbolIndex = cell.nextSymbolIndex;
            cell.flipFrame = -1;
          }
        }

        if (scaleX < 0.05) continue;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scaleX, 1);
        ctx.font = `${FONT_SIZE}px "SF Mono", "Fira Code", monospace`;
        ctx.fillStyle = `rgba(96, 165, 250, ${cell.opacity})`;
        ctx.fillText(symbol, 0, 0);
        ctx.restore();
      }

      frameRef.current++;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [initCells]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  );
}

function DataWaves() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      viewBox="0 0 1440 900"
    >
      <defs>
        <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(265, 83%, 67%)" stopOpacity="0" />
          <stop offset="50%" stopColor="hsl(265, 83%, 67%)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="hsl(265, 83%, 67%)" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Primary flowing wave */}
      <path
        d="M-100 600 Q 200 500, 400 550 T 800 500 T 1200 550 T 1600 500"
        fill="none"
        stroke="url(#waveGradient1)"
        strokeWidth="1.5"
        className="animate-[wave_20s_ease-in-out_infinite]"
      />
      
      {/* Secondary wave - offset */}
      <path
        d="M-100 650 Q 250 580, 450 620 T 850 580 T 1250 620 T 1600 580"
        fill="none"
        stroke="url(#waveGradient1)"
        strokeWidth="1"
        className="animate-[wave_25s_ease-in-out_infinite_reverse]"
        opacity="0.6"
      />
      
      {/* Tertiary accent wave */}
      <path
        d="M-100 300 Q 300 250, 500 280 T 900 250 T 1300 280 T 1600 250"
        fill="none"
        stroke="url(#waveGradient2)"
        strokeWidth="1"
        className="animate-[wave_30s_ease-in-out_infinite]"
        opacity="0.4"
      />
      
      {/* Subtle horizontal data line */}
      <line
        x1="0"
        y1="450"
        x2="1440"
        y2="450"
        stroke="url(#waveGradient1)"
        strokeWidth="0.5"
        strokeDasharray="8 12"
        opacity="0.3"
      />
    </svg>
  );
}

function RadialGlow({ position = 'center' }: { position?: 'center' | 'right' }) {
  const positionClass = position === 'right' 
    ? 'left-1/2 lg:left-3/4' 
    : 'left-1/2';
  
  return (
    <div
      className={`absolute top-1/2 ${positionClass} -translate-x-1/2 -translate-y-1/2 pointer-events-none`}
      style={{
        width: '800px',
        height: '800px',
        background: 'radial-gradient(ellipse at center, hsla(217, 91%, 60%, 0.08) 0%, hsla(217, 91%, 60%, 0.03) 40%, transparent 70%)',
        filter: 'blur(60px)',
      }}
    />
  );
}

export function AuthBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Base gradient - deep navy to black */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, hsl(222, 47%, 9%) 0%, hsl(222, 47%, 5%) 50%, hsl(222, 47%, 3%) 100%)',
        }}
      />
      
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Radial glow behind card area */}
      <RadialGlow position="right" />
      
      {/* Secondary subtle glow on left */}
      <div
        className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden lg:block"
        style={{
          width: '600px',
          height: '600px',
          background: 'radial-gradient(ellipse at center, hsla(265, 83%, 67%, 0.04) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Currency symbol grid */}
      <SymbolCanvas />
      
      {/* Flowing data waves */}
      <DataWaves />
      
      {/* Top edge subtle gradient */}
      <div 
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, hsla(217, 91%, 60%, 0.02) 0%, transparent 100%)',
        }}
      />
      
      {/* Bottom vignette */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, hsla(222, 47%, 3%, 0.8) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
