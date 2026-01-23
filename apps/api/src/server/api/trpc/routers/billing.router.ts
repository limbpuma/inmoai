import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import {
  createCheckoutSession,
  createBillingPortalSession,
  getSubscriptionStatus,
  PLANS,
} from '@/server/services/stripe';
import { env } from '@/config/env';

export const billingRouter = router({
  // Get available plans
  getPlans: publicProcedure.query(() => {
    return Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      ...plan,
      // Don't expose priceId to client
      priceId: undefined,
    }));
  }),

  // Get current subscription status
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    return getSubscriptionStatus(ctx.session.user.id);
  }),

  // Create checkout session
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

  // Create billing portal session
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
