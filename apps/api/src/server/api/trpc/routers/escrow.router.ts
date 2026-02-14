/**
 * Escrow Router - API for secure payment handling
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { escrowService, PLATFORM_FEES, ESCROW_LIMITS } from '@/server/services/escrow';

// Input schemas
const escrowTypeSchema = z.enum(['property_sale', 'property_rent', 'service_completion', 'custom']);

const conditionSchema = z.object({
  type: escrowTypeSchema,
  description: z.string(),
  deadline: z.date().optional(),
  verificationRequired: z.boolean().optional(),
  verificationMethod: z.enum(['document', 'signature', 'inspection', 'manual']).optional(),
});

const createEscrowSchema = z.object({
  buyerId: z.string().uuid(),
  sellerId: z.string().uuid(),
  listingId: z.string().uuid().optional(),
  serviceLeadId: z.string().uuid().optional(),
  amount: z.number().min(ESCROW_LIMITS.minAmount).max(ESCROW_LIMITS.maxAmount),
  currency: z.string().length(3).optional().default('EUR'),
  type: escrowTypeSchema,
  conditions: z.array(conditionSchema).min(1),
  expiresAt: z.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const evidenceSchema = z.object({
  documentUrls: z.array(z.string().url()).optional(),
  verificationIds: z.array(z.string()).optional(),
  signatures: z.array(z.object({
    partyId: z.string(),
    signedAt: z.string(),
    signatureUrl: z.string().url(),
  })).optional(),
  inspectionReport: z.object({
    inspectorId: z.string(),
    date: z.string(),
    passed: z.boolean(),
    notes: z.string(),
  }).optional(),
});

export const escrowRouter = createTRPCRouter({
  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Get escrow configuration
   */
  getConfig: protectedProcedure.query(async () => {
    return {
      fees: PLATFORM_FEES,
      limits: ESCROW_LIMITS,
      supportedCurrencies: ['EUR', 'USD', 'GBP'],
    };
  }),

  // ============================================
  // ESCROW MANAGEMENT
  // ============================================

  /**
   * Create a new escrow
   */
  create: protectedProcedure
    .input(createEscrowSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify the user is either the buyer or has admin rights
        if (input.buyerId !== ctx.session.user.id && ctx.session.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only the buyer can create an escrow',
          });
        }

        const escrowDetails = await escrowService.createEscrow({
          ...input,
          conditions: input.conditions.map(c => ({
            ...c,
            deadline: c.deadline ?? undefined,
          })),
        });

        return escrowDetails;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create escrow',
        });
      }
    }),

  /**
   * Fund an escrow
   * Security: Only the buyer can fund their escrow
   */
  fund: protectedProcedure
    .input(z.object({
      escrowId: z.string().uuid(),
      paymentMethodId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Security: Verify ownership before funding
        const existingEscrow = await escrowService.getEscrowDetails(input.escrowId);

        if (existingEscrow.buyer.id !== ctx.session.user.id && ctx.session.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only the buyer can fund this escrow',
          });
        }

        const escrowDetails = await escrowService.fundEscrow({
          escrowId: input.escrowId,
          paymentMethodId: input.paymentMethodId,
        });

        return escrowDetails;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fund escrow',
        });
      }
    }),

  /**
   * Release escrow funds to seller
   * Security: Only the buyer can authorize fund release (or admin in disputes)
   */
  release: protectedProcedure
    .input(z.object({
      escrowId: z.string().uuid(),
      evidence: evidenceSchema.optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Security: Verify authorization before releasing funds
        const existingEscrow = await escrowService.getEscrowDetails(input.escrowId);

        const isBuyer = existingEscrow.buyer.id === ctx.session.user.id;
        const isAdmin = ctx.session.user.role === 'admin';

        if (!isBuyer && !isAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only the buyer can authorize fund release',
          });
        }

        // Verify conditions are met (unless admin override)
        if (!existingEscrow.conditionsMet && !isAdmin) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Escrow conditions have not been met',
          });
        }

        const escrowDetails = await escrowService.releaseEscrow({
          escrowId: input.escrowId,
          releasedBy: ctx.session.user.id,
          evidence: input.evidence,
          notes: input.notes,
        });

        return escrowDetails;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to release escrow',
        });
      }
    }),

  /**
   * Request refund
   * Security: Only parties to the escrow or admin can request refund
   */
  refund: protectedProcedure
    .input(z.object({
      escrowId: z.string().uuid(),
      reason: z.string().min(10),
      partialAmount: z.number().positive().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Security: Verify user is party to escrow
        const existingEscrow = await escrowService.getEscrowDetails(input.escrowId);

        const isBuyer = existingEscrow.buyer.id === ctx.session.user.id;
        const isSeller = existingEscrow.seller.id === ctx.session.user.id;
        const isAdmin = ctx.session.user.role === 'admin';

        if (!isBuyer && !isSeller && !isAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only parties to this escrow can request a refund',
          });
        }

        // Validate partial amount doesn't exceed escrow amount
        if (input.partialAmount && input.partialAmount > existingEscrow.amount) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Partial refund amount exceeds escrow amount',
          });
        }

        const escrowDetails = await escrowService.refundEscrow({
          escrowId: input.escrowId,
          refundedBy: ctx.session.user.id,
          reason: input.reason,
          partialAmount: input.partialAmount,
        });

        return escrowDetails;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to refund escrow',
        });
      }
    }),

  /**
   * Open a dispute
   * Security: Only parties to the escrow can open a dispute
   */
  dispute: protectedProcedure
    .input(z.object({
      escrowId: z.string().uuid(),
      reason: z.string().min(20),
      evidence: evidenceSchema.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Security: Verify user is party to escrow
        const existingEscrow = await escrowService.getEscrowDetails(input.escrowId);

        const isBuyer = existingEscrow.buyer.id === ctx.session.user.id;
        const isSeller = existingEscrow.seller.id === ctx.session.user.id;

        if (!isBuyer && !isSeller) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only parties to this escrow can open a dispute',
          });
        }

        const escrowDetails = await escrowService.disputeEscrow({
          escrowId: input.escrowId,
          disputedBy: ctx.session.user.id,
          reason: input.reason,
          evidence: input.evidence,
        });

        return escrowDetails;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to open dispute',
        });
      }
    }),

  /**
   * Add evidence to an escrow
   * Security: Only parties to the escrow can add evidence
   */
  addEvidence: protectedProcedure
    .input(z.object({
      escrowId: z.string().uuid(),
      evidence: evidenceSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Security: Verify user is party to escrow
        const existingEscrow = await escrowService.getEscrowDetails(input.escrowId);

        const isBuyer = existingEscrow.buyer.id === ctx.session.user.id;
        const isSeller = existingEscrow.seller.id === ctx.session.user.id;
        const isAdmin = ctx.session.user.role === 'admin';

        if (!isBuyer && !isSeller && !isAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only parties to this escrow can add evidence',
          });
        }

        const escrowDetails = await escrowService.addEvidence(
          input.escrowId,
          input.evidence
        );

        return escrowDetails;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add evidence',
        });
      }
    }),

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get escrow details
   */
  get: protectedProcedure
    .input(z.object({ escrowId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      try {
        const escrowDetails = await escrowService.getEscrowDetails(input.escrowId);

        // Check access rights
        if (
          escrowDetails.buyer.id !== ctx.session.user.id &&
          escrowDetails.seller.id !== ctx.session.user.id &&
          ctx.session.user.role !== 'admin'
        ) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this escrow',
          });
        }

        return escrowDetails;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Escrow not found',
        });
      }
    }),

  /**
   * List user's escrows
   */
  list: protectedProcedure
    .input(z.object({
      role: z.enum(['buyer', 'seller', 'both']).optional().default('both'),
      status: z.enum(['pending', 'funded', 'released', 'refunded', 'disputed']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const escrows = await escrowService.getUserEscrows(
        ctx.session.user.id,
        input.role,
        input.status
      );

      return escrows;
    }),

  /**
   * Get escrow summary (admin only)
   */
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }

    return escrowService.getEscrowSummary();
  }),

  /**
   * Verify conditions
   * Security: Only parties to the escrow can verify conditions
   */
  verifyConditions: protectedProcedure
    .input(z.object({ escrowId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // Security: Verify user is party to escrow
      const existingEscrow = await escrowService.getEscrowDetails(input.escrowId);

      const isBuyer = existingEscrow.buyer.id === ctx.session.user.id;
      const isSeller = existingEscrow.seller.id === ctx.session.user.id;
      const isAdmin = ctx.session.user.role === 'admin';

      if (!isBuyer && !isSeller && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this escrow',
        });
      }

      const conditionsMet = await escrowService.verifyConditions(input.escrowId);
      return { conditionsMet };
    }),

  /**
   * Calculate fees preview
   */
  calculateFees: protectedProcedure
    .input(z.object({
      amount: z.number().positive(),
      type: escrowTypeSchema,
    }))
    .query(async ({ input }) => {
      const feeRate = PLATFORM_FEES[input.type];
      const platformFee = Math.round(input.amount * feeRate * 100) / 100;
      const totalAmount = input.amount + platformFee;

      return {
        amount: input.amount,
        feeRate,
        feePercent: `${(feeRate * 100).toFixed(1)}%`,
        platformFee,
        totalAmount,
        currency: 'EUR',
      };
    }),
});
