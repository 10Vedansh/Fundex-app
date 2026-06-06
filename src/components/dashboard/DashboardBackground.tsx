export function DashboardBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Pure black canvas with subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at top, hsl(0, 0%, 8%) 0%, hsl(0, 0%, 4%) 60%, hsl(0, 0%, 2%) 100%)',
        }}
      />

      {/* Faint architectural shape - top right */}
      <div
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(0, 0%, 12%, 0.5) 0%, transparent 70%)',
        }}
      />

      {/* Faint architectural shape - bottom left */}
      <div
        className="absolute -bottom-48 -left-48 w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(0, 0%, 10%, 0.5) 0%, transparent 60%)',
        }}
      />
    </div>
  );
}
