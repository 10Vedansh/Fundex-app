import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mascotImage from '@/assets/mascot-3d.png';

interface MascotProps {
  message: string;
  /** 'floating' = fixed bottom corner overlay, 'inline' = embedded in layout, 'hero' = beside text in hero section */
  mode?: 'floating' | 'inline' | 'hero';
  position?: 'bottom-left' | 'bottom-right';
  delay?: number;
}

export function Mascot({ message, mode = 'floating', position = 'bottom-left', delay = 500 }: MascotProps) {
  const [visible, setVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Typewriter effect
  useEffect(() => {
    if (!visible) return;
    let i = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      if (i < message.length) {
        setDisplayedText(message.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [visible, message]);

  // Hero mode — mascot standing beside content with a clean speech bubble
  if (mode === 'hero') {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            className="relative flex-shrink-0"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.2 }}
          >
            {/* Speech bubble — positioned above the mascot */}
            <motion.div
              className="absolute -top-4 left-1/2 -translate-x-1/2 -translate-y-full z-10 w-[220px] xl:w-[260px]"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.4, ease: 'easeOut' }}
            >
              <div className="relative bg-card/95 backdrop-blur-sm border border-border/40 rounded-2xl px-4 py-3 shadow-lg shadow-black/10">
                <p className="text-xs xl:text-sm font-medium text-foreground/90 leading-relaxed">
                  {displayedText}
                  <motion.span
                    className="inline-block w-[2px] h-3.5 bg-primary/60 ml-0.5 align-middle"
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.7 }}
                  />
                </p>
                {/* Tail */}
                <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-card/95 border-r border-b border-border/40 rotate-45" />
              </div>
            </motion.div>

            {/* Mascot image with subtle float */}
            <motion.img
              src={mascotImage}
              alt="CIFRAA Assistant"
              className="h-56 xl:h-72 2xl:h-80 w-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)] select-none pointer-events-none"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Inline mode
  if (mode === 'inline') {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            className="flex flex-col items-center gap-3 mt-4"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <motion.div
              className="relative max-w-[280px]"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <div className="relative bg-card/90 backdrop-blur-sm border border-border/40 rounded-2xl px-4 py-3 shadow-lg">
                <p className="text-sm font-medium text-foreground/90 leading-relaxed">
                  {displayedText}
                  <motion.span
                    className="inline-block w-[2px] h-3.5 bg-primary/60 ml-0.5 align-middle"
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.7 }}
                  />
                </p>
                <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-card/90 border-r border-b border-border/40 rotate-45" />
              </div>
            </motion.div>

            <motion.img
              src={mascotImage}
              alt="CIFRAA Assistant"
              className="h-44 xl:h-52 w-auto drop-shadow-[0_15px_30px_rgba(0,0,0,0.25)] select-none pointer-events-none"
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Floating mode
  const positionClasses = position === 'bottom-left'
    ? 'left-4 lg:left-8 bottom-4 lg:bottom-8'
    : 'right-4 lg:right-8 bottom-4 lg:bottom-8';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`fixed ${positionClasses} z-50 flex items-end gap-3`}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <motion.img
            src={mascotImage}
            alt="CIFRAA Assistant"
            className="h-20 lg:h-28 w-auto drop-shadow-[0_10px_25px_rgba(0,0,0,0.3)] select-none pointer-events-none flex-shrink-0"
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
          />

          <motion.div
            className="relative max-w-[200px] lg:max-w-[240px] mb-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <div className="relative bg-card/90 backdrop-blur-sm border border-border/40 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-lg">
              <p className="text-sm font-medium text-foreground/90 leading-relaxed">
                {displayedText}
                <motion.span
                  className="inline-block w-[2px] h-3.5 bg-primary/60 ml-0.5 align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                />
              </p>
              <div className="absolute -bottom-[6px] left-1 w-3 h-3 bg-card/90 border-l border-b border-border/40 rotate-[-35deg] skew-x-[10deg]" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
