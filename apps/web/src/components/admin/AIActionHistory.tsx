"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Ban,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { useAdminAIStore } from "@/stores/adminAIStore";
import { AIAction, AIFunction } from "@/types/adminAI";
import { useState } from "react";

const statusConfig: Record<AIAction["status"], {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}> = {
  pending: {
    label: "Pendiente",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: <Clock className="h-4 w-4" />,
  },
  running: {
    label: "Ejecutando",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  completed: {
    label: "Completado",
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  failed: {
    label: "Fallido",
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: <XCircle className="h-4 w-4" />,
  },
  cancelled: {
    label: "Cancelado",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    icon: <Ban className="h-4 w-4" />,
  },
};

function ActionItem({ action }: { action: AIAction }) {
  const [expanded, setExpanded] = useState(false);
  const { config } = useAdminAIStore();

  const statusInfo = statusConfig[action.status];
  const funcConfig = config.functions[action.function];

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}min`;
  };

  return (
    <div
      className={`p-3 rounded-lg border ${
        action.status === "failed"
          ? "bg-red-50 border-red-200"
          : action.status === "running"
          ? "bg-blue-50 border-blue-200"
          : "bg-muted/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded ${statusInfo.bgColor} ${statusInfo.color}`}>
            {statusInfo.icon}
          </div>
          <div>
            <p className="font-medium text-sm">{funcConfig.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(action.startedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${statusInfo.bgColor} ${statusInfo.color} text-xs`}>
            {statusInfo.label}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {action.type}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">ID:</span>
              <span className="ml-2 font-mono text-xs">{action.id.slice(0, 8)}...</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tipo:</span>
              <span className="ml-2 capitalize">{action.type}</span>
            </div>
          </div>

          {action.completedAt && (
            <div>
              <span className="text-muted-foreground">Duracion:</span>
              <span className="ml-2">
                {formatDuration(
                  new Date(action.completedAt).getTime() -
                    new Date(action.startedAt).getTime()
                )}
              </span>
            </div>
          )}

          {action.result && (
            <div className="p-2 rounded bg-green-50 border border-green-200">
              <p className="font-medium text-green-800 text-xs mb-1">Resultado</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-muted-foreground">Procesados:</span>
                <span>{action.result.itemsProcessed}</span>
                <span className="text-muted-foreground">Afectados:</span>
                <span>{action.result.itemsAffected}</span>
                <span className="text-muted-foreground">Duracion:</span>
                <span>{formatDuration(action.result.duration)}</span>
              </div>
              {action.result.details && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {action.result.details}
                </p>
              )}
            </div>
          )}

          {action.error && (
            <div className="p-2 rounded bg-red-50 border border-red-200">
              <p className="font-medium text-red-800 text-xs mb-1">Error</p>
              <p className="text-xs text-red-700">{action.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AIActionHistory() {
  const { actionHistory, currentActions } = useAdminAIStore();
  const [showCount, setShowCount] = useState(10);

  const allActions = [...currentActions, ...actionHistory];
  const visibleActions = allActions.slice(0, showCount);
  const hasMore = allActions.length > showCount;

  const stats = {
    total: actionHistory.length,
    completed: actionHistory.filter((a) => a.status === "completed").length,
    failed: actionHistory.filter((a) => a.status === "failed").length,
    cancelled: actionHistory.filter((a) => a.status === "cancelled").length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Historial de acciones</CardTitle>
            <CardDescription>
              Registro de todas las acciones ejecutadas por la IA
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>{stats.completed}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>{stats.failed}</span>
            </div>
            <div className="flex items-center gap-1">
              <Ban className="h-4 w-4 text-amber-600" />
              <span>{stats.cancelled}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {allActions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay acciones registradas</p>
            <p className="text-sm">Las acciones de la IA apareceran aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleActions.map((action) => (
              <ActionItem key={action.id} action={action} />
            ))}

            {hasMore && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCount(showCount + 10)}
              >
                Mostrar mas ({allActions.length - showCount} restantes)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
