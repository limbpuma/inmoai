"use client";

import { AlertCircle, CheckCircle2, Clock, TrendingDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AvailabilityIndicatorProps {
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  priceHistory?: { price: number; date: Date }[];
  authenticityScore: number | null;
  status?: string;
  className?: string;
}

type AvailabilityLevel = "high" | "medium" | "low" | "unknown";

interface AvailabilityFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
}

/**
 * AvailabilityIndicator - Indicador de probabilidad de disponibilidad
 *
 * KILLER FEATURE: Calcula si el inmueble probablemente sigue disponible
 * basándose en:
 * - Antigüedad del anuncio
 * - Historial de precios (bajadas = motivación)
 * - Última vez que se actualizó
 * - Estado del listing
 */
export function AvailabilityIndicator({
  firstSeenAt,
  lastSeenAt,
  priceHistory = [],
  authenticityScore,
  status = "active",
  className,
}: AvailabilityIndicatorProps) {
  // Calcular días en mercado
  const getDaysOnMarket = (date: Date | null): number => {
    if (!date) return 0;
    const now = new Date();
    return Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  };

  // Calcular días desde última actualización
  const getDaysSinceUpdate = (date: Date | null): number => {
    if (!date) return 999;
    const now = new Date();
    return Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  };

  // Contar bajadas de precio
  const countPriceDrops = (): number => {
    if (priceHistory.length < 2) return 0;
    let drops = 0;
    const sorted = [...priceHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].price < sorted[i - 1].price) drops++;
    }
    return drops;
  };

  const daysOnMarket = getDaysOnMarket(firstSeenAt);
  const daysSinceUpdate = getDaysSinceUpdate(lastSeenAt);
  const priceDrops = countPriceDrops();

  // Calcular probabilidad de disponibilidad (0-100)
  const calculateAvailabilityScore = (): number => {
    let score = 100;

    // Factor: Antigüedad (más antiguo = menos probable)
    if (daysOnMarket > 180) score -= 40;
    else if (daysOnMarket > 90) score -= 25;
    else if (daysOnMarket > 60) score -= 15;
    else if (daysOnMarket > 30) score -= 5;

    // Factor: Última actualización (si no se actualiza, podría estar vendido)
    if (daysSinceUpdate > 30) score -= 20;
    else if (daysSinceUpdate > 14) score -= 10;
    else if (daysSinceUpdate > 7) score -= 5;

    // Factor: Bajadas de precio (indica que sigue activo y motivado)
    if (priceDrops > 0) score += Math.min(priceDrops * 5, 15);

    // Factor: Status
    if (status === "sold" || status === "rented") score = 5;
    if (status === "inactive" || status === "expired") score = 15;

    // Factor: Autenticidad (anuncios fraudulentos podrían ser falsos)
    if (authenticityScore !== null && authenticityScore < 50) score -= 20;

    return Math.max(5, Math.min(100, score));
  };

  const availabilityScore = calculateAvailabilityScore();

  // Determinar nivel de disponibilidad
  const getAvailabilityLevel = (): AvailabilityLevel => {
    if (status === "sold" || status === "rented") return "low";
    if (availabilityScore >= 75) return "high";
    if (availabilityScore >= 50) return "medium";
    if (availabilityScore >= 25) return "low";
    return "unknown";
  };

  const level = getAvailabilityLevel();

  // Recopilar factores que afectan la disponibilidad
  const getFactors = (): AvailabilityFactor[] => {
    const factors: AvailabilityFactor[] = [];

    // Antigüedad
    if (daysOnMarket <= 7) {
      factors.push({
        name: "Recién publicado",
        impact: "positive",
        description: `Solo ${daysOnMarket} días en mercado`
      });
    } else if (daysOnMarket > 90) {
      factors.push({
        name: "Anuncio antiguo",
        impact: "negative",
        description: `${daysOnMarket} días en mercado`
      });
    }

    // Última actualización
    if (daysSinceUpdate <= 2) {
      factors.push({
        name: "Actualizado recientemente",
        impact: "positive",
        description: "Visto en las últimas 48h"
      });
    } else if (daysSinceUpdate > 14) {
      factors.push({
        name: "Sin actualizaciones",
        impact: "negative",
        description: `${daysSinceUpdate} días sin cambios`
      });
    }

    // Bajadas de precio
    if (priceDrops > 0) {
      factors.push({
        name: "Bajadas de precio",
        impact: "positive",
        description: `${priceDrops} bajada(s) - vendedor motivado`
      });
    }

    // Status especiales
    if (status === "sold" || status === "rented") {
      factors.push({
        name: "Marcado como vendido/alquilado",
        impact: "negative",
        description: "El inmueble ya no está disponible"
      });
    }

    return factors;
  };

  const factors = getFactors();

  const levelConfig = {
    high: {
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      borderColor: "border-green-200 dark:border-green-800",
      icon: CheckCircle2,
      label: "Alta probabilidad",
      description: "Muy probable que siga disponible"
    },
    medium: {
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      borderColor: "border-amber-200 dark:border-amber-800",
      icon: Clock,
      label: "Probabilidad media",
      description: "Recomendamos verificar disponibilidad"
    },
    low: {
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      borderColor: "border-red-200 dark:border-red-800",
      icon: AlertCircle,
      label: "Baja probabilidad",
      description: "Podría no estar disponible"
    },
    unknown: {
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-900/30",
      borderColor: "border-gray-200 dark:border-gray-800",
      icon: HelpCircle,
      label: "Sin datos suficientes",
      description: "No podemos estimar disponibilidad"
    }
  };

  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "rounded-lg border p-3 cursor-help",
              config.bgColor,
              config.borderColor,
              className
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-5 w-5", config.color)} />
                <div>
                  <p className={cn("font-medium text-sm", config.color)}>
                    {config.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    de disponibilidad
                  </p>
                </div>
              </div>
              <div className={cn("text-2xl font-bold", config.color)}>
                {availabilityScore}%
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-3 max-w-[280px]">
          <div className="space-y-2">
            <p className="font-semibold text-sm">{config.description}</p>
            {factors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">
                  Factores analizados:
                </p>
                {factors.map((factor, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "text-xs flex items-center gap-1",
                      factor.impact === "positive"
                        ? "text-green-600"
                        : factor.impact === "negative"
                        ? "text-red-600"
                        : "text-gray-600"
                    )}
                  >
                    <span>{factor.impact === "positive" ? "+" : "-"}</span>
                    <span>{factor.name}: {factor.description}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-2">
              Estimación basada en análisis de mercado. Siempre confirma con el anunciante.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
