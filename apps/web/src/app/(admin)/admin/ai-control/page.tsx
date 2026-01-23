"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
} from "lucide-react";
import { useAdminAIStore } from "@/stores/adminAIStore";
import { AIControlPanel } from "@/components/admin/AIControlPanel";
import { AIFunctionCard } from "@/components/admin/AIFunctionCard";
import { AIStatusIndicator } from "@/components/admin/AIStatusIndicator";
import { AIActionHistory } from "@/components/admin/AIActionHistory";
import { AIFunction } from "@/types/adminAI";

const aiFeatures: AIFunction[] = [
  'scraping',
  'fraud_detection',
  'price_analysis',
  'moderation',
  'user_support',
  'seo_optimization',
];

export default function AIControlPage() {
  const { config, status, metrics, alerts, pendingDecisions } = useAdminAIStore();

  const activeAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Control de IA
            <Badge variant="outline" className="ml-2">Beta</Badge>
          </h1>
          <p className="text-muted-foreground">
            Gestiona las funciones de inteligencia artificial del sistema
          </p>
        </div>
        <AIStatusIndicator />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Modo actual</p>
                <p className="text-2xl font-bold capitalize">{config.mode}</p>
              </div>
              <div className={`p-3 rounded-xl ${
                config.mode === 'lazy' ? 'bg-blue-100' :
                config.mode === 'active' ? 'bg-green-100' : 'bg-purple-100'
              }`}>
                <Zap className={`h-5 w-5 ${
                  config.mode === 'lazy' ? 'text-blue-600' :
                  config.mode === 'active' ? 'text-green-600' : 'text-purple-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Acciones hoy</p>
                <p className="text-2xl font-bold">{metrics.actionsToday}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{pendingDecisions.filter(d => d.status === 'pending').length}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas</p>
                <p className="text-2xl font-bold text-red-600">{activeAlertsCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Control Panel */}
      <AIControlPanel />

      {/* Tabs */}
      <Tabs defaultValue="functions" className="w-full">
        <TabsList>
          <TabsTrigger value="functions">Funciones IA</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="alerts">
            Alertas
            {activeAlertsCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 justify-center">
                {activeAlertsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="decisions">
            Decisiones
            {pendingDecisions.filter(d => d.status === 'pending').length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                {pendingDecisions.filter(d => d.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="functions" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {aiFeatures.map((func) => (
              <AIFunctionCard key={func} functionId={func} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <AIActionHistory />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Alertas del sistema IA</CardTitle>
              <CardDescription>
                Notificaciones y avisos de las funciones de IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay alertas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.acknowledged
                          ? 'bg-muted/50 opacity-60'
                          : alert.severity === 'error' || alert.severity === 'critical'
                          ? 'bg-red-50 border-red-200'
                          : alert.severity === 'warning'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                            alert.severity === 'error' || alert.severity === 'critical'
                              ? 'text-red-600'
                              : alert.severity === 'warning'
                              ? 'text-amber-600'
                              : 'text-blue-600'
                          }`} />
                          <div>
                            <p className="font-medium">{alert.title}</p>
                            <p className="text-sm text-muted-foreground">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.createdAt).toLocaleString('es-ES')}
                            </p>
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => useAdminAIStore.getState().acknowledgeAlert(alert.id)}
                          >
                            Marcar leida
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Decisiones pendientes</CardTitle>
              <CardDescription>
                Acciones que requieren aprobacion manual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingDecisions.filter(d => d.status === 'pending').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay decisiones pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingDecisions
                    .filter((d) => d.status === 'pending')
                    .map((decision) => (
                      <div
                        key={decision.id}
                        className="p-4 rounded-lg border bg-amber-50 border-amber-200"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{decision.function}</Badge>
                              <Badge
                                variant={
                                  decision.impact === 'high'
                                    ? 'destructive'
                                    : decision.impact === 'medium'
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                Impacto {decision.impact}
                              </Badge>
                            </div>
                            <p className="font-medium">{decision.action}</p>
                            <p className="text-sm text-muted-foreground">
                              {decision.description}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                useAdminAIStore.getState().rejectDecision(decision.id)
                              }
                            >
                              Rechazar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                useAdminAIStore.getState().approveDecision(decision.id)
                              }
                            >
                              Aprobar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
