"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Star,
  TrendingUp,
  Clock,
  ArrowRight,
  BadgeCheck,
  Crown,
  Briefcase,
  MessageSquare,
  Eye,
  CheckCircle2,
} from "lucide-react";

const tierLabels: Record<string, string> = {
  free: "Gratuito",
  premium: "Premium",
  enterprise: "Destacado",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  viewed: "bg-yellow-100 text-yellow-700",
  contacted: "bg-amber-100 text-amber-700",
  quoted: "bg-purple-100 text-purple-700",
  accepted: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function ProveedorDashboardPage() {
  const { data: stats, isLoading } = trpc.marketplace.getMyStats.useQuery();
  const { data: recentLeads } = trpc.marketplace.getMyLeads.useQuery(
    { limit: 5 },
    { enabled: !!stats }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Briefcase className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">No tienes perfil de profesional</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Registrate como profesional para empezar a recibir leads y gestionar tu negocio desde aqui.
        </p>
        <Link href="/servicios/registro">
          <Button>
            <Briefcase className="h-4 w-4 mr-2" />
            Registrarme como profesional
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mi negocio</h1>
          <p className="text-muted-foreground">Panel de control profesional</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={stats.tier === "free" ? "" : "bg-amber-100 text-amber-700"}>
            <Crown className="h-3 w-3 mr-1" />
            {tierLabels[stats.tier]}
          </Badge>
          {stats.isVerified && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <BadgeCheck className="h-3 w-3 mr-1" />
              Verificado
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads este mes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leadsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalLeads} totales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valoracion</CardTitle>
            <Star className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalReviews} opiniones
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo respuesta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.responseTimeMinutes
                ? stats.responseTimeMinutes < 60
                  ? `${stats.responseTimeMinutes}min`
                  : `${Math.round(stats.responseTimeMinutes / 60)}h`
                : "--"}
            </div>
            <p className="text-xs text-muted-foreground">promedio</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalLeads > 0
                ? `${Math.round(((stats.leadsByStatus.completed || 0) / stats.totalLeads) * 100)}%`
                : "--"}
            </div>
            <p className="text-xs text-muted-foreground">leads completados</p>
          </CardContent>
        </Card>
      </div>

      {/* Lead funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Embudo de leads</CardTitle>
          <CardDescription>Estado actual de tus leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { key: "new", label: "Nuevos", icon: FileText },
              { key: "viewed", label: "Vistos", icon: Eye },
              { key: "contacted", label: "Contactados", icon: MessageSquare },
              { key: "quoted", label: "Presupuestados", icon: FileText },
              { key: "accepted", label: "Aceptados", icon: CheckCircle2 },
              { key: "completed", label: "Completados", icon: CheckCircle2 },
              { key: "cancelled", label: "Cancelados", icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const count = stats.leadsByStatus[item.key] || 0;
              return (
                <div key={item.key} className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent leads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Leads recientes</CardTitle>
            <Link href="/dashboard/proveedor/leads">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentLeads?.leads && recentLeads.leads.length > 0 ? (
            <div className="space-y-3">
              {recentLeads.leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{lead.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.clientName} - {lead.workCity || "Sin ubicacion"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.budget && (
                      <span className="text-sm font-medium">
                        {new Intl.NumberFormat("es-ES", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0,
                        }).format(lead.budget)}
                      </span>
                    )}
                    <Badge variant="outline" className={statusColors[lead.status] || ""}>
                      {lead.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No tienes leads todavia. Apareceras en las busquedas cuando los propietarios busquen servicios en tu zona.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
