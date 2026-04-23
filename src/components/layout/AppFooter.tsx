export function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-white px-6 py-3 text-xs text-muted-foreground flex items-center justify-between">
      <span>© {year} Medcurity. All rights reserved.</span>
      <span className="hidden sm:block">PhishRx — Phishing Simulation &amp; Security Awareness</span>
    </footer>
  );
}
