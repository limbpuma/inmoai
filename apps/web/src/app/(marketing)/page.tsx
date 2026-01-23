import { SearchBar } from "@/components/search/SearchBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Sparkles, Brain, ArrowRight } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col bg-background font-sans">
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative overflow-hidden py-24 lg:py-32">
                    {/* Background Gradient */}
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100/50 via-background to-background dark:from-primary-900/20" />

                    <div className="container px-4 md:px-6 mx-auto flex flex-col items-center text-center space-y-8">
                        <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full border-primary/20 bg-primary/5 text-primary animate-in fade-in zoom-in duration-500">
                            <Sparkles className="mr-2 h-3.5 w-3.5" />
                            La revolución del Real Estate con IA
                        </Badge>

                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-5xl mx-auto bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70 dark:from-white dark:to-white/70">
                            Encuentra tu hogar con <span className="text-primary">inteligencia</span>
                        </h1>

                        <p className="max-w-[700px] text-lg text-muted-foreground md:text-xl mx-auto leading-relaxed">
                            El único buscador que analiza, verifica y encuentra tu casa ideal usando lenguaje natural. Olvida los filtros complejos.
                        </p>

                        <div className="w-full max-w-4xl pt-8 pb-12 mx-auto">
                            <SearchBar variant="hero" />
                            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                                <span className="hidden sm:inline font-medium">Prueba con:</span>
                                <button className="bg-muted/50 px-4 py-1.5 rounded-full cursor-pointer hover:bg-muted hover:text-foreground transition-all hover:scale-105 border border-transparent hover:border-border">
                                    "Piso en Madrid con terraza por menos de 300k"
                                </button>
                                <button className="bg-muted/50 px-4 py-1.5 rounded-full cursor-pointer hover:bg-muted hover:text-foreground transition-all hover:scale-105 border border-transparent hover:border-border">
                                    "Casa familiar cerca de colegios en Valencia"
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm font-medium text-muted-foreground/80">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                2M+ Propiedades analizadas
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                Actualización en tiempo real
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                                IA Verificada
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 bg-muted/30 border-y border-border/40">
                    <div className="container px-4 md:px-6 mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            <div className="flex flex-col space-y-4 p-6 rounded-2xl bg-background border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                                    <Brain className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold">Búsqueda Semántica</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    No busques por casillas. Habla con nuestro buscador como si fuera un experto inmobiliario. Entiende contexto y matices de tu búsqueda.
                                </p>
                            </div>
                            <div className="flex flex-col space-y-4 p-6 rounded-2xl bg-background border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-12 w-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary-600 mb-2">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold">Verificación Anti-Fraude</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Nuestra IA analiza fotos y precios para detectar estafas y anuncios falsos. Score de confianza en cada propiedad para tu seguridad.
                                </p>
                            </div>
                            <div className="flex flex-col space-y-4 p-6 rounded-2xl bg-background border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 mb-2">
                                    <Sparkles className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold">Análisis de Mercado</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Historial de precios real y valoración automática. Sabe si es una buena oportunidad antes que nadie con datos actualizados.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
