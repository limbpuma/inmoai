"use client";

import { useBilling } from "@/hooks/useBilling";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  CreditCard,
  Crown,
  Calendar,
  Check,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Zap,
  Building2,
  Users,
  Shield,
} from "lucide-react";

const planFeatures = {
  free: [
    "Busqueda basica de propiedades",
    "Hasta 10 busquedas al dia",
    "Alertas por email (max. 3)",
    "Score de autenticidad basico",
  ],
  pro: [
    "Busquedas ilimitadas",
    "Alertas ilimitadas en tiempo real",
    "Score de autenticidad avanzado",
    "Analisis de precios de mercado",
    "Historial de precios",
    "Deteccion de fraude IA",
    "Comparador de propiedades",
    "Exportar a PDF",
  ],
  agency: [
    "Todo lo de Pro",
    "API de acceso completo",
    "Hasta 5 usuarios",
    "Dashboard de analytics",
    "Integracion CRM",
    "Informes personalizados",
    "Soporte prioritario 24/7",
    "Exportacion de datos",
  ],
};

const planIcons = {
  free: Users,
  pro: Zap,
  agency: Building2,
};

const planNames = {
  free: "Gratis",
  pro: "Pro",
  agency: "Agencia",
};

export default function SubscriptionPage() {
  const {
    subscription,
    isLoadingSubscription,
    isPro,
    isAgency,
    hasActiveSubscription,
    openBillingPortal,
    isOpeningPortal,
  } = useBilling();

  const currentPlanId = isAgency ? "agency" : isPro ? "pro" : "free";
  const PlanIcon = planIcons[currentPlanId];

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoadingSubscription) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Suscripcion
        </h1>
        <p className="text-muted-foreground">
          Gestiona tu plan y facturacion
        </p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${hasActiveSubscription ? "bg-gradient-to-br from-amber-100 to-orange-100" : "bg-muted"}`}>
                <PlanIcon className={`h-6 w-6 ${hasActiveSubscription ? "text-amber-600" : "text-muted-foreground"}`} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Plan {planNames[currentPlanId]}
                  {hasActiveSubscription && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {hasActiveSubscription
                    ? "Disfrutas de todas las funcionalidades premium"
                    : "Plan gratuito con funcionalidades basicas"}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subscription Status */}
          {hasActiveSubscription && subscription && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Proxima facturacion
                  </div>
                  <p className="font-semibold">
                    {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Shield className="h-4 w-4" />
                    Estado
                  </div>
                  <p className="font-semibold flex items-center gap-2">
                    {subscription.isActive ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Activa
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Pendiente
                      </>
                    )}
                  </p>
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Features */}
          <div>
            <h3 className="font-semibold mb-3">Tu plan incluye:</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {planFeatures[currentPlanId].map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {hasActiveSubscription ? (
              <Button
                variant="outline"
                onClick={() => openBillingPortal()}
                disabled={isOpeningPortal}
              >
                {isOpeningPortal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Abriendo...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Gestionar suscripcion
                  </>
                )}
              </Button>
            ) : (
              <Link href="/pricing">
                <Button>
                  <Crown className="h-4 w-4 mr-2" />
                  Actualizar a Pro
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Suggestion for Free Users */}
      {!hasActiveSubscription && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  Desbloquea funcionalidades avanzadas
                </h3>
                <p className="text-muted-foreground">
                  Con InmoAI Pro obtendras busquedas ilimitadas, deteccion de fraude con IA,
                  alertas en tiempo real y mucho mas.
                </p>
              </div>
              <Link href="/pricing">
                <Button size="lg">
                  Ver planes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informacion de facturacion</CardTitle>
          <CardDescription>
            {hasActiveSubscription
              ? "Accede al portal de Stripe para gestionar tu metodo de pago"
              : "Configura tu metodo de pago al suscribirte a un plan"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {hasActiveSubscription
                  ? "Metodo de pago configurado"
                  : "Sin metodo de pago"}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasActiveSubscription
                  ? "Gestionado de forma segura por Stripe"
                  : "Agrega un metodo de pago al suscribirte"}
              </p>
            </div>
            {hasActiveSubscription && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openBillingPortal()}
                disabled={isOpeningPortal}
              >
                Editar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preguntas frecuentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">¿Como cancelo mi suscripcion?</h4>
            <p className="text-sm text-muted-foreground">
              Puedes cancelar en cualquier momento desde el portal de facturacion.
              Seguiras teniendo acceso hasta el final del periodo pagado.
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium mb-1">¿Puedo cambiar de plan?</h4>
            <p className="text-sm text-muted-foreground">
              Si, puedes actualizar o cambiar tu plan en cualquier momento.
              El cambio se aplica inmediatamente y ajustamos la facturacion.
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium mb-1">¿Los pagos son seguros?</h4>
            <p className="text-sm text-muted-foreground">
              Todos los pagos se procesan de forma segura a traves de Stripe.
              No almacenamos datos de tu tarjeta.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
