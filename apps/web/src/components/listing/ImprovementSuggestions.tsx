"use client";

import { useState } from "react";
import {
  Lightbulb,
  PaintBucket,
  Wrench,
  Zap,
  Droplets,
  TreeDeciduous,
  ChevronDown,
  ChevronUp,
  Euro,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Improvement {
  id: string;
  category: "painting" | "renovation" | "electrical" | "plumbing" | "garden" | "general";
  title: string;
  description: string;
  estimatedCost: { min: number; max: number };
  potentialValueIncrease: number; // Porcentaje de incremento de valor estimado
  priority: "high" | "medium" | "low";
  detectedFrom?: string; // Qué imagen/análisis lo detectó
}

interface ImprovementSuggestionsProps {
  improvements: Improvement[];
  currentPrice: number | null;
  className?: string;
}

const categoryConfig = {
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
    label: "Fontanería",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
  },
  garden: {
    icon: TreeDeciduous,
    label: "Jardín/Exterior",
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

const priorityConfig = {
  high: {
    label: "Alta prioridad",
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  medium: {
    label: "Media prioridad",
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  low: {
    label: "Baja prioridad",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
};

/**
 * ImprovementSuggestions - Sugerencias de mejora basadas en análisis IA
 *
 * PROPUESTA DE VALOR FUTURA:
 * - Detecta áreas de mejora en las imágenes
 * - Estima costes y potencial incremento de valor
 * - Conectará con marketplace de profesionales (albañiles, pintores, etc.)
 *
 * Modelo de negocio:
 * - Profesionales pagan por aparecer
 * - Algoritmo ordena por calidad/precio/valoraciones (no solo por pago)
 * - Leads cualificados para profesionales
 */
export function ImprovementSuggestions({
  improvements,
  currentPrice,
  className,
}: ImprovementSuggestionsProps) {
  const [expanded, setExpanded] = useState(false);

  if (!improvements || improvements.length === 0) return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);

  // Calcular totales
  const totalMinCost = improvements.reduce((sum, i) => sum + i.estimatedCost.min, 0);
  const totalMaxCost = improvements.reduce((sum, i) => sum + i.estimatedCost.max, 0);
  const totalValueIncrease = improvements.reduce((sum, i) => sum + i.potentialValueIncrease, 0);

  const potentialNewValue = currentPrice
    ? currentPrice * (1 + totalValueIncrease / 100)
    : null;

  const displayedImprovements = expanded ? improvements : improvements.slice(0, 2);

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Sugerencias de Mejora IA</h3>
              <p className="text-xs text-muted-foreground">
                {improvements.length} mejora{improvements.length !== 1 ? "s" : ""} detectada{improvements.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* ROI Summary */}
          <div className="text-right">
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span className="font-bold">+{totalValueIncrease.toFixed(1)}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">valor potencial</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/50 p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Euro className="h-3 w-3" />
              <span className="text-xs">Inversión estimada</span>
            </div>
            <p className="font-semibold">
              {formatCurrency(totalMinCost)} - {formatCurrency(totalMaxCost)}
            </p>
          </div>
          {potentialNewValue && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-2">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs">Valor potencial</span>
              </div>
              <p className="font-semibold text-green-700 dark:text-green-300">
                {formatCurrency(potentialNewValue)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Improvements List */}
      <div className="divide-y">
        {displayedImprovements.map((improvement) => {
          const category = categoryConfig[improvement.category];
          const priority = priorityConfig[improvement.priority];
          const CategoryIcon = category.icon;

          return (
            <div key={improvement.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg flex-shrink-0", category.bgColor)}>
                  <CategoryIcon className={cn("h-4 w-4", category.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm">{improvement.title}</h4>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full",
                        priority.bgColor,
                        priority.color
                      )}
                    >
                      {priority.label}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    {improvement.description}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Euro className="h-3 w-3 text-muted-foreground" />
                      <span>
                        {formatCurrency(improvement.estimatedCost.min)} -{" "}
                        {formatCurrency(improvement.estimatedCost.max)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span>+{improvement.potentialValueIncrease}% valor</span>
                    </div>
                  </div>

                  {improvement.detectedFrom && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Detectado en: {improvement.detectedFrom}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand/Collapse & CTA */}
      <div className="p-4 border-t space-y-3">
        {improvements.length > 2 && (
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
                Ver {improvements.length - 2} más
              </>
            )}
          </Button>
        )}

        {/* Future: Connect with professionals */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-2">
            Próximamente: Conecta con profesionales verificados
          </p>
          <Button variant="outline" size="sm" disabled className="w-full">
            <Wrench className="h-4 w-4 mr-2" />
            Buscar profesionales
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2">
            Albañiles, pintores, electricistas y más - ordenados por calidad y precio
          </p>
        </div>
      </div>
    </div>
  );
}
