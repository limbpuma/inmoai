"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp, Minus, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceHistoryPoint {
  price: number;
  date: Date;
}

interface PriceHistoryChartProps {
  priceHistory: PriceHistoryPoint[];
  currentPrice: number | null;
  className?: string;
}

/**
 * PriceHistoryChart - Componente reutilizable para mostrar historial de precios
 *
 * Features:
 * - Gráfico de línea simple con CSS (sin dependencias externas)
 * - Indicador de tendencia (subida/bajada)
 * - Lista de cambios de precio con fechas
 * - Cálculo automático de variación porcentual
 */
export function PriceHistoryChart({
  priceHistory,
  currentPrice,
  className
}: PriceHistoryChartProps) {
  const sortedHistory = useMemo(() => {
    return [...priceHistory]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [priceHistory]);

  const priceStats = useMemo(() => {
    if (sortedHistory.length === 0) return null;

    const prices = sortedHistory.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];

    const totalChange = lastPrice - firstPrice;
    const percentChange = firstPrice > 0 ? ((totalChange / firstPrice) * 100) : 0;

    const trend: "up" | "down" | "stable" =
      percentChange > 1 ? "up" :
      percentChange < -1 ? "down" : "stable";

    return {
      minPrice,
      maxPrice,
      firstPrice,
      lastPrice,
      totalChange,
      percentChange,
      trend,
      range: maxPrice - minPrice,
    };
  }, [sortedHistory]);

  if (!priceHistory || priceHistory.length === 0) {
    return null;
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(price);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      year: "2-digit"
    }).format(new Date(date));

  const TrendIcon = priceStats?.trend === "up"
    ? TrendingUp
    : priceStats?.trend === "down"
      ? TrendingDown
      : Minus;

  const trendColor = priceStats?.trend === "up"
    ? "text-red-500"
    : priceStats?.trend === "down"
      ? "text-green-500"
      : "text-gray-500";

  const trendBgColor = priceStats?.trend === "up"
    ? "bg-red-50 dark:bg-red-950/20"
    : priceStats?.trend === "down"
      ? "bg-green-50 dark:bg-green-950/20"
      : "bg-gray-50 dark:bg-gray-900/50";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          Historial de Precios
        </h2>

        {priceStats && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
            trendBgColor,
            trendColor
          )}>
            <TrendIcon className="h-4 w-4" />
            <span>
              {priceStats.percentChange > 0 ? "+" : ""}
              {priceStats.percentChange.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Mini Chart - CSS only */}
      {priceStats && sortedHistory.length > 1 && (
        <div className="relative h-24 w-full bg-muted/30 rounded-lg p-4">
          <svg
            viewBox={`0 0 ${sortedHistory.length * 50} 100`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Line path */}
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={trendColor}
              points={sortedHistory.map((point, i) => {
                const x = (i / (sortedHistory.length - 1)) * (sortedHistory.length * 50 - 10) + 5;
                const y = priceStats.range > 0
                  ? 95 - ((point.price - priceStats.minPrice) / priceStats.range) * 90
                  : 50;
                return `${x},${y}`;
              }).join(" ")}
            />
            {/* Dots */}
            {sortedHistory.map((point, i) => {
              const x = (i / (sortedHistory.length - 1)) * (sortedHistory.length * 50 - 10) + 5;
              const y = priceStats.range > 0
                ? 95 - ((point.price - priceStats.minPrice) / priceStats.range) * 90
                : 50;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="4"
                  className={cn("fill-current", trendColor)}
                />
              );
            })}
          </svg>

          {/* Price labels */}
          <div className="absolute left-2 top-1 text-xs text-muted-foreground">
            {formatPrice(priceStats.maxPrice)}
          </div>
          <div className="absolute left-2 bottom-1 text-xs text-muted-foreground">
            {formatPrice(priceStats.minPrice)}
          </div>
        </div>
      )}

      {/* Price History List */}
      <div className="space-y-2">
        {sortedHistory.slice().reverse().slice(0, 5).map((point, index) => {
          const prevPoint = sortedHistory[sortedHistory.length - 2 - index];
          const change = prevPoint ? point.price - prevPoint.price : 0;
          const changePercent = prevPoint && prevPoint.price > 0
            ? ((change / prevPoint.price) * 100)
            : 0;

          return (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {formatDate(point.date)}
                </span>
                <span className="font-semibold">
                  {formatPrice(point.price)}
                </span>
              </div>

              {index < sortedHistory.length - 1 && change !== 0 && (
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  change > 0
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                )}>
                  {change > 0 ? "+" : ""}{changePercent.toFixed(1)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {sortedHistory.length > 5 && (
        <p className="text-xs text-muted-foreground text-center">
          Mostrando últimos 5 cambios de {sortedHistory.length} registrados
        </p>
      )}
    </div>
  );
}
