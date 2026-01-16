export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/80 backdrop-blur-sm py-6">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Fundex – All rights reserved
        </p>
      </div>
    </footer>
  );
}
