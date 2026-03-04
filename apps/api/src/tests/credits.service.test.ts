/**
 * Credits Service Unit Tests
 * Tests AI credit checking, consumption, and billing cycle management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../server/services/stripe/stripe.service', () => ({
  PLANS: {
    free: { limits: { aiCreditsPerMonth: 100 } },
    pro: { limits: { aiCreditsPerMonth: 2000 } },
    agency: { limits: { aiCreditsPerMonth: 10000 } },
  },
  AI_CREDIT_COSTS: {
    search_basic: 1,
    search_ai_enhanced: 3,
    fraud_detection: 5,
    valuation_estimate: 10,
    market_analysis: 15,
    listing_improvement: 20,
    agent_conversation: 3,
    document_analysis: 25,
  },
}));

import { checkCredits, consumeCredits, getCreditStatus, refundCredits } from '../server/services/credits/credits.service';
import { db } from '@/server/infrastructure/database';

describe('CreditsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkCredits', () => {
    it('should allow operation when user has sufficient credits', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        role: 'user',
        aiCreditsUsedThisMonth: 10,
        aiCreditsResetDate: new Date(Date.now() + 86400000),
        stripeCurrentPeriodEnd: null,
      } as any);

      const result = await checkCredits('user-1', 'search_basic');

      expect(result.allowed).toBe(true);
      expect(result.creditCost).toBe(1);
      expect(result.remainingAfter).toBe(89);
      expect(result.monthlyLimit).toBe(100);
    });

    it('should deny operation when credits insufficient', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        role: 'user',
        aiCreditsUsedThisMonth: 99,
        aiCreditsResetDate: new Date(Date.now() + 86400000),
        stripeCurrentPeriodEnd: null,
      } as any);

      const result = await checkCredits('user-1', 'fraud_detection');

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Insufficient credits');
    });

    it('should return not allowed for non-existent user', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);

      const result = await checkCredits('nonexistent', 'search_basic');

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('User not found');
    });

    it('should reset credits when billing period expired', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        role: 'user',
        aiCreditsUsedThisMonth: 95,
        aiCreditsResetDate: new Date(Date.now() - 86400000), // expired yesterday
        stripeCurrentPeriodEnd: null,
      } as any);

      const result = await checkCredits('user-1', 'search_basic');

      expect(result.allowed).toBe(true);
      expect(result.currentCredits).toBe(0); // reset
    });

    it('should use correct limits for agency role', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        role: 'agency',
        aiCreditsUsedThisMonth: 500,
        aiCreditsResetDate: new Date(Date.now() + 86400000),
        stripeCurrentPeriodEnd: null,
      } as any);

      const result = await checkCredits('agency-1', 'document_analysis');

      expect(result.allowed).toBe(true);
      expect(result.monthlyLimit).toBe(10000);
    });

    it('should use correct limits for premium role', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        role: 'premium',
        aiCreditsUsedThisMonth: 100,
        aiCreditsResetDate: new Date(Date.now() + 86400000),
        stripeCurrentPeriodEnd: null,
      } as any);

      const result = await checkCredits('pro-1', 'market_analysis');

      expect(result.allowed).toBe(true);
      expect(result.monthlyLimit).toBe(2000);
    });
  });

  describe('consumeCredits', () => {
    it('should consume credits successfully', async () => {
      vi.mocked(db.transaction).mockImplementationOnce(async (fn: Function) => {
        const tx = {
          query: {
            users: {
              findFirst: vi.fn().mockResolvedValue({
                role: 'user',
                aiCreditsUsedThisMonth: 10,
                aiCreditsResetDate: new Date(Date.now() + 86400000),
                stripeCurrentPeriodEnd: null,
              }),
            },
          },
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn().mockResolvedValue([]),
            })),
          })),
        };
        return fn(tx);
      });

      const result = await consumeCredits('user-1', 'search_basic');

      expect(result.success).toBe(true);
      expect(result.creditsConsumed).toBe(1);
      expect(result.creditsRemaining).toBe(89);
    });

    it('should fail for non-existent user', async () => {
      vi.mocked(db.transaction).mockImplementationOnce(async (fn: Function) => {
        const tx = {
          query: { users: { findFirst: vi.fn().mockResolvedValue(undefined) } },
        };
        return fn(tx);
      });

      const result = await consumeCredits('nonexistent', 'search_basic');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should fail when credits insufficient', async () => {
      vi.mocked(db.transaction).mockImplementationOnce(async (fn: Function) => {
        const tx = {
          query: {
            users: {
              findFirst: vi.fn().mockResolvedValue({
                role: 'user',
                aiCreditsUsedThisMonth: 99,
                aiCreditsResetDate: new Date(Date.now() + 86400000),
                stripeCurrentPeriodEnd: null,
              }),
            },
          },
        };
        return fn(tx);
      });

      const result = await consumeCredits('user-1', 'document_analysis');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient credits');
    });
  });

  describe('getCreditStatus', () => {
    it('should return full status for existing user', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        role: 'user',
        aiCreditsUsedThisMonth: 50,
        aiCreditsResetDate: new Date(Date.now() + 86400000),
        stripeCurrentPeriodEnd: null,
      } as any);

      const status = await getCreditStatus('user-1');

      expect(status.used).toBe(50);
      expect(status.limit).toBe(100);
      expect(status.remaining).toBe(50);
      expect(status.percentUsed).toBe(50);
    });

    it('should return empty status for non-existent user', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);

      const status = await getCreditStatus('nonexistent');

      expect(status.used).toBe(0);
      expect(status.limit).toBe(0);
      expect(status.plan).toBe('unknown');
    });

    it('should reset credits when period expired', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        role: 'user',
        aiCreditsUsedThisMonth: 90,
        aiCreditsResetDate: new Date(Date.now() - 86400000),
        stripeCurrentPeriodEnd: null,
      } as any);

      const status = await getCreditStatus('user-1');

      expect(status.used).toBe(0);
      expect(status.remaining).toBe(100);
      expect(status.percentUsed).toBe(0);
    });
  });

  describe('refundCredits', () => {
    it('should refund credits successfully', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        aiCreditsUsedThisMonth: 50,
      } as any);

      const result = await refundCredits('user-1', 10);
      expect(result).toBe(true);
    });
  });
});
