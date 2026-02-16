"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Search,
  Shield,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Play,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAdminAIStore } from "@/stores/adminAIStore";
import { AIFunction, AIMode } from "@/types/adminAI";

const functionIcons: Record<AIFunction, React.ReactNode> = {
  data_pipeline: <Search className="h-5 w-5" />,
  fraud_detection: <Shield className="h-5 w-5" />,
  price_analysis: <TrendingUp className="h-5 w-5" />,
  moderation: <Bot className="h-5 w-5" />,
  user_support: <MessageSquare className="h-5 w-5" />,
  seo_optimization: <Sparkles className="h-5 w-5" />,
};

const functionColors: Record<AIFunction, string> = {
  data_pipeline: "text-blue-600 bg-blue-100",
  fraud_detection: "text-red-600 bg-red-100",
  price_analysis: "text-green-600 bg-green-100",
  moderation: "text-purple-600 bg-purple-100",
  user_support: "text-amber-600 bg-amber-100",
  seo_optimization: "text-cyan-600 bg-cyan-100",
};

interface AIFunctionCardProps {
  functionId: AIFunction;
}

export function AIFunctionCard({ functionId }: AIFunctionCardProps) {
  const {
    config,
    currentActions,
    setFunctionEnabled,
    setFunctionMode,
    triggerAction,
  } = useAdminAIStore();

  const funcConfig = config.functions[functionId];
  const isRunning = currentActions.some((a) => a.function === functionId);

  const handleToggle = (checked: boolean) => {
    setFunctionEnabled(functionId, checked);
  };

  const handleModeChange = (mode: string) => {
    setFunctionMode(functionId, mode as AIMode);
  };

  const handleTrigger = () => {
    triggerAction(functionId);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const successRate = funcConfig.stats.totalRuns > 0
    ? Math.round((funcConfig.stats.successRuns / funcConfig.stats.totalRuns) * 100)
    : 100;

  return (
    <Card className={`transition-all ${!funcConfig.enabled ? "opacity-60" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${functionColors[functionId]}`}>
              {functionIcons[functionId]}
            </div>
            <div>
              <CardTitle className="text-base">{funcConfig.name}</CardTitle>
              <CardDescription className="text-xs line-clamp-1">
                {funcConfig.description}
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={funcConfig.enabled}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Selection */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Modo</span>
          <Select
            value={funcConfig.mode}
            onValueChange={handleModeChange}
            disabled={!funcConfig.enabled}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lazy">Lazy</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="autonomous">Autonomo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold">{funcConfig.stats.totalRuns}</p>
            <p className="text-[10px] text-muted-foreground">Ejecuciones</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold">{successRate}%</p>
            <p className="text-[10px] text-muted-foreground">Exito</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-semibold">
              {formatDuration(funcConfig.stats.avgDuration)}
            </p>
            <p className="text-[10px] text-muted-foreground">Promedio</p>
          </div>
        </div>

        {/* Last Run Info */}
        {funcConfig.lastRun && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Ultima ejecucion:{" "}
              {new Date(funcConfig.lastRun).toLocaleString("es-ES", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}

        {/* Schedule Info */}
        {funcConfig.schedule && funcConfig.enabled && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Programado: {funcConfig.schedule}
            </Badge>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleTrigger}
          disabled={!funcConfig.enabled || isRunning}
          className="w-full"
          size="sm"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Ejecutando...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Ejecutar ahora
            </>
          )}
        </Button>

        {/* Running Status */}
        {isRunning && (
          <div className="flex items-center justify-center gap-2 text-xs text-green-600">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Procesando...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
