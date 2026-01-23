"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  Search,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertTriangle,
  Clock,
  Zap,
} from "lucide-react";
import { MetricsCards } from "@/components/admin/MetricsCards";
import { Charts } from "@/components/admin/Charts";

// Mock data - would come from tRPC in production
const recentActivity = [
  { id: 1, type: "user", message: "Nuevo usuario registrado: juan@example.com", time: "Hace 5 min" },
  { id: 2, type: "search", message: "1,234 busquedas realizadas hoy", time: "Hace 15 min" },
  { id: 3, type: "alert", message: "3 listings marcados como posible fraude", time: "Hace 1 hora" },
  { id: 4, type: "payment", message: "Nueva suscripcion Pro: maria@example.com", time: "Hace 2 horas" },
  { id: 5, type: "listing", message: "45 nuevos listings importados", time: "Hace 3 horas" },
];

const alerts = [
  { id: 1, severity: "high", message: "3 listings con score de fraude > 90%", action: "Revisar" },
  { id: 2, severity: "medium", message: "Scraping de Fotocasa fallo 2 veces", action: "Verificar" },
  { id: 3, severity: "low", message: "5 usuarios con sesion expirada", action: "Notificar" },
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case "user":
      return <Users className="h-4 w-4 text-blue-500" />;
    case "search":
      return <Search className="h-4 w-4 text-green-500" />;
    case "alert":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "payment":
      return <CreditCard className="h-4 w-4 text-purple-500" />;
    case "listing":
      return <Building2 className="h-4 w-4 text-cyan-500" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "low":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Administracion</h1>
          <p className="text-muted-foreground">
            Vista general del sistema InmoAI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Activity className="h-3 w-3 mr-1" />
            Sistema operativo
          </Badge>
        </div>
      </div>

      {/* Metrics Cards */}
      <MetricsCards />

      {/* Charts Section */}
      <Charts />

      {/* Bottom Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Actividad reciente
            </CardTitle>
            <CardDescription>
              Ultimos eventos del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                >
                  <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas del sistema
            </CardTitle>
            <CardDescription>
              Requieren atencion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${getSeverityColor(
                    alert.severity
                  )}`}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    {alert.action}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Acciones rapidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Ver usuarios nuevos
            </Button>
            <Button variant="outline">
              <Building2 className="h-4 w-4 mr-2" />
              Revisar listings pendientes
            </Button>
            <Button variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Ejecutar scraping
            </Button>
            <Button variant="outline">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Revisar fraudes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
