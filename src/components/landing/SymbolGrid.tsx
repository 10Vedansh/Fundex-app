import { useRef, useEffect, useCallback } from 'react';

const SYMBOLS = ['$', '€', '£', '¥', '₹', '₿'];
const SPACING = 34;
const FONT_SIZE = 7;

export function SymbolGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    ctx.font = `${FONT_SIZE}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(147, 197, 253, 0.06)';

    let idx = 0;
    for (let y = SPACING / 2; y < h; y += SPACING) {
      for (let x = SPACING / 2; x < w; x += SPACING) {
        ctx.fillText(SYMBOLS[idx % SYMBOLS.length], x, y);
        idx++;
      }
    }
  }, []);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  );
}
