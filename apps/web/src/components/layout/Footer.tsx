"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-12 md:py-16 bg-muted/10">
      <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 bg-primary rounded-md flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-bold font-mono text-xs">
              AI
            </span>
          </div>
          <span className="font-bold text-lg text-foreground/80">InmoAI</span>
        </div>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors"
          >
            Terminos
          </Link>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacidad
          </Link>
          <Link
            href="/cookies"
            className="hover:text-foreground transition-colors"
          >
            Cookies
          </Link>
        </nav>
        <p className="text-sm text-muted-foreground text-center md:text-right">
          &copy; 2026 InmoAI. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
