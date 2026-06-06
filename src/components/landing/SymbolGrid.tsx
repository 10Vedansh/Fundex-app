import { useRef, useEffect, useCallback, useState } from 'react';

const SYMBOLS = ['$', '€', '£', '¥', '₹', '₿'];
const SPACING = 30;
const FONT_SIZE = 10;
const FLIP_INTERVAL = 120; // frames between flips
const FLIP_DURATION = 20; // frames for one flip animation

interface CellState {
  symbolIndex: number;
  nextSymbolIndex: number;
  flipFrame: number; // -1 = not flipping, 0..FLIP_DURATION = animating
}

export function SymbolGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellsRef = useRef<CellState[]>([]);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const colsRef = useRef(0);
  const rowsRef = useRef(0);

  const initCells = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cols = Math.ceil(w / SPACING);
    const rows = Math.ceil(h / SPACING);
    colsRef.current = cols;
    rowsRef.current = rows;

    const total = cols * rows;
    const cells: CellState[] = [];
    for (let i = 0; i < total; i++) {
      cells.push({
        symbolIndex: Math.floor(Math.random() * SYMBOLS.length),
        nextSymbolIndex: 0,
        flipFrame: -1,
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

      // Trigger random flips
      if (frame % 3 === 0) {
        // Every 3 frames, pick a few cells to start flipping
        const flipCount = Math.max(1, Math.floor(cells.length * 0.002));
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
          // First half: shrink to 0, second half: expand back
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

        if (scaleX < 0.05) continue; // skip nearly invisible

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scaleX, 1);
        ctx.font = `${FONT_SIZE}px "Courier New", monospace`;
        ctx.fillStyle = 'rgba(147, 197, 253, 0.12)';
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
