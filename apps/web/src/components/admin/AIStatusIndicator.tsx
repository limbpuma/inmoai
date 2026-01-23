"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Circle,
  Loader2,
  Pause,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useAdminAIStore } from "@/stores/adminAIStore";
import { AIStatus } from "@/types/adminAI";

const statusConfig: Record<AIStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  pulse?: boolean;
}> = {
  idle: {
    label: "En espera",
    color: "text-green-600",
    bgColor: "bg-green-100 border-green-200",
    icon: <Circle className="h-3 w-3 fill-green-500 text-green-500" />,
  },
  working: {
    label: "Trabajando",
    color: "text-blue-600",
    bgColor: "bg-blue-100 border-blue-200",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    pulse: true,
  },
  waiting: {
    label: "Esperando",
    color: "text-amber-600",
    bgColor: "bg-amber-100 border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  error: {
    label: "Error",
    color: "text-red-600",
    bgColor: "bg-red-100 border-red-200",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  paused: {
    label: "Pausado",
    color: "text-gray-600",
    bgColor: "bg-gray-100 border-gray-200",
    icon: <Pause className="h-3 w-3" />,
  },
};

export function AIStatusIndicator() {
  const { status, currentActions, metrics, config } = useAdminAIStore();

  const statusInfo = statusConfig[status];

  const tooltipContent = (
    <div className="space-y-2 text-xs">
      <div className="font-medium">Estado del Sistema IA</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-muted-foreground">Modo:</span>
        <span className="capitalize">{config.mode}</span>
        <span className="text-muted-foreground">Estado:</span>
        <span>{statusInfo.label}</span>
        <span className="text-muted-foreground">Acciones activas:</span>
        <span>{currentActions.length}</span>
        <span className="text-muted-foreground">Tasa de exito:</span>
        <span>{metrics.successRate}%</span>
      </div>
      {currentActions.length > 0 && (
        <div className="pt-1 border-t">
          <span className="text-muted-foreground">Ejecutando:</span>
          <ul className="mt-1 space-y-0.5">
            {currentActions.map((action) => (
              <li key={action.id} className="flex items-center gap-1">
                <Loader2 className="h-2 w-2 animate-spin" />
                {config.functions[action.function].name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${statusInfo.bgColor} ${statusInfo.color} cursor-help transition-all ${
              statusInfo.pulse ? "animate-pulse" : ""
            }`}
          >
            <span className="flex items-center gap-1.5">
              {statusInfo.icon}
              <span className="hidden sm:inline">{statusInfo.label}</span>
              {currentActions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-white/50">
                  {currentActions.length}
                </span>
              )}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="w-64">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
