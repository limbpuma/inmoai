"use client";

import { Suspense, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useBilling } from "@/hooks/useBilling";
import {
  Check,
  Sparkles,
  Shield,
  Zap,
  Building2,
  Users,
  Crown,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

function PricingMessages() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  if (!success && !canceled) return null;

  return (
    <>
      {success && (
        <div className="mb-8 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3 max-w-2xl mx-auto">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800">
            ¡Suscripción activada con éxito! Ya puedes disfrutar de todas las funcionalidades.
          </p>
        </div>
      )}
      {canceled && (
        <div className="mb-8 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3 max-w-2xl mx-auto">
          <XCircle className="h-5 w-5 text-amber-600" />
          <p className="text-amber-800">
            El proceso de pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.
          </p>
        </div>
      )}
    </>
  );
}

const plans = [
  {
    id: "free" as const,
    name: "Gratis",
    description: "Para compradores que empiezan su búsqueda",
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: Users,
    features: [
      "Búsqueda básica de propiedades",
      "Hasta 10 búsquedas al día",
      "Alertas por email (máx. 3)",
      "Score de autenticidad básico",
      "Acceso a listings públicos",
    ],
    cta: "Plan actual",
    popular: false,
  },
  {
    id: "pro" as const,
    name: "Pro",
    description: "Para compradores serios en búsqueda activa",
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    icon: Zap,
    features: [
      "Búsquedas ilimitadas",
      "Alertas ilimitadas en tiempo real",
      "Score de autenticidad avanzado",
      "Análisis de precios de mercado",
      "Historial de precios",
      "Detección de fraude IA",
      "Comparador de propiedades",
      "Exportar a PDF",
    ],
    cta: "Suscribirse",
    popular: true,
  },
  {
    id: "agency" as const,
    name: "Agencia",
    description: "Para profesionales inmobiliarios",
    monthlyPrice: 49.99,
    yearlyPrice: 499.99,
    icon: Building2,
    features: [
      "Todo lo de Pro",
      "API de acceso completo",
      "Hasta 5 usuarios",
      "Dashboard de analytics",
      "Integración CRM",
      "Informes personalizados",
      "Soporte prioritario 24/7",
      "Exportación de datos",
    ],
    cta: "Suscribirse",
    popular: false,
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const { subscribe, subscription, isSubscribing, openBillingPortal, isOpeningPortal } = useBilling();

  const handleSubscribe = async (planId: "pro" | "agency") => {
    if (!session) {
      router.push(`/login?callbackUrl=/pricing`);
      return;
    }
    await subscribe(planId);
  };

  const getCurrentPlan = () => {
    if (!subscription?.isActive) return "free";
    if (subscription.role === "agency") return "agency";
    if (subscription.role === "premium") return "pro";
    return "free";
  };

  const currentPlan = getCurrentPlan();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-16">
        {/* Success/Cancel Messages */}
        <Suspense fallback={null}>
          <PricingMessages />
        </Suspense>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">
            <Crown className="h-3 w-3 mr-1" />
            Planes y precios
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            Encuentra tu hogar con{" "}
            <span className="text-primary">inteligencia artificial</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Elige el plan que mejor se adapte a tus necesidades. Todos incluyen
            acceso a nuestra tecnología de verificación anti-fraude.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Label
            htmlFor="billing"
            className={!isYearly ? "font-semibold" : "text-muted-foreground"}
          >
            Mensual
          </Label>
          <Switch
            id="billing"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label
            htmlFor="billing"
            className={isYearly ? "font-semibold" : "text-muted-foreground"}
          >
            Anual
          </Label>
          {isYearly && (
            <Badge variant="default" className="bg-green-600">
              Ahorra 2 meses
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const period = isYearly ? "/año" : "/mes";
            const isCurrentPlan = currentPlan === plan.id;
            const canUpgrade = plan.id !== "free" && !isCurrentPlan;
            const canManage = isCurrentPlan && plan.id !== "free";

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-8 ${
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/10 scale-105"
                    : "border-border"
                } ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Más popular
                  </Badge>
                )}

                {isCurrentPlan && (
                  <Badge variant="outline" className="absolute -top-3 right-4 bg-background">
                    Tu plan actual
                  </Badge>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`p-2 rounded-lg ${
                        plan.popular ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          plan.popular ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {price === 0 ? "Gratis" : `${price}€`}
                    </span>
                    {price > 0 && (
                      <span className="text-muted-foreground">{period}</span>
                    )}
                  </div>
                  {isYearly && price > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {(price / 12).toFixed(2)}€/mes facturado anualmente
                    </p>
                  )}
                </div>

                {canManage ? (
                  <Button
                    className="w-full mb-6"
                    variant="outline"
                    onClick={() => openBillingPortal()}
                    disabled={isOpeningPortal}
                  >
                    {isOpeningPortal ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Abriendo...
                      </>
                    ) : (
                      "Gestionar suscripción"
                    )}
                  </Button>
                ) : canUpgrade ? (
                  <Button
                    className="w-full mb-6"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.id as "pro" | "agency")}
                    disabled={isSubscribing}
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      plan.cta
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full mb-6"
                    variant="outline"
                    disabled
                  >
                    {isCurrentPlan ? "Plan actual" : "Empezar gratis"}
                  </Button>
                )}

                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-6">
            Más de 50.000 usuarios confían en InmoAI
          </p>
          <div className="flex flex-wrap justify-center gap-8 items-center opacity-60">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="font-medium">SSL Seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span className="font-medium">GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span className="font-medium">99.9% Uptime</span>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Preguntas frecuentes
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "¿Puedo cambiar de plan en cualquier momento?",
                a: "Sí, puedes actualizar o cambiar tu plan cuando quieras. Los cambios se aplican de forma inmediata y ajustamos la facturación proporcionalmente.",
              },
              {
                q: "¿Qué incluye la detección de fraude con IA?",
                a: "Nuestro sistema analiza imágenes, descripciones y precios para detectar anuncios duplicados, fotos falsas, y precios sospechosos. Te mostramos un score de autenticidad del 0 al 100%.",
              },
              {
                q: "¿Ofrecen prueba gratuita del plan Pro?",
                a: "Sí, ofrecemos 14 días de prueba gratuita del plan Pro sin necesidad de tarjeta de crédito.",
              },
              {
                q: "¿Cómo funciona el plan para agencias?",
                a: "El plan Agencia incluye acceso API, múltiples usuarios, y herramientas profesionales. Contacta con ventas para una demo personalizada.",
              },
            ].map((faq, index) => (
              <div key={index} className="border-b pb-4">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
