"use client";

import { TrendingDown, TrendingUp, Minus, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceComparisonProps {
  currentPrice: number | null;
  valuationEstimate: number | null;
  valuationConfidence: number | null;
  className?: string;
}

type PriceStatus = "below_market" | "fair_price" | "above_market";

/**
 * PriceComparison - Comparador de precio vs valoración IA
 *
 * Features:
 * - Comparación visual precio vs valoración
 * - Indicador de oportunidad/sobreprecio
 * - Nivel de confianza de la valoración
 * - Porcentaje de diferencia
 */
export function PriceComparison({
  currentPrice,
  valuationEstimate,
  valuationConfidence,
  className,
}: PriceComparisonProps) {
  if (!currentPrice || !valuationEstimate) return null;

  const difference = currentPrice - valuationEstimate;
  const percentDiff = (difference / valuationEstimate) * 100;

  const priceStatus: PriceStatus = (() => {
    if (percentDiff < -5) return "below_market";
    if (percentDiff > 5) return "above_market";
    return "fair_price";
  })();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);

  const statusConfig = {
    below_market: {
      label: "Oportunidad",
      description: "Por debajo del valor de mercado",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
      textColor: "text-green-700 dark:text-green-300",
      badgeColor: "bg-green-500",
      icon: TrendingDown,
    },
    fair_price: {
      label: "Precio justo",
      description: "Acorde al valor de mercado",
      bgColor: "bg-gray-50 dark:bg-gray-900/50",
      borderColor: "border-gray-200 dark:border-gray-800",
      textColor: "text-gray-700 dark:text-gray-300",
      badgeColor: "bg-gray-500",
      icon: Minus,
    },
    above_market: {
      label: "Sobreprecio",
      description: "Por encima del valor de mercado",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      borderColor: "border-amber-200 dark:border-amber-800",
      textColor: "text-amber-700 dark:text-amber-300",
      badgeColor: "bg-amber-500",
      icon: TrendingUp,
    },
  };

  const config = statusConfig[priceStatus];
  const Icon = config.icon;

  // Calcular posición del marcador de precio en la barra
  const barMin = valuationEstimate * 0.8;
  const barMax = valuationEstimate * 1.2;
  const pricePosition = Math.max(0, Math.min(100,
    ((currentPrice - barMin) / (barMax - barMin)) * 100
  ));
  const valuationPosition = 50; // Siempre al centro

  return (
    <div className={cn("rounded-xl border p-4", config.bgColor, config.borderColor, className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Análisis de Precio IA
        </h3>
        <div className={cn(
          "px-2 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1",
          config.badgeColor
        )}>
          <Icon className="h-3 w-3" />
          {config.label}
        </div>
      </div>

      {/* Comparación visual */}
      <div className="space-y-4">
        {/* Precio actual */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Precio anunciado</span>
          <span className="text-lg font-bold">{formatPrice(currentPrice)}</span>
        </div>

        {/* Barra de comparación */}
        <div className="relative h-8 bg-muted/50 rounded-full overflow-hidden">
          {/* Zona de valor justo */}
          <div
            className="absolute h-full bg-green-200/50 dark:bg-green-800/30"
            style={{ left: "40%", width: "20%" }}
          />

          {/* Marcador de valoración */}
          <div
            className="absolute top-0 h-full w-1 bg-primary"
            style={{ left: `${valuationPosition}%`, transform: "translateX(-50%)" }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-primary font-medium whitespace-nowrap">
              <Target className="h-3 w-3 inline mr-1" />
              Valor IA
            </div>
          </div>

          {/* Marcador de precio actual */}
          <div
            className="absolute top-0 h-full w-3 rounded-full transition-all"
            style={{
              left: `${pricePosition}%`,
              transform: "translateX(-50%)",
              backgroundColor: priceStatus === "below_market" ? "#22c55e" :
                              priceStatus === "above_market" ? "#f59e0b" : "#6b7280"
            }}
          />
        </div>

        {/* Valoración IA */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Valoración IA</span>
          <span className="text-lg font-semibold text-primary">{formatPrice(valuationEstimate)}</span>
        </div>

        {/* Diferencia */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg",
          config.bgColor
        )}>
          <span className="text-sm font-medium">Diferencia</span>
          <div className="text-right">
            <span className={cn("text-lg font-bold", config.textColor)}>
              {difference > 0 ? "+" : ""}{formatPrice(difference)}
            </span>
            <span className={cn("text-sm ml-2", config.textColor)}>
              ({percentDiff > 0 ? "+" : ""}{percentDiff.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Confianza */}
        {valuationConfidence !== null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confianza del análisis</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${valuationConfidence * 100}%` }}
                />
              </div>
              <span className="font-medium">{Math.round(valuationConfidence * 100)}%</span>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {config.description}. Basado en comparables y análisis de mercado.
        </p>
      </div>
    </div>
  );
}
