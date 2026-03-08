import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mascotImage from '@/assets/mascot.png';

interface MascotProps {
  message: string;
  position?: 'bottom-left' | 'bottom-right';
  delay?: number;
}

export function Mascot({ message, position = 'bottom-left', delay = 500 }: MascotProps) {
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
          {/* Mascot image */}
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

          {/* Speech bubble */}
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
              {/* Bubble tail */}
              <div className="absolute -bottom-2 left-1 w-4 h-4 bg-card/90 border-l border-b border-border/50 transform rotate-[-35deg] skew-x-[10deg]" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
