"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Database,
  Zap,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  RefreshCw,
  Clock,
} from "lucide-react";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // General
    siteName: "InmoAI",
    siteUrl: "https://inmoai.es",
    maintenanceMode: false,
    debugMode: false,

    // Scraping
    scrapingEnabled: true,
    scrapingInterval: "6",
    maxListingsPerRun: "500",
    sources: {
      idealista: true,
      fotocasa: true,
      habitaclia: true,
    },

    // AI
    fraudDetectionEnabled: true,
    fraudThreshold: "70",
    priceAnalysisEnabled: true,
    autoModerationEnabled: false,

    // Notifications
    adminAlerts: true,
    errorNotifications: true,
    weeklyReport: true,
    alertEmail: "admin@inmoai.es",
  });

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const updateSetting = (key: string, value: string | number | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateNestedSetting = (parent: string, key: string, value: string | number | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof typeof prev] as object),
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configuracion del sistema
          </h1>
          <p className="text-muted-foreground">
            Ajusta los parametros de funcionamiento de InmoAI
          </p>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : isSaved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Guardado
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar cambios
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              General
            </CardTitle>
            <CardDescription>
              Configuracion basica del sitio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Nombre del sitio</Label>
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(e) => updateSetting("siteName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">URL del sitio</Label>
              <Input
                id="siteUrl"
                value={settings.siteUrl}
                onChange={(e) => updateSetting("siteUrl", e.target.value)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo mantenimiento</Label>
                <p className="text-sm text-muted-foreground">
                  Muestra pagina de mantenimiento a los usuarios
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => updateSetting("maintenanceMode", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo debug</Label>
                <p className="text-sm text-muted-foreground">
                  Mostrar logs detallados en consola
                </p>
              </div>
              <Switch
                checked={settings.debugMode}
                onCheckedChange={(checked) => updateSetting("debugMode", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Scraping Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Scraping
            </CardTitle>
            <CardDescription>
              Configuracion de extraccion de datos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Scraping activo</Label>
                <p className="text-sm text-muted-foreground">
                  Ejecutar scraping automatico
                </p>
              </div>
              <Switch
                checked={settings.scrapingEnabled}
                onCheckedChange={(checked) => updateSetting("scrapingEnabled", checked)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Intervalo de ejecucion</Label>
              <Select
                value={settings.scrapingInterval}
                onValueChange={(value) => updateSetting("scrapingInterval", value)}
              >
                <SelectTrigger>
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Cada hora</SelectItem>
                  <SelectItem value="6">Cada 6 horas</SelectItem>
                  <SelectItem value="12">Cada 12 horas</SelectItem>
                  <SelectItem value="24">Cada 24 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxListings">Max listings por ejecucion</Label>
              <Input
                id="maxListings"
                type="number"
                value={settings.maxListingsPerRun}
                onChange={(e) => updateSetting("maxListingsPerRun", e.target.value)}
              />
            </div>
            <Separator />
            <div className="space-y-3">
              <Label>Fuentes activas</Label>
              {Object.entries(settings.sources).map(([source, enabled]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="capitalize">{source}</span>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => updateNestedSetting("sources", source, checked)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Inteligencia Artificial
            </CardTitle>
            <CardDescription>
              Configuracion de funciones IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Deteccion de fraude</Label>
                <p className="text-sm text-muted-foreground">
                  Analizar listings sospechosos
                </p>
              </div>
              <Switch
                checked={settings.fraudDetectionEnabled}
                onCheckedChange={(checked) => updateSetting("fraudDetectionEnabled", checked)}
              />
            </div>
            <div className="space-y-2">
              <Label>Umbral de fraude (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.fraudThreshold}
                onChange={(e) => updateSetting("fraudThreshold", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Listings con score menor se marcan como sospechosos
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Analisis de precios</Label>
                <p className="text-sm text-muted-foreground">
                  Detectar precios anomalos
                </p>
              </div>
              <Switch
                checked={settings.priceAnalysisEnabled}
                onCheckedChange={(checked) => updateSetting("priceAnalysisEnabled", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label>Auto-moderacion</Label>
                  <Badge variant="outline" className="text-xs">Beta</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ocultar automaticamente fraudes detectados
                </p>
              </div>
              <Switch
                checked={settings.autoModerationEnabled}
                onCheckedChange={(checked) => updateSetting("autoModerationEnabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configuracion de alertas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alertEmail">Email de alertas</Label>
              <Input
                id="alertEmail"
                type="email"
                value={settings.alertEmail}
                onChange={(e) => updateSetting("alertEmail", e.target.value)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de admin</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar eventos importantes
                </p>
              </div>
              <Switch
                checked={settings.adminAlerts}
                onCheckedChange={(checked) => updateSetting("adminAlerts", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Errores del sistema</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar errores criticos
                </p>
              </div>
              <Switch
                checked={settings.errorNotifications}
                onCheckedChange={(checked) => updateSetting("errorNotifications", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Reporte semanal</Label>
                <p className="text-sm text-muted-foreground">
                  Resumen semanal de metricas
                </p>
              </div>
              <Switch
                checked={settings.weeklyReport}
                onCheckedChange={(checked) => updateSetting("weeklyReport", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Zona de peligro
          </CardTitle>
          <CardDescription>
            Acciones que afectan a todo el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-100">
            <div>
              <p className="font-medium">Limpiar cache</p>
              <p className="text-sm text-muted-foreground">
                Elimina todos los datos en cache del sistema
              </p>
            </div>
            <Button variant="outline" className="text-red-600 hover:bg-red-50">
              <Database className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-100">
            <div>
              <p className="font-medium">Reindexar busqueda</p>
              <p className="text-sm text-muted-foreground">
                Reconstruye el indice de busqueda
              </p>
            </div>
            <Button variant="outline" className="text-red-600 hover:bg-red-50">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reindexar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
