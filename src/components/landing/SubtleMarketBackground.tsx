import marketBackground from '@/assets/market-background.png';

export function SubtleMarketBackground() {
  return (
    <>
      {/* Main background image */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${marketBackground})`,
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
