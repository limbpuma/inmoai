"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Check,
  Sparkles,
  Shield,
  Zap,
  Building2,
  Users,
  Crown,
} from "lucide-react";

const plans = [
  {
    id: "free",
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
    cta: "Empezar gratis",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para compradores serios en búsqueda activa",
    monthlyPrice: 19,
    yearlyPrice: 190,
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
    cta: "Comenzar prueba gratis",
    popular: true,
  },
  {
    id: "agency",
    name: "Agencia",
    description: "Para profesionales inmobiliarios",
    monthlyPrice: 99,
    yearlyPrice: 990,
    icon: Building2,
    features: [
      "Todo lo de Pro",
      "API de acceso completo",
      "Hasta 10 usuarios",
      "Dashboard de analytics",
      "Integración CRM",
      "Informes personalizados",
      "Soporte prioritario 24/7",
      "Marca blanca disponible",
    ],
    cta: "Contactar ventas",
    popular: false,
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-16">
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

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-8 ${
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/10 scale-105"
                    : "border-border"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Más popular
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
                      {Math.round(price / 12)}€/mes facturado anualmente
                    </p>
                  )}
                </div>

                <Button
                  className="w-full mb-6"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>

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
