/**
 * Escrow Service
 * Manages secure payments and fund holding for property and service transactions
 */

import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm';
import { db } from '@/server/infrastructure/database';
import { escrow, users, agentSessions, agentTransactions } from '@/server/infrastructure/database/schema';
import Stripe from 'stripe';
import { env } from '@/config/env';
import type {
  EscrowStatus,
  EscrowType,
  EscrowCondition,
  EscrowEvidence,
  CreateEscrowParams,
  FundEscrowParams,
  ReleaseEscrowParams,
  RefundEscrowParams,
  DisputeEscrowParams,
  EscrowDetails,
  EscrowSummary,
} from './types';
import { PLATFORM_FEES, ESCROW_LIMITS } from './types';

class EscrowService {
  private stripe: Stripe | null = null;

  constructor() {
    if (env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-12-15.clover',
      });
    }
  }

  // ============================================
  // ESCROW CREATION
  // ============================================

  /**
   * Create a new escrow for a transaction
   */
  async createEscrow(params: CreateEscrowParams): Promise<EscrowDetails> {
    // Validate amount
    if (params.amount < ESCROW_LIMITS.minAmount) {
      throw new Error(`Minimum escrow amount is ${ESCROW_LIMITS.minAmount} EUR`);
    }
    if (params.amount > ESCROW_LIMITS.maxAmount) {
      throw new Error(`Maximum escrow amount is ${ESCROW_LIMITS.maxAmount} EUR`);
    }

    // Calculate platform fee
    const feeRate = PLATFORM_FEES[params.type];
    const platformFee = Math.round(params.amount * feeRate * 100) / 100;

    // Calculate expiration if not provided
    const expiresAt = params.expiresAt ||
      new Date(Date.now() + ESCROW_LIMITS.maxDurationDays * 24 * 60 * 60 * 1000);

    // Convert conditions for database storage (Date -> string)
    const dbConditions = params.conditions.map(c => ({
      type: c.type,
      description: c.description,
      deadline: c.deadline?.toISOString(),
      verificationRequired: c.verificationRequired,
    }));

    // Create escrow record
    const [newEscrow] = await db
      .insert(escrow)
      .values({
        buyerId: params.buyerId,
        sellerId: params.sellerId,
        listingId: params.listingId,
        agentSessionId: params.agentSessionId,
        amount: String(params.amount),
        currency: params.currency || 'EUR',
        platformFee: String(platformFee),
        status: 'pending',
        conditions: dbConditions,
        conditionsMet: false,
        expiresAt,
        metadata: params.metadata,
      })
      .returning();

    return this.getEscrowDetails(newEscrow.id);
  }

  /**
   * Fund an escrow (process payment)
   * Uses atomic update with status check to prevent race conditions
   */
  async fundEscrow(params: FundEscrowParams): Promise<EscrowDetails> {
    return await db.transaction(async (tx) => {
      // Atomic read-and-check: only select if status is 'pending'
      const escrowRecord = await tx.query.escrow.findFirst({
        where: and(
          eq(escrow.id, params.escrowId),
          eq(escrow.status, 'pending')
        ),
      });

      if (!escrowRecord) {
        // Check if escrow exists at all
        const anyEscrow = await tx.query.escrow.findFirst({
          where: eq(escrow.id, params.escrowId),
        });
        if (!anyEscrow) {
          throw new Error('Escrow not found');
        }
        throw new Error(`Cannot fund escrow in ${anyEscrow.status} status`);
      }

      // Check expiration
      if (escrowRecord.expiresAt && new Date(escrowRecord.expiresAt) < new Date()) {
        throw new Error('Escrow has expired');
      }

      let stripePaymentIntentId = params.stripePaymentIntentId;

      // If Stripe is configured and we have a payment method, create payment intent
      if (this.stripe && params.paymentMethodId && !stripePaymentIntentId) {
        const buyer = await tx.query.users.findFirst({
          where: eq(users.id, escrowRecord.buyerId!),
        });

        const totalAmount = parseFloat(escrowRecord.amount) + parseFloat(escrowRecord.platformFee ?? '0');

        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100), // Stripe uses cents
          currency: escrowRecord.currency ?? 'eur',
          payment_method: params.paymentMethodId,
          confirm: true,
          customer: buyer?.stripeCustomerId ?? undefined,
          metadata: {
            escrowId: escrowRecord.id,
            type: 'escrow_funding',
          },
          // Hold funds, don't capture immediately
          capture_method: 'manual',
        });

        stripePaymentIntentId = paymentIntent.id;
      }

      // Atomic update with status condition (double-check)
      const updated = await tx
        .update(escrow)
        .set({
          status: 'funded',
          stripePaymentIntentId,
          fundedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(escrow.id, params.escrowId),
          eq(escrow.status, 'pending') // Only update if still pending
        ))
        .returning({ id: escrow.id });

      // Verify update succeeded (race condition protection)
      if (updated.length === 0) {
        throw new Error('Escrow was modified concurrently. Please try again.');
      }

      return this.getEscrowDetails(params.escrowId);
    });
  }

  // ============================================
  // ESCROW RELEASE
  // ============================================

  /**
   * Release funds to the seller
   * Uses atomic update with status check to prevent race conditions
   */
  async releaseEscrow(params: ReleaseEscrowParams): Promise<EscrowDetails> {
    return await db.transaction(async (tx) => {
      // Atomic read-and-check: only select if status is 'funded'
      const escrowRecord = await tx.query.escrow.findFirst({
        where: and(
          eq(escrow.id, params.escrowId),
          eq(escrow.status, 'funded')
        ),
      });

      if (!escrowRecord) {
        // Check if escrow exists at all
        const anyEscrow = await tx.query.escrow.findFirst({
          where: eq(escrow.id, params.escrowId),
        });
        if (!anyEscrow) {
          throw new Error('Escrow not found');
        }
        throw new Error(`Cannot release escrow in ${anyEscrow.status} status`);
      }

      // Verify conditions are met (or being manually overridden)
      // In production, would check each condition

      // Update evidence
      const existingEvidence = (escrowRecord.evidence ?? {}) as EscrowEvidence;
      const updatedEvidence: EscrowEvidence = {
        ...existingEvidence,
        ...params.evidence,
      };

      // If Stripe payment exists, capture and transfer funds
      let stripeTransferId: string | undefined;

      if (this.stripe && escrowRecord.stripePaymentIntentId) {
        // Capture the payment
        await this.stripe.paymentIntents.capture(escrowRecord.stripePaymentIntentId);

        // Get seller's Stripe account
        const seller = await tx.query.users.findFirst({
          where: eq(users.id, escrowRecord.sellerId!),
        });

        if (seller?.stripeCustomerId) {
          // Create transfer to seller (minus platform fee)
          const transferAmount = Math.round(parseFloat(escrowRecord.amount) * 100);

          // In production, would use Stripe Connect to transfer to connected account
          // For now, we just record the transfer ID
          // const transfer = await this.stripe.transfers.create({
          //   amount: transferAmount,
          //   currency: escrowRecord.currency ?? 'eur',
          //   destination: seller.stripeConnectAccountId,
          // });
          // stripeTransferId = transfer.id;
        }
      }

      // Atomic update with status condition (double-check)
      const updated = await tx
        .update(escrow)
        .set({
          status: 'released',
          conditionsMet: true,
          releasedAt: new Date(),
          stripeTransferId,
          evidence: updatedEvidence,
          notes: params.notes,
          updatedAt: new Date(),
        })
        .where(and(
          eq(escrow.id, params.escrowId),
          eq(escrow.status, 'funded') // Only update if still funded
        ))
        .returning({ id: escrow.id });

      // Verify update succeeded (race condition protection)
      if (updated.length === 0) {
        throw new Error('Escrow was modified concurrently. Please try again.');
      }

      // Create agent transaction for the platform fee
      await this.createPlatformFeeTransaction(escrowRecord);

      return this.getEscrowDetails(params.escrowId);
    });
  }

  /**
   * Refund escrow to buyer
   * Uses atomic update with status check to prevent race conditions
   */
  async refundEscrow(params: RefundEscrowParams): Promise<EscrowDetails> {
    const validStatuses: string[] = ['pending', 'funded', 'disputed'];

    return await db.transaction(async (tx) => {
      // Atomic read-and-check: only select if status is valid for refund
      const escrowRecord = await tx.query.escrow.findFirst({
        where: and(
          eq(escrow.id, params.escrowId),
          inArray(escrow.status, validStatuses)
        ),
      });

      if (!escrowRecord) {
        // Check if escrow exists at all
        const anyEscrow = await tx.query.escrow.findFirst({
          where: eq(escrow.id, params.escrowId),
        });
        if (!anyEscrow) {
          throw new Error('Escrow not found');
        }
        throw new Error(`Cannot refund escrow in ${anyEscrow.status} status`);
      }

      const refundAmount = params.partialAmount ?? parseFloat(escrowRecord.amount);

      // If Stripe payment exists, process refund
      if (this.stripe && escrowRecord.stripePaymentIntentId) {
        await this.stripe.refunds.create({
          payment_intent: escrowRecord.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100),
          reason: 'requested_by_customer',
        });
      }

      // Atomic update with status condition (double-check)
      const updated = await tx
        .update(escrow)
        .set({
          status: 'refunded',
          refundedAt: new Date(),
          notes: params.reason,
          updatedAt: new Date(),
        })
        .where(and(
          eq(escrow.id, params.escrowId),
          inArray(escrow.status, validStatuses) // Only update if still in valid status
        ))
        .returning({ id: escrow.id });

      // Verify update succeeded (race condition protection)
      if (updated.length === 0) {
        throw new Error('Escrow was modified concurrently. Please try again.');
      }

      return this.getEscrowDetails(params.escrowId);
    });
  }

  // ============================================
  // DISPUTES
  // ============================================

  /**
   * Open a dispute on an escrow
   * Uses atomic update with status check to prevent race conditions
   */
  async disputeEscrow(params: DisputeEscrowParams): Promise<EscrowDetails> {
    return await db.transaction(async (tx) => {
      // Atomic read-and-check: only select if status is 'funded'
      const escrowRecord = await tx.query.escrow.findFirst({
        where: and(
          eq(escrow.id, params.escrowId),
          eq(escrow.status, 'funded')
        ),
      });

      if (!escrowRecord) {
        // Check if escrow exists at all
        const anyEscrow = await tx.query.escrow.findFirst({
          where: eq(escrow.id, params.escrowId),
        });
        if (!anyEscrow) {
          throw new Error('Escrow not found');
        }
        throw new Error(`Cannot dispute escrow in ${anyEscrow.status} status`);
      }

      const existingEvidence = (escrowRecord.evidence ?? {}) as EscrowEvidence;
      const updatedEvidence: EscrowEvidence = {
        ...existingEvidence,
        ...params.evidence,
      };

      // Atomic update with status condition (double-check)
      const updated = await tx
        .update(escrow)
        .set({
          status: 'disputed',
          disputedAt: new Date(),
          evidence: updatedEvidence,
          notes: params.reason,
          updatedAt: new Date(),
        })
        .where(and(
          eq(escrow.id, params.escrowId),
          eq(escrow.status, 'funded') // Only update if still funded
        ))
        .returning({ id: escrow.id });

      // Verify update succeeded (race condition protection)
      if (updated.length === 0) {
        throw new Error('Escrow was modified concurrently. Please try again.');
      }

      // In production: notify admin, start dispute resolution process

      return this.getEscrowDetails(params.escrowId);
    });
  }

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get detailed escrow information
   */
  async getEscrowDetails(escrowId: string): Promise<EscrowDetails> {
    const escrowRecord = await db.query.escrow.findFirst({
      where: eq(escrow.id, escrowId),
    });

    if (!escrowRecord) {
      throw new Error('Escrow not found');
    }

    // Get user details
    const [buyer, seller] = await Promise.all([
      escrowRecord.buyerId ? db.query.users.findFirst({ where: eq(users.id, escrowRecord.buyerId) }) : null,
      escrowRecord.sellerId ? db.query.users.findFirst({ where: eq(users.id, escrowRecord.sellerId) }) : null,
    ]);

    return {
      id: escrowRecord.id,
      status: escrowRecord.status as EscrowStatus,
      buyer: {
        id: escrowRecord.buyerId ?? '',
        name: buyer?.name ?? undefined,
        email: buyer?.email ?? undefined,
      },
      seller: {
        id: escrowRecord.sellerId ?? '',
        name: seller?.name ?? undefined,
        email: seller?.email ?? undefined,
      },
      amount: parseFloat(escrowRecord.amount),
      platformFee: parseFloat(escrowRecord.platformFee ?? '0'),
      totalAmount: parseFloat(escrowRecord.amount) + parseFloat(escrowRecord.platformFee ?? '0'),
      currency: escrowRecord.currency ?? 'EUR',
      type: ((escrowRecord.conditions as EscrowCondition[])?.[0]?.type ?? 'custom') as EscrowType,
      conditions: (escrowRecord.conditions ?? []) as EscrowCondition[],
      conditionsMet: escrowRecord.conditionsMet ?? false,
      timeline: {
        createdAt: escrowRecord.createdAt,
        fundedAt: escrowRecord.fundedAt ?? undefined,
        releasedAt: escrowRecord.releasedAt ?? undefined,
        refundedAt: escrowRecord.refundedAt ?? undefined,
        disputedAt: escrowRecord.disputedAt ?? undefined,
        expiresAt: escrowRecord.expiresAt ?? undefined,
      },
      evidence: escrowRecord.evidence as EscrowEvidence | undefined,
      relatedEntities: {
        listingId: escrowRecord.listingId ?? undefined,
        agentSessionId: escrowRecord.agentSessionId ?? undefined,
      },
      stripeInfo: {
        paymentIntentId: escrowRecord.stripePaymentIntentId ?? undefined,
        transferId: escrowRecord.stripeTransferId ?? undefined,
      },
    };
  }

  /**
   * List escrows for a user
   */
  async getUserEscrows(
    userId: string,
    role: 'buyer' | 'seller' | 'both' = 'both',
    status?: EscrowStatus
  ): Promise<EscrowDetails[]> {
    const conditions = [];

    if (role === 'buyer') {
      conditions.push(eq(escrow.buyerId, userId));
    } else if (role === 'seller') {
      conditions.push(eq(escrow.sellerId, userId));
    } else {
      conditions.push(
        sql`(${escrow.buyerId} = ${userId} OR ${escrow.sellerId} = ${userId})`
      );
    }

    if (status) {
      conditions.push(eq(escrow.status, status));
    }

    const escrows = await db.query.escrow.findMany({
      where: and(...conditions),
      orderBy: [desc(escrow.createdAt)],
      limit: 50,
    });

    return Promise.all(escrows.map(e => this.getEscrowDetails(e.id)));
  }

  /**
   * Get escrow summary for admin dashboard
   */
  async getEscrowSummary(): Promise<EscrowSummary> {
    const allEscrows = await db.query.escrow.findMany();

    const summary: EscrowSummary = {
      total: allEscrows.length,
      byStatus: {
        pending: 0,
        funded: 0,
        released: 0,
        refunded: 0,
        disputed: 0,
      },
      totalValue: 0,
      pendingValue: 0,
      releasedValue: 0,
      disputedValue: 0,
    };

    for (const e of allEscrows) {
      const amount = parseFloat(e.amount);
      const status = e.status as EscrowStatus;

      summary.byStatus[status]++;
      summary.totalValue += amount;

      if (status === 'pending' || status === 'funded') {
        summary.pendingValue += amount;
      } else if (status === 'released') {
        summary.releasedValue += amount;
      } else if (status === 'disputed') {
        summary.disputedValue += amount;
      }
    }

    return summary;
  }

  // ============================================
  // CONDITION VERIFICATION
  // ============================================

  /**
   * Check and update condition status
   */
  async verifyConditions(escrowId: string): Promise<boolean> {
    const escrowRecord = await db.query.escrow.findFirst({
      where: eq(escrow.id, escrowId),
    });

    if (!escrowRecord) {
      throw new Error('Escrow not found');
    }

    const conditions = (escrowRecord.conditions ?? []) as EscrowCondition[];
    const evidence = (escrowRecord.evidence ?? {}) as EscrowEvidence;

    // Check each condition
    let allMet = true;

    for (const condition of conditions) {
      if (condition.verificationRequired) {
        // Check if verification evidence exists
        if (condition.verificationMethod === 'document') {
          if (!evidence.documentUrls?.length) {
            allMet = false;
            break;
          }
        } else if (condition.verificationMethod === 'signature') {
          if (!evidence.signatures?.length) {
            allMet = false;
            break;
          }
        } else if (condition.verificationMethod === 'inspection') {
          if (!evidence.inspectionReport?.passed) {
            allMet = false;
            break;
          }
        }
      }

      // Check deadline
      if (condition.deadline && new Date(condition.deadline) < new Date()) {
        // Deadline passed without conditions met
        // In production: trigger alert or auto-action
      }
    }

    // Update conditions status
    if (allMet !== escrowRecord.conditionsMet) {
      await db
        .update(escrow)
        .set({
          conditionsMet: allMet,
          updatedAt: new Date(),
        })
        .where(eq(escrow.id, escrowId));
    }

    return allMet;
  }

  /**
   * Add evidence to an escrow
   */
  async addEvidence(
    escrowId: string,
    evidence: Partial<EscrowEvidence>
  ): Promise<EscrowDetails> {
    const escrowRecord = await db.query.escrow.findFirst({
      where: eq(escrow.id, escrowId),
    });

    if (!escrowRecord) {
      throw new Error('Escrow not found');
    }

    const existingEvidence = (escrowRecord.evidence ?? {}) as EscrowEvidence;

    const updatedEvidence: EscrowEvidence = {
      documentUrls: [
        ...(existingEvidence.documentUrls ?? []),
        ...(evidence.documentUrls ?? []),
      ],
      verificationIds: [
        ...(existingEvidence.verificationIds ?? []),
        ...(evidence.verificationIds ?? []),
      ],
      signatures: [
        ...(existingEvidence.signatures ?? []),
        ...(evidence.signatures ?? []),
      ],
      inspectionReport: evidence.inspectionReport ?? existingEvidence.inspectionReport,
    };

    await db
      .update(escrow)
      .set({
        evidence: updatedEvidence,
        updatedAt: new Date(),
      })
      .where(eq(escrow.id, escrowId));

    // Re-verify conditions
    await this.verifyConditions(escrowId);

    return this.getEscrowDetails(escrowId);
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Create platform fee transaction record
   */
  private async createPlatformFeeTransaction(
    escrowRecord: typeof escrow.$inferSelect
  ): Promise<void> {
    const conditions = (escrowRecord.conditions ?? []) as EscrowCondition[];
    const type = conditions[0]?.type ?? 'custom';

    const transactionType = type === 'property_sale' ? 'property_sold' :
                           type === 'property_rent' ? 'property_rented' :
                           type === 'service_completion' ? 'service_booking' :
                           'api_call';

    await db.insert(agentTransactions).values({
      sessionId: escrowRecord.agentSessionId,
      transactionType,
      status: 'completed',
      baseAmount: escrowRecord.amount,
      platformFee: escrowRecord.platformFee ?? '0',
      totalAmount: String(parseFloat(escrowRecord.amount) + parseFloat(escrowRecord.platformFee ?? '0')),
      currency: escrowRecord.currency,
      referenceAmount: escrowRecord.amount,
      feePercentage: String(PLATFORM_FEES[type as keyof typeof PLATFORM_FEES] ?? 0.05),
      listingId: escrowRecord.listingId,
      stripePaymentIntentId: escrowRecord.stripePaymentIntentId,
      stripeTransferId: escrowRecord.stripeTransferId,
      description: `Platform fee from ${type} escrow`,
      outcomeData: {
        escrowId: escrowRecord.id,
        type,
      },
      billedAt: new Date(),
      paidAt: new Date(),
    });
  }
}

// Singleton
export const escrowService = new EscrowService();
