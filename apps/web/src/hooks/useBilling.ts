"use client";

import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";

export function useBilling() {
  const { data: session } = useSession();
  const utils = trpc.useUtils();

  const { data: subscription, isLoading: isLoadingSubscription } =
    trpc.billing.getSubscription.useQuery(undefined, {
      enabled: !!session?.user,
      retry: false,
    });

  const { data: plans } = trpc.billing.getPlans.useQuery(undefined, {
    retry: false,
  });

  const checkoutMutation = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const portalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const subscribe = async (planId: "pro" | "agency") => {
    await checkoutMutation.mutateAsync({ planId });
  };

  const openBillingPortal = async () => {
    await portalMutation.mutateAsync();
  };

  const isPro = subscription?.role === "premium" && subscription?.isActive;
  const isAgency = subscription?.role === "agency" && subscription?.isActive;
  const hasActiveSubscription = isPro || isAgency;

  return {
    subscription,
    plans,
    isLoadingSubscription,
    isPro,
    isAgency,
    hasActiveSubscription,
    subscribe,
    openBillingPortal,
    isSubscribing: checkoutMutation.isPending,
    isOpeningPortal: portalMutation.isPending,
  };
}
