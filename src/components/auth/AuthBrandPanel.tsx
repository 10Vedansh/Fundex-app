

export function AuthBrandPanel({ 
  title = "Welcome to CIFRAA",
  subtitle = "CIFRAA helps investors discover, analyze, and build personalized mutual fund portfolios powered by intelligent algorithms.",
  footerText = ""
}: {
  title?: string;
  subtitle?: string;
  footerText?: string;
}) {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
      {/* Dark branded background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,8%)] via-[hsl(222,47%,6%)] to-[hsl(222,47%,4%)]" />
      
      {/* Abstract geometric shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large triangle/pyramid shape */}
        <svg 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%]" 
          width="500" 
          height="500" 
          viewBox="0 0 500 500"
        >
          <defs>
            <linearGradient id="pyramidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="hsl(222, 47%, 14%)" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="pyramidEdge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="hsl(265, 83%, 67%)" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="pyramidFace2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(222, 47%, 12%)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(222, 47%, 8%)" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          
          {/* Left face */}
          <polygon 
            points="250,50 100,400 250,350" 
            fill="url(#pyramidGrad)" 
            stroke="url(#pyramidEdge)" 
            strokeWidth="0.5" 
          />
          {/* Right face */}
          <polygon 
            points="250,50 400,400 250,350" 
            fill="url(#pyramidFace2)" 
            stroke="url(#pyramidEdge)" 
            strokeWidth="0.5" 
          />
          
          {/* Accent triangle highlight */}
          <polygon 
            points="250,120 200,280 250,260" 
            fill="hsl(38, 92%, 50%)" 
            opacity="0.08" 
          />
        </svg>

        {/* Diagonal accent lines */}
        <div 
          className="absolute top-0 right-0 w-full h-full pointer-events-none"
          style={{
            background: `
              linear-gradient(135deg, transparent 40%, hsla(217, 91%, 60%, 0.03) 50%, transparent 60%),
              linear-gradient(145deg, transparent 50%, hsla(265, 83%, 67%, 0.02) 55%, transparent 65%)
            `,
          }}
        />

        {/* Subtle dot pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(hsl(217, 91%, 60%) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">

        {/* Main text */}
        <div className="space-y-4">
          <h2 className="text-3xl xl:text-4xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-muted-foreground text-base max-w-md leading-relaxed">
            {subtitle}
          </p>
          {footerText && (
            <p className="text-sm text-muted-foreground/70 pt-2">
              {footerText}
            </p>
          )}
        </div>

        {/* Bottom card */}
        <div className="mt-auto pt-8">
          <div className="p-5 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/20">
            <p className="text-foreground font-semibold text-lg mb-1.5">
              Get your right portfolio and right place — start now
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Be among the first investors to experience the easiest way to build a diversified mutual fund portfolio.
            </p>
            {/* Avatar stack */}
            <div className="flex items-center gap-2 mt-4">
              <div className="flex -space-x-2">
                {['bg-primary', 'bg-accent', 'bg-primary/70', 'bg-accent/70'].map((bg, i) => (
                  <div 
                    key={i} 
                    className={`h-8 w-8 rounded-full ${bg} border-2 border-card/40 flex items-center justify-center text-[10px] font-bold text-primary-foreground`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-1">+2k</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}