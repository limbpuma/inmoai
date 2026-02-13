"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Minus, Calendar, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PriceHistoryPoint {
  price: number;
  date: Date;
}

interface PriceHistoryChartProps {
  priceHistory: PriceHistoryPoint[];
  className?: string;
}

/**
 * PriceHistoryChart - Gráfico interactivo de historial de precios
 *
 * Features:
 * - Gráfico SVG con área rellena y gradiente
 * - Tooltips interactivos en cada punto
 * - Indicador visual de tendencia
 * - Etiquetas de fecha en eje X
 * - Lista detallada de cambios
 */
export function PriceHistoryChart({
  priceHistory,
  className
}: PriceHistoryChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

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

    // Añadir padding visual al rango
    const padding = (maxPrice - minPrice) * 0.1 || maxPrice * 0.05;
    const visualMin = minPrice - padding;
    const visualMax = maxPrice + padding;

    const totalChange = lastPrice - firstPrice;
    const percentChange = firstPrice > 0 ? ((totalChange / firstPrice) * 100) : 0;

    const trend: "up" | "down" | "stable" =
      percentChange > 1 ? "up" :
      percentChange < -1 ? "down" : "stable";

    // Detectar si está en mínimo histórico
    const isAtHistoricLow = lastPrice === minPrice && sortedHistory.length > 1;

    return {
      minPrice,
      maxPrice,
      visualMin,
      visualMax,
      firstPrice,
      lastPrice,
      totalChange,
      percentChange,
      trend,
      range: visualMax - visualMin,
      isAtHistoricLow,
      priceDrops: sortedHistory.filter((p, i) =>
        i > 0 && p.price < sortedHistory[i-1].price
      ).length,
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

  const formatShortDate = (date: Date) =>
    new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
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

  // Dimensiones del gráfico - viewBox responsive
  const chartWidth = 500;
  const chartHeight = 140;
  const chartPadding = { top: 15, right: 15, bottom: 30, left: 70 }; // left amplio para etiquetas de precio
  const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  // Calcular puntos del gráfico
  const getX = (index: number) =>
    chartPadding.left + (index / Math.max(sortedHistory.length - 1, 1)) * innerWidth;

  const getY = (price: number) => {
    if (!priceStats || priceStats.range === 0) return chartPadding.top + innerHeight / 2;
    return chartPadding.top + innerHeight - ((price - priceStats.visualMin) / priceStats.range) * innerHeight;
  };

  // Crear path para la línea
  const linePath = sortedHistory.map((point, i) =>
    `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(point.price)}`
  ).join(' ');

  // Crear path para el área rellena
  const areaPath = sortedHistory.length > 1
    ? `${linePath} L ${getX(sortedHistory.length - 1)} ${chartHeight - chartPadding.bottom} L ${getX(0)} ${chartHeight - chartPadding.bottom} Z`
    : '';

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header con tendencia */}
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

      {/* Indicador de mínimo histórico */}
      {priceStats?.isAtHistoricLow && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            Precio en mínimo histórico
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Este es el precio más bajo registrado para esta propiedad</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Gráfico SVG mejorado */}
      {priceStats && sortedHistory.length > 1 && (
        <div className="relative bg-muted/30 rounded-xl p-3 overflow-hidden">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto"
            preserveAspectRatio="xMidYMid meet"
            style={{ minHeight: '120px', maxHeight: '180px' }}
          >
            {/* Definir gradiente */}
            <defs>
              <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop
                  offset="0%"
                  className={priceStats.trend === "down"
                    ? "text-green-500"
                    : priceStats.trend === "up"
                      ? "text-red-500"
                      : "text-gray-500"
                  }
                  style={{ stopColor: "currentColor", stopOpacity: 0.3 }}
                />
                <stop
                  offset="100%"
                  className={priceStats.trend === "down"
                    ? "text-green-500"
                    : priceStats.trend === "up"
                      ? "text-red-500"
                      : "text-gray-500"
                  }
                  style={{ stopColor: "currentColor", stopOpacity: 0.05 }}
                />
              </linearGradient>
            </defs>

            {/* Líneas horizontales de referencia */}
            <line
              x1={chartPadding.left}
              y1={getY(priceStats.maxPrice)}
              x2={chartWidth - chartPadding.right}
              y2={getY(priceStats.maxPrice)}
              className="stroke-muted-foreground/20"
              strokeDasharray="4 4"
            />
            <line
              x1={chartPadding.left}
              y1={getY(priceStats.minPrice)}
              x2={chartWidth - chartPadding.right}
              y2={getY(priceStats.minPrice)}
              className="stroke-muted-foreground/20"
              strokeDasharray="4 4"
            />

            {/* Área rellena */}
            <path
              d={areaPath}
              fill="url(#priceGradient)"
            />

            {/* Línea principal */}
            <path
              d={linePath}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={trendColor}
              style={{ stroke: "currentColor" }}
            />

            {/* Puntos interactivos */}
            {sortedHistory.map((point, i) => (
              <g key={i}>
                {/* Área invisible para hover más fácil */}
                <circle
                  cx={getX(i)}
                  cy={getY(point.price)}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                {/* Punto visible */}
                <circle
                  cx={getX(i)}
                  cy={getY(point.price)}
                  r={hoveredPoint === i ? 6 : 4}
                  className={cn(
                    "fill-background stroke-2 transition-all duration-150",
                    trendColor
                  )}
                  style={{ stroke: "currentColor" }}
                />
                {/* Etiqueta de fecha en eje X */}
                {(i === 0 || i === sortedHistory.length - 1 || sortedHistory.length <= 4) && (
                  <text
                    x={getX(i)}
                    y={chartHeight - 5}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[9px]"
                  >
                    {formatShortDate(point.date)}
                  </text>
                )}
              </g>
            ))}

            {/* Tooltip del punto hover */}
            {hoveredPoint !== null && (() => {
              const pointX = getX(hoveredPoint);
              const pointY = getY(sortedHistory[hoveredPoint].price);
              const tooltipWidth = 100;
              const tooltipHeight = 32;
              // Ajustar posición X para evitar que se salga del gráfico
              const tooltipX = Math.min(
                Math.max(pointX - tooltipWidth / 2, chartPadding.left),
                chartWidth - chartPadding.right - tooltipWidth
              );
              // Posicionar arriba o abajo según espacio disponible
              const tooltipY = pointY > chartPadding.top + tooltipHeight + 10
                ? pointY - tooltipHeight - 8
                : pointY + 15;

              return (
                <g>
                  <rect
                    x={tooltipX}
                    y={tooltipY}
                    width={tooltipWidth}
                    height={tooltipHeight}
                    rx="6"
                    className="fill-popover stroke-border"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                  />
                  <text
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + 13}
                    textAnchor="middle"
                    className="fill-foreground text-[11px] font-semibold"
                  >
                    {formatPrice(sortedHistory[hoveredPoint].price)}
                  </text>
                  <text
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + 25}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[9px]"
                  >
                    {formatDate(sortedHistory[hoveredPoint].date)}
                  </text>
                </g>
              );
            })()}

            {/* Etiquetas de precio min/max - posicionadas a la izquierda */}
            <text
              x={chartPadding.left - 5}
              y={getY(priceStats.maxPrice) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px] font-medium"
            >
              {formatPrice(priceStats.maxPrice)}
            </text>
            <text
              x={chartPadding.left - 5}
              y={getY(priceStats.minPrice) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px] font-medium"
            >
              {formatPrice(priceStats.minPrice)}
            </text>
          </svg>
        </div>
      )}

      {/* Resumen de precios */}
      {priceStats && sortedHistory.length > 1 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Precio inicial</p>
            <p className="font-semibold">{formatPrice(priceStats.firstPrice)}</p>
          </div>
          <div className={cn(
            "p-3 rounded-lg",
            priceStats.trend === "down"
              ? "bg-green-50 dark:bg-green-950/30"
              : priceStats.trend === "up"
                ? "bg-red-50 dark:bg-red-950/30"
                : "bg-muted/50"
          )}>
            <p className="text-xs text-muted-foreground mb-1">Precio actual</p>
            <p className={cn(
              "font-semibold",
              priceStats.trend === "down" ? "text-green-700 dark:text-green-300" :
              priceStats.trend === "up" ? "text-red-700 dark:text-red-300" : ""
            )}>
              {formatPrice(priceStats.lastPrice)}
            </p>
          </div>
        </div>
      )}

      {/* Lista de cambios de precio */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Cambios registrados ({sortedHistory.length})
        </h3>
        {sortedHistory.slice().reverse().slice(0, 5).map((point, index) => {
          const prevPoint = sortedHistory[sortedHistory.length - 2 - index];
          const change = prevPoint ? point.price - prevPoint.price : 0;
          const changePercent = prevPoint && prevPoint.price > 0
            ? ((change / prevPoint.price) * 100)
            : 0;

          return (
            <div
              key={index}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg text-sm",
                index === 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground min-w-[70px]">
                  {formatDate(point.date)}
                </span>
                <span className="font-semibold">
                  {formatPrice(point.price)}
                </span>
                {index === 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    Actual
                  </span>
                )}
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

      {/* Info de bajadas */}
      {priceStats && priceStats.priceDrops > 0 && (
        <div className="text-center pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <span className="text-green-600 dark:text-green-400 font-medium">
              {priceStats.priceDrops} bajada{priceStats.priceDrops !== 1 ? 's' : ''} de precio
            </span>
            {" "}registrada{priceStats.priceDrops !== 1 ? 's' : ''} — vendedor posiblemente motivado
          </p>
        </div>
      )}
    </div>
  );
}
