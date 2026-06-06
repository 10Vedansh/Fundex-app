import { useState, useEffect } from 'react';

export function SubtleMarketBackground() {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Preload the optimized webp version from public folder
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = '/market-background.webp';
  }, []);

  return (
    <>
      {/* Base color fallback - shows immediately */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(145deg, hsl(222, 47%, 8%) 0%, hsl(222, 47%, 12%) 100%)',
        }}
      />
      
      {/* Main background image - fades in when loaded */}
      <div 
        className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          backgroundImage: `url(/market-background.webp)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Subtle animation overlay - slow moving gradient for "live" feel */}
      <div 
        className="fixed inset-0 z-[1] pointer-events-none opacity-30 animate-pulse"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(100, 180, 255, 0.05) 0%, transparent 70%)',
          animationDuration: '4s',
        }}
      />
      
      {/* Top and bottom fade to blend with content */}
      <div 
        className="fixed inset-0 z-[2] pointer-events-none"
        style={{
          background: `
            linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 15%, transparent 85%, hsl(var(--background)) 100%)
          `
        }}
      />
    </>
  );
}
