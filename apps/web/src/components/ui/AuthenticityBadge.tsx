"use client";

import { ShieldCheck, AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIIssue {
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
    location?: string;
}

interface AuthenticityBadgeProps {
    score: number; // 0-100
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
    issues?: AIIssue[] | null;
    isAiGenerated?: boolean | null;
}

export function AuthenticityBadge({
    score,
    size = 'sm',
    showDetails = false,
    issues = null,
    isAiGenerated = null
}: AuthenticityBadgeProps) {
    const highIssues = issues?.filter(i => i.severity === "high") ?? [];
    const mediumIssues = issues?.filter(i => i.severity === "medium") ?? [];
    const lowIssues = issues?.filter(i => i.severity === "low") ?? [];

    // Determine severity based on score and issues
    const getSeverityConfig = () => {
        if (isAiGenerated === true || highIssues.length > 0 || score < 50) {
            return {
                colorClass: "bg-destructive-50 text-destructive-600 border-destructive-200 hover:bg-destructive-100",
                Icon: AlertOctagon,
                label: "Alerta"
            };
        }
        if (mediumIssues.length > 0 || score < 70) {
            return {
                colorClass: "bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100",
                Icon: AlertTriangle,
                label: "Revisar"
            };
        }
        if (lowIssues.length > 0 || score < 90) {
            return {
                colorClass: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
                Icon: Info,
                label: "Info"
            };
        }
        return {
            colorClass: "bg-secondary-50 text-secondary-600 border-secondary-200 hover:bg-secondary-100",
            Icon: ShieldCheck,
            label: "Verificado"
        };
    };

    const { colorClass, Icon, label } = getSeverityConfig();

    const sizeClasses = {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-3 py-1",
        lg: "text-base px-4 py-1.5",
    };

    const severityColors = {
        high: "text-red-600 dark:text-red-400",
        medium: "text-amber-600 dark:text-amber-400",
        low: "text-blue-600 dark:text-blue-400"
    };

    const hasIssues = issues && issues.length > 0;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "inline-flex items-center gap-1.5 font-medium rounded-full border cursor-help transition-all duration-200 select-none",
                        colorClass,
                        sizeClasses[size]
                    )}>
                        <Icon className={cn(
                            size === 'sm' ? "h-3.5 w-3.5" : size === 'md' ? "h-4 w-4" : "h-5 w-5"
                        )} />
                        <span>{score}% {showDetails && label}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="p-3 max-w-[280px] border-border shadow-xl">
                    <div className="text-xs space-y-2">
                        <p className="font-semibold text-sm border-b pb-1 flex items-center justify-between">
                            <span>Autenticidad: {score}/100</span>
                            <span className={cn("text-xs", colorClass.includes("destructive") ? "text-destructive-600" : colorClass.includes("yellow") ? "text-yellow-600" : "text-secondary-600")}>
                                {label}
                            </span>
                        </p>

                        {isAiGenerated === true && (
                            <div className="flex items-center gap-2 text-red-600 font-medium">
                                <AlertOctagon className="h-3 w-3" />
                                <span>Posible contenido generado por IA</span>
                            </div>
                        )}

                        {hasIssues ? (
                            <div className="space-y-1.5">
                                <p className="text-muted-foreground font-medium">Problemas detectados:</p>
                                {issues.slice(0, 4).map((issue, idx) => (
                                    <div key={idx} className={cn("flex items-start gap-1.5", severityColors[issue.severity])}>
                                        <span className="font-medium text-[10px] uppercase mt-0.5">
                                            {issue.severity === "high" ? "⚠" : issue.severity === "medium" ? "!" : "·"}
                                        </span>
                                        <span className="text-[11px] leading-tight">{issue.description}</span>
                                    </div>
                                ))}
                                {issues.length > 4 && (
                                    <p className="text-muted-foreground text-[10px]">
                                        +{issues.length - 4} más...
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-1.5 text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    {score >= 90 ? <ShieldCheck className="h-3 w-3 text-secondary-600" /> : <AlertTriangle className="h-3 w-3 text-yellow-600" />}
                                    <span>{score >= 90 ? "Imágenes verificadas" : "Verificación pendiente"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {score >= 80 ? <ShieldCheck className="h-3 w-3 text-secondary-600" /> : <AlertTriangle className="h-3 w-3 text-yellow-600" />}
                                    <span>{score >= 80 ? "Metadatos consistentes" : "Datos incompletos"}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
