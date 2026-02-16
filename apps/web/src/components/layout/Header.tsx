import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 mx-auto">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-primary-foreground font-bold font-mono">AI</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight">InmoAI</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link href="/search" className="transition-colors hover:text-primary text-muted-foreground focus-visible:outline-none focus-visible:text-primary focus-visible:underline underline-offset-4">Comprar</Link>
                        <Link href="/search?mode=rent" className="transition-colors hover:text-primary text-muted-foreground focus-visible:outline-none focus-visible:text-primary focus-visible:underline underline-offset-4">Alquilar</Link>
                        <Link href="/servicios" className="transition-colors hover:text-primary text-muted-foreground focus-visible:outline-none focus-visible:text-primary focus-visible:underline underline-offset-4">Profesionales</Link>
                        <Link href="/pricing" className="transition-colors hover:text-primary text-muted-foreground focus-visible:outline-none focus-visible:text-primary focus-visible:underline underline-offset-4">Precios</Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Iniciar sesión</Button>
                    <Button size="sm" className="font-semibold shadow-sm">Publicar gratis</Button>
                </div>
            </div>
        </header>
    );
}
