"use client";

import { AlertTriangle, ShieldAlert, Eye, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIIssue {
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
  location?: string;
}

interface FraudAlertBannerProps {
  authenticityScore: number | null;
  isAiGenerated: boolean | null;
  aiIssues: AIIssue[] | null;
  className?: string;
}

type AlertLevel = "critical" | "warning" | "info" | "safe";

/**
 * FraudAlertBanner - Banner de alerta de fraude reutilizable
 *
 * Muestra alertas basadas en:
 * - Score de autenticidad bajo (<70%)
 * - Detección de contenido generado por IA
 * - Issues de alta severidad detectados
 */
export function FraudAlertBanner({
  authenticityScore,
  isAiGenerated,
  aiIssues,
  className,
}: FraudAlertBannerProps) {
  const highSeverityIssues = aiIssues?.filter(i => i.severity === "high") ?? [];
  const mediumSeverityIssues = aiIssues?.filter(i => i.severity === "medium") ?? [];

  // Determinar nivel de alerta
  const alertLevel: AlertLevel = (() => {
    if (isAiGenerated === true) return "critical";
    if (authenticityScore !== null && authenticityScore < 50) return "critical";
    if (highSeverityIssues.length > 0) return "critical";
    if (authenticityScore !== null && authenticityScore < 70) return "warning";
    if (mediumSeverityIssues.length > 0) return "warning";
    if (authenticityScore !== null && authenticityScore < 85) return "info";
    return "safe";
  })();

  // No mostrar banner si es seguro
  if (alertLevel === "safe") return null;

  const alertConfig = {
    critical: {
      bgColor: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
      textColor: "text-red-800 dark:text-red-200",
      icon: ShieldAlert,
      title: "Alerta de seguridad",
    },
    warning: {
      bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
      textColor: "text-amber-800 dark:text-amber-200",
      icon: AlertTriangle,
      title: "Revisar con precaución",
    },
    info: {
      bgColor: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
      textColor: "text-blue-800 dark:text-blue-200",
      icon: Info,
      title: "Información",
    },
    safe: {
      bgColor: "",
      textColor: "",
      icon: Eye,
      title: "",
    },
  };

  const config = alertConfig[alertLevel];
  const Icon = config.icon;

  // Generar mensajes de alerta
  const alertMessages: string[] = [];

  if (isAiGenerated === true) {
    alertMessages.push("Las imágenes de este anuncio podrían estar generadas por IA");
  }

  if (authenticityScore !== null && authenticityScore < 50) {
    alertMessages.push(`Score de autenticidad muy bajo (${authenticityScore}%)`);
  } else if (authenticityScore !== null && authenticityScore < 70) {
    alertMessages.push(`Score de autenticidad bajo (${authenticityScore}%)`);
  }

  if (highSeverityIssues.length > 0) {
    alertMessages.push(
      `${highSeverityIssues.length} problema${highSeverityIssues.length > 1 ? "s" : ""} grave${highSeverityIssues.length > 1 ? "s" : ""} detectado${highSeverityIssues.length > 1 ? "s" : ""}`
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        config.bgColor,
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-full", config.bgColor)}>
          <Icon className={cn("h-5 w-5", config.textColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={cn("font-semibold", config.textColor)}>
            {config.title}
          </h3>

          <ul className="mt-1 space-y-1">
            {alertMessages.map((message, index) => (
              <li
                key={index}
                className={cn("text-sm", config.textColor, "opacity-90")}
              >
                • {message}
              </li>
            ))}
          </ul>

          {/* Mostrar issues específicos de alta severidad */}
          {highSeverityIssues.length > 0 && (
            <div className="mt-3 space-y-1">
              {highSeverityIssues.slice(0, 3).map((issue, index) => (
                <div
                  key={index}
                  className={cn(
                    "text-xs px-2 py-1 rounded",
                    "bg-red-100 dark:bg-red-900/50",
                    config.textColor
                  )}
                >
                  <span className="font-medium">{issue.type}:</span> {issue.description}
                </div>
              ))}
            </div>
          )}

          <p className={cn("text-xs mt-2 opacity-75", config.textColor)}>
            Verifica la información con el anunciante antes de proceder.
          </p>
        </div>
      </div>
    </div>
  );
}
