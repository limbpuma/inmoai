"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import {
  Search,
  MapPin,
  Star,
  BadgeCheck,
  Phone,
  Clock,
  PaintBucket,
  Wrench,
  Zap,
  Droplets,
  TreeDeciduous,
  Lightbulb,
  Filter,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

const categoryConfig: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  painting: { icon: PaintBucket, label: "Pintura", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  renovation: { icon: Wrench, label: "Reformas", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  electrical: { icon: Zap, label: "Electricidad", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  plumbing: { icon: Droplets, label: "Fontaneria", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
  garden: { icon: TreeDeciduous, label: "Jardin", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  general: { icon: Lightbulb, label: "General", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
};

const tierConfig: Record<string, { label: string; color: string }> = {
  free: { label: "", color: "" },
  premium: { label: "Premium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  enterprise: { label: "Destacado", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
};

function ServiciosPageContent({ initialCity }: { initialCity: string }) {
  const [city, setCity] = useState(initialCity);
  const [category, setCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = trpc.marketplace.searchProviders.useQuery(
    {
      city: city || undefined,
      categories: category ? [category] : undefined,
      limit: 20,
    },
    { keepPreviousData: true }
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);

  const filteredProviders = data?.providers.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.provider.businessName.toLowerCase().includes(query) ||
      item.provider.city.toLowerCase().includes(query) ||
      item.services.some((s) => s.title.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Encuentra Profesionales de Confianza
          </h1>
          <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
            Conectamos propietarios con los mejores profesionales de reformas,
            pintura, electricidad y mas. Verificados y cerca de ti.
          </p>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o servicio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative flex-1 sm:max-w-[200px]">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ciudad"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={category || "all"} onValueChange={(val) => setCategory(val === "all" ? "" : val)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <main className="container mx-auto px-4 py-8">
        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <p className="text-muted-foreground">
              {`${filteredProviders?.length || 0} profesionales encontrados`}
            </p>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : filteredProviders && filteredProviders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((item) => {
              const { provider, services, distanceKm } = item;
              const tier = tierConfig[provider.tier];
              const mainCategory = services[0]?.category || "general";
              const catConfig = categoryConfig[mainCategory];
              const CategoryIcon = catConfig?.icon || Lightbulb;

              return (
                <Link
                  key={provider.id}
                  href={`/servicios/${provider.slug}`}
                  className="group"
                >
                  <div className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all hover:border-primary/50">
                    {/* Header with category color */}
                    <div className={cn("h-2", catConfig?.color.split(" ")[0] || "bg-gray-100")} />

                    <div className="p-5">
                      {/* Top row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {provider.logoUrl ? (
                            <img
                              src={provider.logoUrl}
                              alt={provider.businessName}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <CategoryIcon className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold group-hover:text-primary transition-colors">
                                {provider.businessName}
                              </h3>
                              {provider.isVerified && (
                                <BadgeCheck className="h-4 w-4 text-blue-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{provider.city}</span>
                              {distanceKm !== null && (
                                <span className="text-xs">
                                  ({distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span className="font-semibold">
                            {provider.averageRating.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({provider.totalReviews})
                          </span>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {tier.label && (
                          <Badge variant="outline" className={cn("text-xs", tier.color)}>
                            {tier.label}
                          </Badge>
                        )}
                        {services.slice(0, 3).map((service) => {
                          const sConfig = categoryConfig[service.category];
                          return (
                            <Badge
                              key={service.id}
                              variant="outline"
                              className={cn("text-xs", sConfig?.color)}
                            >
                              {service.title}
                            </Badge>
                          );
                        })}
                      </div>

                      {/* Description */}
                      {provider.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {provider.description}
                        </p>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {provider.responseTimeMinutes && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {provider.responseTimeMinutes < 60
                                  ? `${provider.responseTimeMinutes}min`
                                  : `${Math.round(provider.responseTimeMinutes / 60)}h`}
                              </span>
                            </div>
                          )}
                        </div>

                        {services.length > 0 && services[0].priceMin && (
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground">Desde </span>
                            <span className="font-semibold">
                              {formatCurrency(services[0].priceMin)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No se encontraron profesionales</h3>
            <p className="text-muted-foreground mb-4">
              Intenta cambiar los filtros de busqueda
            </p>
            <Button variant="outline" onClick={() => { setCity(""); setCategory(""); setSearchQuery(""); }}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function ServiciosPageWrapper() {
  const searchParams = useSearchParams();
  const initialCity = searchParams.get("city") || "";
  return <ServiciosPageContent initialCity={initialCity} />;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-10 w-96 mx-auto mb-4" />
          <Skeleton className="h-6 w-2/3 mx-auto mb-8" />
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-10 w-[180px]" />
          </div>
        </div>
      </div>
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </main>
    </div>
  );
}

export default function ServiciosPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ServiciosPageWrapper />
    </Suspense>
  );
}
