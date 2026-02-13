"use client";

import { ExternalLink, Clock, TrendingDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExternalSourceCardProps {
  sourceName: string;
  sourceUrl: string | null;
  externalUrl: string | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  priceDropCount?: number;
  className?: string;
}

/**
 * ExternalSourceCard - Componente honesto para ver el anuncio en el portal original
 *
 * Reemplaza al ContactForm falso. Proporciona:
 * - Link directo al anuncio original
 * - Información sobre cuándo fue visto por primera/última vez
 * - Indicador de bajadas de precio
 */
export function ExternalSourceCard({
  sourceName,
  sourceUrl,
  externalUrl,
  firstSeenAt,
  lastSeenAt,
  priceDropCount = 0,
  className,
}: ExternalSourceCardProps) {
  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return "Desconocido";

    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) return `hace ${diffMinutes} min`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays === 1) return "hace 1 día";
    if (diffDays < 7) return `hace ${diffDays} días`;
    if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`;
    if (diffDays < 365) return `hace ${Math.floor(diffDays / 30)} meses`;
    return `hace ${Math.floor(diffDays / 365)} años`;
  };

  const getDaysOnMarket = (date: Date | null): number => {
    if (!date) return 0;
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const daysOnMarket = getDaysOnMarket(firstSeenAt);

  // Determinar estado de urgencia basado en antigüedad
  const getUrgencyConfig = () => {
    if (daysOnMarket <= 7) {
      return {
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-950/30",
        label: "Recién publicado",
        description: "Alta probabilidad de disponibilidad"
      };
    }
    if (daysOnMarket <= 30) {
      return {
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        label: "Publicado recientemente",
        description: "Probablemente disponible"
      };
    }
    if (daysOnMarket <= 90) {
      return {
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        label: "Lleva tiempo en mercado",
        description: "Verificar disponibilidad"
      };
    }
    return {
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      label: "Anuncio antiguo",
      description: "Podría no estar disponible"
    };
  };

  const urgency = getUrgencyConfig();

  return (
    <div className={cn("rounded-xl border bg-card p-4 space-y-4", className)}>
      {/* Header con fuente */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Ver anuncio original</h3>
          <p className="text-sm text-muted-foreground">
            Publicado en {sourceName}
          </p>
        </div>
        {sourceUrl && (
          <div className="text-2xl font-bold text-primary">
            {sourceName}
          </div>
        )}
      </div>

      {/* Indicador de antigüedad */}
      <div className={cn("rounded-lg p-3", urgency.bgColor)}>
        <div className="flex items-center gap-2">
          <Clock className={cn("h-4 w-4", urgency.color)} />
          <span className={cn("font-medium text-sm", urgency.color)}>
            {urgency.label}
          </span>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Primera vez visto:</span>
            <br />
            {formatTimeAgo(firstSeenAt)}
          </div>
          <div>
            <span className="font-medium">Última actualización:</span>
            <br />
            {formatTimeAgo(lastSeenAt)}
          </div>
        </div>
        {daysOnMarket > 30 && (
          <p className={cn("text-xs mt-2", urgency.color)}>
            <AlertCircle className="h-3 w-3 inline mr-1" />
            {urgency.description}
          </p>
        )}
      </div>

      {/* Indicador de bajadas de precio */}
      {priceDropCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <TrendingDown className="h-4 w-4" />
          <span>
            {priceDropCount} {priceDropCount === 1 ? "bajada" : "bajadas"} de precio registradas
          </span>
        </div>
      )}

      {/* Botón principal - ir al portal */}
      {externalUrl ? (
        <Button asChild className="w-full" size="lg">
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Ver y contactar en {sourceName}
          </a>
        </Button>
      ) : (
        <Button disabled className="w-full" size="lg">
          <ExternalLink className="h-4 w-4 mr-2" />
          Enlace no disponible
        </Button>
      )}

      {/* Disclaimer honesto */}
      <p className="text-xs text-muted-foreground text-center">
        Este anuncio fue indexado de {sourceName}. Para contactar con el anunciante,
        visita el portal original.
      </p>
    </div>
  );
}