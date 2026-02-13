"use client";

import { useState } from "react";
import {
  PaintBucket,
  Wrench,
  Zap,
  Droplets,
  TreeDeciduous,
  Lightbulb,
  Star,
  MapPin,
  Clock,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Phone,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

interface Improvement {
  id: string;
  category: "painting" | "renovation" | "electrical" | "plumbing" | "garden" | "general";
  title: string;
}

interface ServiceProvidersProps {
  listingId: string;
  improvements?: Improvement[];
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  className?: string;
}

const categoryConfig: Record<
  string,
  { icon: LucideIcon; label: string; color: string; bgColor: string }
> = {
  painting: {
    icon: PaintBucket,
    label: "Pintura",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  renovation: {
    icon: Wrench,
    label: "Reformas",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
  },
  electrical: {
    icon: Zap,
    label: "Electricidad",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
  },
  plumbing: {
    icon: Droplets,
    label: "Fontaneria",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
  },
  garden: {
    icon: TreeDeciduous,
    label: "Jardin",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  general: {
    icon: Lightbulb,
    label: "General",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
};

const tierConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  free: {
    label: "",
    color: "",
    bgColor: "",
  },
  premium: {
    label: "Premium",
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  enterprise: {
    label: "Destacado",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
};

/**
 * ServiceProviders - Shows recommended service providers for a listing
 * Based on proximity algorithm and detected improvements
 */
export function ServiceProviders({
  listingId,
  improvements,
  latitude,
  longitude,
  city,
  className,
}: ServiceProvidersProps) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, error } = trpc.marketplace.getRecommendedProviders.useQuery(
    { listingId, limit: 10, verifiedOnly: false },
    { enabled: !!listingId }
  );

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border bg-card p-4", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || data.providers.length === 0) {
    return null;
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDistance = (km: number | null) => {
    if (km === null) return null;
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  const displayedProviders = expanded ? data.providers : data.providers.slice(0, 3);

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Profesionales Recomendados</h3>
              <p className="text-xs text-muted-foreground">
                {data.providers.length} profesional{data.providers.length !== 1 ? "es" : ""} cerca de
                esta propiedad
              </p>
            </div>
          </div>

          {data.searchLocation.source !== "none" && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <MapPin className="h-3 w-3" />
                <span>Radio: {data.radiusUsedKm}km</span>
              </div>
            </div>
          )}
        </div>

        {/* Improvement categories being matched */}
        {improvements && improvements.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[...new Set(improvements.map((i) => i.category))].map((category) => {
              const config = categoryConfig[category];
              const CategoryIcon = config.icon;
              return (
                <Badge
                  key={category}
                  variant="outline"
                  className={cn("text-xs", config.bgColor, config.color)}
                >
                  <CategoryIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Providers List */}
      <div className="divide-y">
        {displayedProviders.map((item) => {
          const { provider, services, scores, distanceKm, isWithinCoverage } = item;
          const tier = tierConfig[provider.tier];

          return (
            <div key={provider.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex gap-3">
                {/* Logo/Avatar */}
                <div className="flex-shrink-0">
                  {provider.logoUrl ? (
                    <img
                      src={provider.logoUrl}
                      alt={provider.businessName}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wrench className="h-6 w-6 text-primary" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{provider.businessName}</h4>
                        {provider.isVerified && (
                          <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                        {tier.label && (
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1.5 py-0", tier.bgColor, tier.color)}
                          >
                            {tier.label}
                          </Badge>
                        )}
                      </div>

                      {/* Services offered */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {services.slice(0, 3).map((service) => {
                          const config = categoryConfig[service.category];
                          return (
                            <span
                              key={service.id}
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded",
                                config.bgColor,
                                config.color
                              )}
                            >
                              {service.title}
                            </span>
                          );
                        })}
                        {services.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{services.length - 3} mas
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span className="font-semibold text-sm">
                          {provider.averageRating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {provider.totalReviews} opinion{provider.totalReviews !== 1 ? "es" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {distanceKm !== null && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{formatDistance(distanceKm)}</span>
                        {isWithinCoverage && (
                          <span className="text-green-600 dark:text-green-400">(cubre zona)</span>
                        )}
                      </div>
                    )}

                    {provider.responseTimeMinutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          Responde en{" "}
                          {provider.responseTimeMinutes < 60
                            ? `${provider.responseTimeMinutes}min`
                            : `${Math.round(provider.responseTimeMinutes / 60)}h`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <span>{provider.city}</span>
                    </div>
                  </div>

                  {/* Price range */}
                  {services.length > 0 && services[0].priceMin && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Desde </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(services[0].priceMin)}
                      </span>
                      {services[0].priceMax && services[0].priceMax !== services[0].priceMin && (
                        <>
                          <span className="text-xs text-muted-foreground"> - </span>
                          <span className="text-sm font-medium">
                            {formatCurrency(services[0].priceMax)}
                          </span>
                        </>
                      )}
                      {services[0].priceUnit && (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          / {services[0].priceUnit}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" disabled>
                      <Phone className="h-3.5 w-3.5 mr-1" />
                      Contactar
                    </Button>
                    <Button size="sm" variant="default" className="flex-1" disabled>
                      Pedir presupuesto
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand/Collapse */}
      {data.providers.length > 3 && (
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Ver {data.providers.length - 3} mas
              </>
            )}
          </Button>
        </div>
      )}

      {/* CTA */}
      <div className="p-4 border-t">
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-2">
            Proximamente: Solicita presupuestos de profesionales verificados
          </p>
          <Button variant="outline" size="sm" disabled className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver todos los profesionales
          </Button>
        </div>
      </div>
    </div>
  );
}
