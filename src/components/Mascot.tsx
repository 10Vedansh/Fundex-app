import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mascotImage from '@/assets/mascot.png';

interface MascotProps {
  message: string;
  /** 'floating' = fixed bottom corner overlay, 'inline' = embedded in layout */
  mode?: 'floating' | 'inline';
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
    }, 30);
    return () => clearInterval(interval);
  }, [visible, message]);

  if (mode === 'inline') {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            className="flex flex-col items-center gap-4 mt-4"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* Speech bubble above mascot */}
            <motion.div
              className="relative max-w-[320px]"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="relative bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl px-5 py-3 shadow-xl">
                <p className="text-sm lg:text-base font-medium text-foreground leading-snug">
                  {displayedText}
                  <motion.span
                    className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                </p>
                {/* Bubble tail pointing down */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card/80 border-r border-b border-border/50 transform rotate-45" />
              </div>
            </motion.div>

            {/* Large mascot image */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            >
              <img
                src={mascotImage}
                alt="CIFRAA Mascot"
                className="h-52 xl:h-64 w-auto drop-shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Floating mode (fixed position overlay)
  const positionClasses = position === 'bottom-left'
    ? 'left-4 lg:left-8 bottom-4 lg:bottom-8'
    : 'right-4 lg:right-8 bottom-4 lg:bottom-8';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`fixed ${positionClasses} z-50 flex items-end gap-3`}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <motion.div
            className="relative flex-shrink-0"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <img
              src={mascotImage}
              alt="CIFRAA Mascot"
              className="h-24 w-auto lg:h-32 drop-shadow-2xl"
            />
          </motion.div>

          <motion.div
            className="relative max-w-[220px] lg:max-w-[280px] mb-8"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="relative bg-card/90 backdrop-blur-md border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 shadow-xl">
              <p className="text-sm lg:text-base font-medium text-foreground leading-snug">
                {displayedText}
                <motion.span
                  className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
              </p>
              <div className="absolute -bottom-2 left-1 w-4 h-4 bg-card/90 border-l border-b border-border/50 transform rotate-[-35deg] skew-x-[10deg]" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
