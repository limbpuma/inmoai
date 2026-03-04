"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Crown,
  CheckCircle2,
  Loader2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProviderPlanPage() {
  const { data: subscription, isLoading } = trpc.marketplace.getProviderSubscription.useQuery();
  const { data: plans } = trpc.marketplace.getProviderPlans.useQuery();

  const checkoutMutation = trpc.marketplace.createProviderCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const handleUpgrade = (tier: "premium" | "enterprise") => {
    checkoutMutation.mutate({
      tier,
      successUrl: `${window.location.origin}/dashboard/proveedor/plan?success=true`,
      cancelUrl: `${window.location.origin}/dashboard/proveedor/plan?cancelled=true`,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No tienes un perfil de profesional.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi plan</h1>
        <p className="text-muted-foreground">
          Plan actual: <strong>{subscription.planName}</strong>
          {subscription.currentPeriodEnd && (
            <span>
              {" "}(renueva {new Date(subscription.currentPeriodEnd).toLocaleDateString("es-ES")})
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans?.map((plan) => {
          const isCurrent = plan.id === subscription.tier;
          const isUpgrade = plan.price > (subscription.price ?? 0);

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative",
                isCurrent && "border-primary ring-1 ring-primary",
                plan.id === "premium" && "border-amber-300"
              )}
            >
              {isCurrent && (
                <Badge className="absolute -top-2.5 left-4 bg-primary">
                  Plan actual
                </Badge>
              )}
              {plan.id === "premium" && !isCurrent && (
                <Badge className="absolute -top-2.5 left-4 bg-amber-500">
                  Popular
                </Badge>
              )}

              <CardHeader>
                <div className="flex items-center gap-2">
                  {plan.id === "enterprise" ? (
                    <Zap className="h-5 w-5 text-purple-500" />
                  ) : plan.id === "premium" ? (
                    <Crown className="h-5 w-5 text-amber-500" />
                  ) : null}
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">{plan.price}€</span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">/mes</span>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    Plan actual
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(plan.id as "premium" | "enterprise")}
                    disabled={checkoutMutation.isPending || plan.price === 0}
                  >
                    {checkoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Crown className="h-4 w-4 mr-2" />
                    )}
                    Actualizar
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    --
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
