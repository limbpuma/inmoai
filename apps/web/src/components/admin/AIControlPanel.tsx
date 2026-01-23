"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Zap,
  Pause,
  Play,
  RefreshCw,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { useAdminAIStore } from "@/stores/adminAIStore";
import { AIMode } from "@/types/adminAI";

const modeDescriptions: Record<AIMode, string> = {
  lazy: "La IA sugiere acciones pero requiere aprobacion manual",
  active: "La IA ejecuta acciones automaticamente con notificaciones",
  autonomous: "La IA opera de forma completamente autonoma",
};

const modeColors: Record<AIMode, string> = {
  lazy: "bg-blue-100 text-blue-800 border-blue-200",
  active: "bg-green-100 text-green-800 border-green-200",
  autonomous: "bg-purple-100 text-purple-800 border-purple-200",
};

export function AIControlPanel() {
  const { config, status, setMode, pause, resume, currentActions } = useAdminAIStore();

  const handleModeChange = (mode: string) => {
    setMode(mode as AIMode);
  };

  const isWorking = status === 'working' || currentActions.length > 0;
  const isPaused = status === 'paused';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Panel de Control
            </CardTitle>
            <CardDescription>
              Configura el modo de operacion de la IA
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isWorking && (
              <Badge variant="outline" className="bg-green-50 border-green-200">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                {currentActions.length} en proceso
              </Badge>
            )}
            {isPaused && (
              <Badge variant="outline" className="bg-amber-50 border-amber-200">
                <Pause className="h-3 w-3 mr-1" />
                Pausado
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Modo de operacion</Label>
              <p className="text-sm text-muted-foreground">
                {modeDescriptions[config.mode]}
              </p>
            </div>
            <Select value={config.mode} onValueChange={handleModeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lazy">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    Lazy Mode
                  </div>
                </SelectItem>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-600" />
                    Active Mode
                  </div>
                </SelectItem>
                <SelectItem value="autonomous">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    Autonomous Mode
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode Cards */}
          <div className="grid gap-3 md:grid-cols-3">
            {(Object.entries(modeDescriptions) as [AIMode, string][]).map(([mode, desc]) => (
              <div
                key={mode}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  config.mode === mode
                    ? modeColors[mode] + " border-current"
                    : "border-muted hover:border-muted-foreground/50"
                }`}
                onClick={() => handleModeChange(mode)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className={`h-4 w-4 ${
                    mode === 'lazy' ? 'text-blue-600' :
                    mode === 'active' ? 'text-green-600' : 'text-purple-600'
                  }`} />
                  <span className="font-medium capitalize">{mode}</span>
                  {config.mode === mode && (
                    <Badge variant="secondary" className="ml-auto text-xs">Activo</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          {isPaused ? (
            <Button onClick={resume} variant="default">
              <Play className="h-4 w-4 mr-2" />
              Reanudar IA
            </Button>
          ) : (
            <Button onClick={pause} variant="outline">
              <Pause className="h-4 w-4 mr-2" />
              Pausar IA
            </Button>
          )}
          <Button variant="outline" disabled={isWorking}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Ejecutar todas
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configuracion avanzada
          </Button>
        </div>

        {/* Warning for Autonomous Mode */}
        {config.mode === 'autonomous' && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Modo autonomo activado</p>
              <p className="text-sm text-amber-700">
                La IA tomara decisiones automaticamente sin requerir aprobacion.
                Asegurate de configurar los limites adecuadamente.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
