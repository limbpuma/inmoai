"use client";

import { useTranslations } from "next-intl";
import { SearchBar } from "@/components/search/SearchBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Sparkles, Brain } from "lucide-react";

export default function LandingPage() {
  const h = useTranslations("hero");
  const f = useTranslations("features");

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100/50 via-background to-background dark:from-primary-900/20" />

          <div className="container px-4 md:px-6 mx-auto flex flex-col items-center text-center space-y-8">
            <Badge
              variant="outline"
              className="px-4 py-1.5 text-sm rounded-full border-ai/30 bg-ai/10 text-ai animate-in fade-in zoom-in duration-500"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              {h("badge")}
            </Badge>

            <h1 className="heading-hero text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-5xl mx-auto bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70 dark:from-white dark:to-white/70">
              {h.rich("title", {
                highlight: (chunks) => (
                  <span className="text-ai">{chunks}</span>
                ),
              })}
            </h1>

            <p className="max-w-[700px] text-lg text-muted-foreground md:text-xl mx-auto leading-relaxed">
              {h("subtitle")}
            </p>

            <div className="w-full max-w-4xl pt-8 pb-12 mx-auto">
              <SearchBar variant="hero" />
              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <span className="hidden sm:inline font-medium">
                  {h("tryWith")}
                </span>
                <button className="bg-muted/50 px-4 py-1.5 rounded-full cursor-pointer hover:bg-muted hover:text-foreground transition-all hover:scale-105 border border-transparent hover:border-border">
                  &ldquo;{h("suggestion1")}&rdquo;
                </button>
                <button className="bg-muted/50 px-4 py-1.5 rounded-full cursor-pointer hover:bg-muted hover:text-foreground transition-all hover:scale-105 border border-transparent hover:border-border">
                  &ldquo;{h("suggestion2")}&rdquo;
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm font-medium text-muted-foreground/80">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                {h("statsProperties")}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                {h("statsRealtime")}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                {h("statsVerified")}
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-muted/30 border-y border-border/40">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col space-y-4 p-6 rounded-2xl bg-background border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-12 w-12 rounded-2xl bg-ai/10 flex items-center justify-center text-ai mb-2">
                  <Brain className="h-6 w-6" />
                </div>
                <h3 className="heading-section text-xl">
                  {f("semanticTitle")}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {f("semanticDesc")}
                </p>
              </div>
              <div className="flex flex-col space-y-4 p-6 rounded-2xl bg-background border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center text-success mb-2">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="heading-section text-xl">
                  {f("antiFraudTitle")}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {f("antiFraudDesc")}
                </p>
              </div>
              <div className="flex flex-col space-y-4 p-6 rounded-2xl bg-background border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="h-12 w-12 rounded-2xl bg-warning/10 flex items-center justify-center text-warning mb-2">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="heading-section text-xl">
                  {f("marketTitle")}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {f("marketDesc")}
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
