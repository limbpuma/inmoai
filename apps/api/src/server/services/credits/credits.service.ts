/**
 * AI Credits Service - Anti-SaaSpocalypse Pricing Model
 *
 * Manages outcome-based pricing through credit consumption:
 * - Tracks AI operation usage per user
 * - Enforces monthly credit limits by plan
 * - Resets credits on billing cycle
 *
 * Credit Philosophy:
 * - Each AI operation has a fixed credit cost
 * - Users pay for outcomes (operations), not seats
 * - Heavy users consume more credits, light users save
 */

import { eq, and, lt } from 'drizzle-orm';
import { db } from '@/server/infrastructure/database';
import { users } from '@/server/infrastructure/database/schema';
import { PLANS, AI_CREDIT_COSTS } from '@/server/services/stripe/stripe.service';

export type AIOperationType = keyof typeof AI_CREDIT_COSTS;

export interface CreditCheckResult {
  allowed: boolean;
  currentCredits: number;
  creditCost: number;
  remainingAfter: number;
  monthlyLimit: number;
  resetDate: Date | null;
  message?: string;
}

export interface CreditConsumptionResult {
  success: boolean;
  creditsConsumed: number;
  creditsRemaining: number;
  error?: string;
}

/**
 * Get the monthly credit limit for a user's plan
 */
function getPlanCreditLimit(role: string): number {
  switch (role) {
    case 'agency':
      return PLANS.agency.limits.aiCreditsPerMonth;
    case 'premium':
      return PLANS.pro.limits.aiCreditsPerMonth;
    default:
      return PLANS.free.limits.aiCreditsPerMonth;
  }
}

/**
 * Check if user has sufficient credits for an operation
 * Does NOT consume credits - use consumeCredits() for that
 */
export async function checkCredits(
  userId: string,
  operation: AIOperationType
): Promise<CreditCheckResult> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      role: true,
      aiCreditsUsedThisMonth: true,
      aiCreditsResetDate: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  if (!user) {
    return {
      allowed: false,
      currentCredits: 0,
      creditCost: AI_CREDIT_COSTS[operation],
      remainingAfter: 0,
      monthlyLimit: 0,
      resetDate: null,
      message: 'User not found',
    };
  }

  const monthlyLimit = getPlanCreditLimit(user.role ?? 'user');
  const creditCost = AI_CREDIT_COSTS[operation];
  const currentUsed = user.aiCreditsUsedThisMonth ?? 0;

  // Check if credits need to be reset (new billing period)
  const resetDate = user.aiCreditsResetDate ?? user.stripeCurrentPeriodEnd;
  const now = new Date();
  let effectiveUsed = currentUsed;

  if (resetDate && now > resetDate) {
    // Credits should be reset - will be handled in consumeCredits
    effectiveUsed = 0;
  }

  const remainingCredits = monthlyLimit - effectiveUsed;
  const allowed = remainingCredits >= creditCost;

  return {
    allowed,
    currentCredits: effectiveUsed,
    creditCost,
    remainingAfter: allowed ? remainingCredits - creditCost : remainingCredits,
    monthlyLimit,
    resetDate,
    message: allowed
      ? undefined
      : `Insufficient credits. Need ${creditCost}, have ${remainingCredits}. Upgrade your plan for more credits.`,
  };
}

/**
 * Consume credits for an AI operation
 * Atomically deducts credits and handles billing cycle resets
 */
export async function consumeCredits(
  userId: string,
  operation: AIOperationType
): Promise<CreditConsumptionResult> {
  const creditCost = AI_CREDIT_COSTS[operation];

  return await db.transaction(async (tx) => {
    // Get current user state with lock
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        role: true,
        aiCreditsUsedThisMonth: true,
        aiCreditsResetDate: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    if (!user) {
      return {
        success: false,
        creditsConsumed: 0,
        creditsRemaining: 0,
        error: 'User not found',
      };
    }

    const monthlyLimit = getPlanCreditLimit(user.role ?? 'user');
    let currentUsed = user.aiCreditsUsedThisMonth ?? 0;
    const now = new Date();

    // Check if we need to reset credits (new billing period)
    const resetDate = user.aiCreditsResetDate ?? user.stripeCurrentPeriodEnd;
    let needsReset = false;

    if (resetDate && now > resetDate) {
      currentUsed = 0;
      needsReset = true;
    }

    // Check if user has enough credits
    const remainingCredits = monthlyLimit - currentUsed;
    if (remainingCredits < creditCost) {
      return {
        success: false,
        creditsConsumed: 0,
        creditsRemaining: remainingCredits,
        error: `Insufficient credits. Need ${creditCost}, have ${remainingCredits}. Upgrade your plan for more credits.`,
      };
    }

    // Calculate new reset date (next month from now)
    const nextResetDate = new Date(now);
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);

    // Consume credits atomically
    const newUsed = currentUsed + creditCost;
    await tx
      .update(users)
      .set({
        aiCreditsUsedThisMonth: newUsed,
        aiCreditsResetDate: needsReset ? nextResetDate : user.aiCreditsResetDate,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    return {
      success: true,
      creditsConsumed: creditCost,
      creditsRemaining: monthlyLimit - newUsed,
    };
  });
}

/**
 * Get user's current credit status
 */
export async function getCreditStatus(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  resetDate: Date | null;
  plan: string;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      role: true,
      aiCreditsUsedThisMonth: true,
      aiCreditsResetDate: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  if (!user) {
    return {
      used: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 0,
      resetDate: null,
      plan: 'unknown',
    };
  }

  const limit = getPlanCreditLimit(user.role ?? 'user');
  const used = user.aiCreditsUsedThisMonth ?? 0;
  const remaining = Math.max(0, limit - used);
  const resetDate = user.aiCreditsResetDate ?? user.stripeCurrentPeriodEnd;

  // Check if reset is needed
  const now = new Date();
  if (resetDate && now > resetDate) {
    return {
      used: 0,
      limit,
      remaining: limit,
      percentUsed: 0,
      resetDate,
      plan: user.role ?? 'user',
    };
  }

  return {
    used,
    limit,
    remaining,
    percentUsed: limit > 0 ? Math.round((used / limit) * 100) : 0,
    resetDate,
    plan: user.role ?? 'user',
  };
}

/**
 * Refund credits (for failed operations)
 */
export async function refundCredits(
  userId: string,
  amount: number
): Promise<boolean> {
  const result = await db
    .update(users)
    .set({
      aiCreditsUsedThisMonth: Math.max(
        0,
        (await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { aiCreditsUsedThisMonth: true },
        }))?.aiCreditsUsedThisMonth ?? 0 - amount
      ),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return true;
}

export const creditsService = {
  checkCredits,
  consumeCredits,
  getCreditStatus,
  refundCredits,
  AI_CREDIT_COSTS,
};
