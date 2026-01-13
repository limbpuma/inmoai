"use client";

import { ShieldCheck, AlertTriangle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface AuthenticityBadgeProps {
    score: number; // 0-100
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
}

export function AuthenticityBadge({ score, size = 'sm', showDetails = false }: AuthenticityBadgeProps) {
    let colorClass = "";
    let Icon = ShieldCheck;
    let label = "Verificado";

    if (score >= 90) {
        colorClass = "bg-secondary-50 text-secondary-600 border-secondary-200 hover:bg-secondary-100";
        Icon = ShieldCheck;
        label = "Verificado";
    } else if (score >= 70) {
        colorClass = "bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100";
        Icon = AlertTriangle;
        label = "Revisar";
    } else {
        colorClass = "bg-destructive-50 text-destructive-600 border-destructive-200 hover:bg-destructive-100";
        Icon = AlertOctagon;
        label = "Alerta";
    }

    const sizeClasses = {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-3 py-1",
        lg: "text-base px-4 py-1.5",
    };

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
                <TooltipContent className="p-3 max-w-[200px] border-border shadow-xl">
                    <div className="text-xs space-y-2">
                        <p className="font-semibold text-sm border-b pb-1">Puntuación: {score}/100</p>
                        <div className="grid gap-1.5 text-muted-foreground">
                            <div className="flex items-center gap-2">
                                {score >= 90 ? <ShieldCheck className="h-3 w-3 text-secondary-600" /> : <AlertTriangle className="h-3 w-3 text-yellow-600" />}
                                <span>{score >= 90 ? "Imágenes originales" : "Posible manipulación"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {score >= 80 ? <ShieldCheck className="h-3 w-3 text-secondary-600" /> : <AlertTriangle className="h-3 w-3 text-yellow-600" />}
                                <span>{score >= 80 ? "Metadatos consistentes" : "Datos incompletos"}</span>
                            </div>
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
