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
  ClipboardCheck,
  Scale,
  FileText,
  Home,
  type LucideIcon,
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
  detectedFrom?: string; // Que imagen/analisis lo detecto
}

interface ImprovementSuggestionsProps {
  improvements: Improvement[];
  currentPrice: number | null;
  operationType: "sale" | "rent";
  className?: string;
}

// Configuracion por categoria (compartida entre modos)
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
    label: "Fontaneria",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
  },
  garden: {
    icon: TreeDeciduous,
    label: "Jardin/Exterior",
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

// Configuracion por modo de operacion (comprar vs alquilar)
interface ModeConfig {
  title: string;
  subtitle: (count: number) => string;
  headerIcon: LucideIcon;
  headerBadgeLabel: string;
  headerBadgeIcon: LucideIcon;
  summaryLabel1: string;
  summaryLabel2: string;
  summaryIcon2: LucideIcon;
  summaryBgColor2: string;
  summaryTextColor2: string;
  priorityLabels: Record<"high" | "medium" | "low", string>;
  priorityColors: Record<"high" | "medium" | "low", { text: string; bg: string }>;
  costLabel: string;
  impactIcon: LucideIcon;
  impactFormatter: (value: number) => string;
  impactColor: string;
  ctaTitle: string;
  ctaButton: string;
  ctaButtonIcon: LucideIcon;
  ctaDescription: string;
}

const modeConfig: Record<"sale" | "rent", ModeConfig> = {
  sale: {
    title: "Sugerencias de Mejora IA",
    subtitle: (count) => `${count} mejora${count !== 1 ? "s" : ""} detectada${count !== 1 ? "s" : ""}`,
    headerIcon: Sparkles,
    headerBadgeLabel: "valor potencial",
    headerBadgeIcon: TrendingUp,
    summaryLabel1: "Inversion estimada",
    summaryLabel2: "Valor potencial",
    summaryIcon2: TrendingUp,
    summaryBgColor2: "bg-green-50 dark:bg-green-950/30",
    summaryTextColor2: "text-green-600 dark:text-green-400",
    priorityLabels: {
      high: "Alta prioridad",
      medium: "Media prioridad",
      low: "Baja prioridad",
    },
    priorityColors: {
      high: { text: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
      medium: { text: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
      low: { text: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
    },
    costLabel: "",
    impactIcon: TrendingUp,
    impactFormatter: (value) => `+${value}% valor`,
    impactColor: "text-green-600",
    ctaTitle: "Proximamente: Conecta con profesionales verificados",
    ctaButton: "Buscar profesionales",
    ctaButtonIcon: Wrench,
    ctaDescription: "Albaniles, pintores, electricistas y mas - ordenados por calidad y precio",
  },
  rent: {
    title: "Condicion del Inmueble",
    subtitle: (count) => `${count} aspecto${count !== 1 ? "s" : ""} a revisar`,
    headerIcon: ClipboardCheck,
    headerBadgeLabel: "puntos negociables",
    headerBadgeIcon: Scale,
    summaryLabel1: "Coste de reparaciones",
    summaryLabel2: "Impacto en habitabilidad",
    summaryIcon2: Home,
    summaryBgColor2: "bg-amber-50 dark:bg-amber-950/30",
    summaryTextColor2: "text-amber-600 dark:text-amber-400",
    priorityLabels: {
      high: "Urgente",
      medium: "Importante",
      low: "Menor",
    },
    priorityColors: {
      high: { text: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
      medium: { text: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
      low: { text: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
    },
    costLabel: "(propietario)",
    impactIcon: Home,
    impactFormatter: (value) => value >= 8 ? "Impacto: Alto" : value >= 4 ? "Impacto: Medio" : "Impacto: Bajo",
    impactColor: "text-amber-600",
    ctaTitle: "Usa estos puntos en tu negociacion",
    ctaButton: "Generar informe",
    ctaButtonIcon: FileText,
    ctaDescription: "Solicita reparaciones al arrendador o negocia reduccion de renta",
  },
};

/**
 * ImprovementSuggestions - Sugerencias de mejora basadas en analisis IA
 *
 * MODO COMPRA (sale):
 * - Enfoque en ROI e inversion
 * - Muestra potencial incremento de valor
 * - Conecta con marketplace de profesionales
 *
 * MODO ALQUILER (rent):
 * - Enfoque en negociacion y habitabilidad
 * - Muestra puntos para negociar con el arrendador
 * - Genera informe de condicion para el inquilino
 */
export function ImprovementSuggestions({
  improvements,
  currentPrice,
  operationType,
  className,
}: ImprovementSuggestionsProps) {
  const [expanded, setExpanded] = useState(false);

  if (!improvements || improvements.length === 0) return null;

  const config = modeConfig[operationType];
  const HeaderIcon = config.headerIcon;
  const HeaderBadgeIcon = config.headerBadgeIcon;
  const SummaryIcon2 = config.summaryIcon2;
  const ImpactIcon = config.impactIcon;
  const CtaButtonIcon = config.ctaButtonIcon;

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

  // Modo compra: valor potencial del inmueble
  const potentialNewValue = currentPrice && operationType === "sale"
    ? currentPrice * (1 + totalValueIncrease / 100)
    : null;

  // Modo alquiler: nivel de impacto general
  const overallImpact = totalValueIncrease >= 15 ? "Alto" : totalValueIncrease >= 8 ? "Medio" : "Bajo";
  const urgentIssues = improvements.filter(i => i.priority === "high").length;

  const displayedImprovements = expanded ? improvements : improvements.slice(0, 2);

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <HeaderIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{config.title}</h3>
              <p className="text-xs text-muted-foreground">
                {config.subtitle(improvements.length)}
              </p>
            </div>
          </div>

          {/* Badge Summary */}
          <div className="text-right">
            <div className={cn(
              "flex items-center gap-1",
              operationType === "sale"
                ? "text-green-600 dark:text-green-400"
                : "text-amber-600 dark:text-amber-400"
            )}>
              <HeaderBadgeIcon className="h-4 w-4" />
              <span className="font-bold">
                {operationType === "sale"
                  ? `+${totalValueIncrease.toFixed(1)}%`
                  : `${improvements.length}`
                }
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">{config.headerBadgeLabel}</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/50 p-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Euro className="h-3 w-3" />
              <span className="text-xs">{config.summaryLabel1}</span>
            </div>
            <p className="font-semibold">
              {formatCurrency(totalMinCost)} - {formatCurrency(totalMaxCost)}
            </p>
            {operationType === "rent" && (
              <p className="text-[10px] text-muted-foreground">Responsabilidad del arrendador</p>
            )}
          </div>

          <div className={cn("rounded-lg p-2", config.summaryBgColor2)}>
            <div className={cn("flex items-center gap-1", config.summaryTextColor2)}>
              <SummaryIcon2 className="h-3 w-3" />
              <span className="text-xs">{config.summaryLabel2}</span>
            </div>
            {operationType === "sale" && potentialNewValue ? (
              <p className="font-semibold text-green-700 dark:text-green-300">
                {formatCurrency(potentialNewValue)}
              </p>
            ) : (
              <p className={cn("font-semibold", config.summaryTextColor2)}>
                {overallImpact}
                {urgentIssues > 0 && (
                  <span className="text-xs font-normal ml-1">
                    ({urgentIssues} urgente{urgentIssues !== 1 ? "s" : ""})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Improvements List */}
      <div className="divide-y">
        {displayedImprovements.map((improvement) => {
          const category = categoryConfig[improvement.category];
          const priorityLabel = config.priorityLabels[improvement.priority];
          const priorityColor = config.priorityColors[improvement.priority];
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
                        priorityColor.bg,
                        priorityColor.text
                      )}
                    >
                      {priorityLabel}
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
                        {config.costLabel && (
                          <span className="text-muted-foreground ml-1">{config.costLabel}</span>
                        )}
                      </span>
                    </div>
                    <div className={cn("flex items-center gap-1", config.impactColor)}>
                      <ImpactIcon className="h-3 w-3" />
                      <span>{config.impactFormatter(improvement.potentialValueIncrease)}</span>
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
                Ver {improvements.length - 2} mas
              </>
            )}
          </Button>
        )}

        {/* CTA Section */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-2">
            {config.ctaTitle}
          </p>
          <Button variant="outline" size="sm" disabled className="w-full">
            <CtaButtonIcon className="h-4 w-4 mr-2" />
            {config.ctaButton}
          </Button>
          <p className="text-[10px] text-muted-foreground mt-2">
            {config.ctaDescription}
          </p>
        </div>
      </div>
    </div>
  );
}
