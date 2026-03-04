"use client";

import { Suspense, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("pricing");

  if (!success && !canceled) return null;

  return (
    <>
      {success && (
        <div className="mb-8 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3 max-w-2xl mx-auto">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-green-800">
            {t("successMsg")}
          </p>
        </div>
      )}
      {canceled && (
        <div className="mb-8 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3 max-w-2xl mx-auto">
          <XCircle className="h-5 w-5 text-amber-600" />
          <p className="text-amber-800">
            {t("canceledMsg")}
          </p>
        </div>
      )}
    </>
  );
}

/**
 * PRICING v4 - Intelligence Service Model
 *
 * PRINCIPIOS:
 * 1. Free limitado → demuestra valor → fuerza upgrade
 * 2. Pro a €49/mes → valor en verificaciones + herramientas avanzadas
 * 3. Agency a €149/mes → automatización + API access
 * 4. Revenue real viene de: suscripciones + verificaciones premium + transacciones (0.5%)
 *
 * Valores sincronizados con apps/api/src/config/pricing.ts
 */

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const { subscribe, subscription, isSubscribing, openBillingPortal, isOpeningPortal } = useBilling();
  const t = useTranslations("pricing");
  const tc = useTranslations("common");

  const plans = [
    {
      id: "free" as const,
      name: t("planExplorer"),
      description: t("planExplorerDesc"),
      monthlyPrice: 0,
      yearlyPrice: 0,
      icon: Users,
      features: [
        t("feat_searches", { count: 30 }),
        t("feat_verifications", { count: 1 }),
        t("feat_fraud", { count: 3 }),
        t("feat_market"),
        t("feat_alerts", { count: 1 }),
      ],
      cta: t("startFree"),
      popular: true,
    },
    {
      id: "pro" as const,
      name: t("planPro"),
      description: t("planProDesc"),
      monthlyPrice: 49,
      yearlyPrice: 529,
      icon: Zap,
      features: [
        t("feat_searches", { count: 500 }),
        t("feat_verifications", { count: 50 }),
        t("feat_fraud", { count: 100 }),
        t("feat_history"),
        t("feat_export"),
        t("feat_alerts", { count: 10 }),
        t("feat_priority"),
      ],
      cta: t("subscribe"),
      popular: false,
    },
    {
      id: "agency" as const,
      name: t("planAgency"),
      description: t("planAgencyDesc"),
      monthlyPrice: 149,
      yearlyPrice: 1609,
      icon: Building2,
      features: [
        t("feat_allPro"),
        t("feat_searches", { count: 2000 }),
        t("feat_verifications", { count: 200 }),
        t("feat_autopost"),
        t("feat_analytics"),
        t("feat_leads"),
        t("feat_api", { count: 1000 }),
        t("feat_support247"),
      ],
      cta: t("subscribe"),
      popular: false,
    },
  ];

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
            {t("badge")}
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            {t.rich("title", {
              highlight: (chunks) => <span className="text-primary">{chunks}</span>,
            })}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Label
            htmlFor="billing"
            className={!isYearly ? "font-semibold" : "text-muted-foreground"}
          >
            {t("monthly")}
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
            {t("yearly")}
          </Label>
          {isYearly && (
            <Badge variant="default" className="bg-green-600">
              {t("savePercent")}
            </Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const period = isYearly ? t("perYear") : t("perMonth");
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
                    {t("mostPopular")}
                  </Badge>
                )}

                {isCurrentPlan && (
                  <Badge variant="outline" className="absolute -top-3 right-4 bg-background">
                    {t("currentPlan")}
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
                      {price === 0 ? tc("free") : `${price}€`}
                    </span>
                    {price > 0 && (
                      <span className="text-muted-foreground">{period}</span>
                    )}
                  </div>
                  {isYearly && price > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("billedYearly", { price: (price / 12).toFixed(2) })}
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
                        {t("opening")}
                      </>
                    ) : (
                      t("manage")
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
                        {t("processing")}
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
                    {isCurrentPlan ? t("currentPlanBtn") : t("startFree")}
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
            {t("trustLine")}
          </p>
          <div className="flex flex-wrap justify-center gap-8 items-center opacity-60">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="font-medium">{t("ssl")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span className="font-medium">{t("gdpr")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span className="font-medium">{t("uptime")}</span>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            {t("faqTitle")}
          </h2>
          <div className="space-y-6">
            {[
              {
                q: t("faq1q"),
                a: t("faq1a"),
              },
              {
                q: t("faq2q"),
                a: t("faq2a"),
              },
              {
                q: t("faq3q"),
                a: t("faq3a"),
              },
              {
                q: t("faq4q"),
                a: t("faq4a"),
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
