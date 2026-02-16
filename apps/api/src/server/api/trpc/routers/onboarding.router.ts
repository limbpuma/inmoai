/**
 * Onboarding Router
 *
 * API endpoints para el flujo de onboarding de vendedores.
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { onboardingService } from '@/server/services/onboarding';
import { TRPCError } from '@trpc/server';

export const onboardingRouter = createTRPCRouter({
  /**
   * Obtiene el estado actual del onboarding
   */
  getState: protectedProcedure.query(async ({ ctx }) => {
    const state = await onboardingService.getOnboardingState(ctx.session.user.id);
    return { state };
  }),

  /**
   * Obtiene los pasos del onboarding con requisitos
   */
  getSteps: protectedProcedure.query(async ({ ctx }) => {
    const steps = await onboardingService.getOnboardingSteps(ctx.session.user.id);
    return { steps };
  }),

  /**
   * Obtiene el progreso general
   */
  getProgress: protectedProcedure.query(async ({ ctx }) => {
    const progress = await onboardingService.getProgress(ctx.session.user.id);
    return { progress };
  }),

  /**
   * Completa una etapa
   */
  completeStage: protectedProcedure
    .input(
      z.object({
        stage: z.enum([
          'signup',
          'profile_setup',
          'first_listing',
          'verification',
          'social_connect',
          'completed',
        ]),
        data: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const state = await onboardingService.completeStage(
          ctx.session.user.id,
          input.stage,
          input.data
        );
        return { success: true, state };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Error completing stage',
        });
      }
    }),

  /**
   * Salta una etapa opcional
   */
  skipStage: protectedProcedure
    .input(
      z.object({
        stage: z.enum(['social_connect']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const state = await onboardingService.skipStage(ctx.session.user.id, input.stage);
        return { success: true, state };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Error skipping stage',
        });
      }
    }),

  /**
   * Reinicia el onboarding (solo para testing/admin)
   */
  reset: protectedProcedure.mutation(async ({ ctx }) => {
    const state = await onboardingService.initializeOnboarding(ctx.session.user.id);
    return { success: true, state };
  }),
});
