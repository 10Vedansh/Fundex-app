export function DashboardBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Base gradient - deep navy to slightly lighter navy */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(145deg, hsl(222, 47%, 9%) 0%, hsl(222, 47%, 13%) 50%, hsl(222, 47%, 10%) 100%)',
        }}
      />
      
      {/* Large architectural shape - top right */}
      <div 
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(217, 91%, 60%, 0.03) 0%, transparent 70%)',
        }}
      />
      
      {/* Large architectural shape - bottom left */}
      <div 
        className="absolute -bottom-48 -left-48 w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(222, 47%, 18%, 0.04) 0%, transparent 60%)',
        }}
      />
      
      {/* Subtle asymmetric curve - center right */}
      <div 
        className="absolute top-1/3 right-0 w-[400px] h-[600px]"
        style={{
          background: 'radial-gradient(ellipse at right, hsl(217, 91%, 60%, 0.02) 0%, transparent 50%)',
        }}
      />
      
      {/* Very faint center glow for depth */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]"
        style={{
          background: 'radial-gradient(ellipse, hsl(222, 47%, 15%, 0.03) 0%, transparent 50%)',
        }}
      />
    </div>
  );
}
