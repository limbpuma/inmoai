import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import {
  createCheckoutSession,
  createBillingPortalSession,
  getSubscriptionStatus,
  PLANS,
  TRANSACTION_FEES,
} from '@/server/services/stripe';
import {
  PRICING_TIERS,
  OUTCOME_PRICING,
  getTierConfig,
  getLimit,
  isFeatureEnabled,
  calculateOutcomeFee,
  type PricingTier,
} from '@/config/pricing';
import { env } from '@/config/env';

export const billingRouter = createTRPCRouter({
  /**
   * Get available plans (Stripe-based)
   */
  getPlans: publicProcedure.query(() => {
    return Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      ...plan,
      // Don't expose priceId to client
      priceId: undefined,
    }));
  }),

  /**
   * Get pricing tiers with full config
   */
  getPricingTiers: publicProcedure.query(() => {
    return Object.entries(PRICING_TIERS).map(([key, tier]) => ({
      id: key,
      name: tier.name,
      description: tier.description,
      priceMonthly: tier.priceMonthly,
      priceYearly: tier.priceYearly,
      limits: tier.limits,
      features: tier.features,
    }));
  }),

  /**
   * Get outcome-based pricing (transaction fees)
   */
  getOutcomePricing: publicProcedure.query(() => {
    return {
      outcomeFees: OUTCOME_PRICING,
      transactionFees: TRANSACTION_FEES,
    };
  }),

  /**
   * Calculate outcome fee for a transaction
   */
  calculateFee: publicProcedure
    .input(
      z.object({
        type: z.enum(['sale', 'rent']),
        price: z.number().positive(),
      })
    )
    .query(({ input }) => {
      const fee = calculateOutcomeFee(input.type, input.price);
      return {
        type: input.type,
        price: input.price,
        fee,
        percentage: input.type === 'sale'
          ? OUTCOME_PRICING.closedDeal.salePercentage
          : OUTCOME_PRICING.closedDeal.rentFirstMonthPercent,
      };
    }),

  /**
   * Get current subscription status
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    return getSubscriptionStatus(ctx.session.user.id);
  }),

  /**
   * Get user's current tier and limits
   */
  getCurrentTier: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await getSubscriptionStatus(ctx.session.user.id);

    // Map user role to pricing tier
    let tier: PricingTier = 'free';
    if (subscription?.role === 'agency') {
      tier = 'agency';
    } else if (subscription?.role === 'premium') {
      tier = 'pro';
    }

    const config = getTierConfig(tier);

    return {
      tier,
      config,
      isActive: subscription?.isActive ?? false,
      expiresAt: subscription?.currentPeriodEnd,
    };
  }),

  /**
   * Check if a feature is available for the user
   */
  checkFeature: protectedProcedure
    .input(
      z.object({
        feature: z.enum([
          'semanticSearch',
          'cadastreVerification',
          'fraudDetection',
          'aiValuation',
          'priceHistory',
          'marketAlerts',
          'exportData',
          'prioritySupport',
          'whiteLabel',
          'dedicatedAccount',
          'apiAccess',
          'bulkOperations',
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      const subscription = await getSubscriptionStatus(ctx.session.user.id);

      let tier: PricingTier = 'free';
      if (subscription?.role === 'agency') {
        tier = 'agency';
      } else if (subscription?.role === 'premium') {
        tier = 'pro';
      }

      return {
        feature: input.feature,
        enabled: isFeatureEnabled(tier, input.feature),
        tier,
      };
    }),

  /**
   * Get a specific limit for the user
   */
  getLimit: protectedProcedure
    .input(
      z.object({
        limit: z.enum([
          'searchesPerMonth',
          'semanticSearches',
          'cadastreVerifications',
          'fraudDetections',
          'valuations',
          'savedSearches',
          'alerts',
          'activeListings',
          'leadsPerMonth',
          'apiCallsPerMonth',
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      const subscription = await getSubscriptionStatus(ctx.session.user.id);

      let tier: PricingTier = 'free';
      if (subscription?.role === 'agency') {
        tier = 'agency';
      } else if (subscription?.role === 'premium') {
        tier = 'pro';
      }

      const value = getLimit(tier, input.limit);

      return {
        limit: input.limit,
        value,
        isUnlimited: value === -1,
        tier,
      };
    }),

  /**
   * Create checkout session
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planId: z.enum(['pro', 'agency']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plan = PLANS[input.planId];

      if (!plan.priceId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Plan no disponible',
        });
      }

      const baseUrl = env.NEXT_PUBLIC_APP_URL;

      const session = await createCheckoutSession(
        ctx.session.user.id,
        plan.priceId,
        `${baseUrl}/dashboard?success=true`,
        `${baseUrl}/pricing?canceled=true`
      );

      return { url: session.url };
    }),

  /**
   * Create billing portal session
   */
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const baseUrl = env.NEXT_PUBLIC_APP_URL;

    try {
      const session = await createBillingPortalSession(
        ctx.session.user.id,
        `${baseUrl}/dashboard`
      );

      return { url: session.url };
    } catch (error) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error instanceof Error ? error.message : 'Error al crear portal',
      });
    }
  }),
});
