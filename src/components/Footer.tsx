export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} <span className="font-semibold text-foreground">Fundex</span> – All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
