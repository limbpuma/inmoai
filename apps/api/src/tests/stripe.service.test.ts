/**
 * Stripe Service Unit Tests
 * Tests pricing plans, subscription management, and webhook handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PLANS,
  PROVIDER_PLANS,
  TRANSACTION_FEES,
  AI_CREDIT_COSTS,
  isStripeEnabled,
  createCheckoutSession,
  createBillingPortalSession,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  getSubscriptionStatus,
  handleProviderSubscriptionCreated,
  handleProviderSubscriptionDeleted,
} from '../server/services/stripe/stripe.service';
import { db } from '@/server/infrastructure/database';

describe('StripeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Plan configuration', () => {
    it('should have correct free plan limits', () => {
      expect(PLANS.free.price).toBe(0);
      expect(PLANS.free.limits.searchesPerMonth).toBe(30);
      expect(PLANS.free.limits.aiCreditsPerMonth).toBe(100);
    });

    it('should have correct pro plan limits', () => {
      expect(PLANS.pro.price).toBe(49);
      expect(PLANS.pro.limits.searchesPerMonth).toBe(500);
      expect(PLANS.pro.limits.aiCreditsPerMonth).toBe(2000);
    });

    it('should have correct agency plan limits', () => {
      expect(PLANS.agency.price).toBe(149);
      expect(PLANS.agency.limits.searchesPerMonth).toBe(2000);
      expect(PLANS.agency.limits.aiCreditsPerMonth).toBe(10000);
    });

    it('should have provider plans defined', () => {
      expect(PROVIDER_PLANS.free.price).toBe(0);
      expect(PROVIDER_PLANS.premium.price).toBe(29);
      expect(PROVIDER_PLANS.enterprise.price).toBe(79);
    });
  });

  describe('Transaction fees', () => {
    it('should have property sale fee at 0.3%', () => {
      expect(TRANSACTION_FEES.property_sale).toBe(0.003);
    });

    it('should have property rent fee at 0.5%', () => {
      expect(TRANSACTION_FEES.property_rent).toBe(0.005);
    });

    it('should have service completion fee at 10%', () => {
      expect(TRANSACTION_FEES.service_completion).toBe(0.10);
    });

    it('should have lead fee at €5', () => {
      expect(TRANSACTION_FEES.lead_fee).toBe(5);
    });
  });

  describe('AI Credit Costs', () => {
    it('should define costs for all operations', () => {
      expect(AI_CREDIT_COSTS.search_basic).toBe(1);
      expect(AI_CREDIT_COSTS.fraud_detection).toBe(5);
      expect(AI_CREDIT_COSTS.valuation_estimate).toBe(10);
      expect(AI_CREDIT_COSTS.document_analysis).toBe(25);
    });
  });

  describe('isStripeEnabled', () => {
    it('should return false when no key configured', () => {
      // env mock has empty STRIPE_SECRET_KEY
      expect(isStripeEnabled()).toBe(false);
    });
  });

  describe('createCheckoutSession', () => {
    it('should throw when Stripe not configured', async () => {
      await expect(
        createCheckoutSession('user-1', 'price_pro', 'http://ok', 'http://cancel')
      ).rejects.toThrow('Stripe no está configurado');
    });
  });

  describe('createBillingPortalSession', () => {
    it('should throw when Stripe not configured', async () => {
      await expect(
        createBillingPortalSession('user-1', 'http://return')
      ).rejects.toThrow('Stripe no está configurado');
    });
  });

  describe('handleSubscriptionCreated', () => {
    it('should skip when no userId in metadata', async () => {
      const subscription = {
        metadata: {},
        items: { data: [{ price: { id: 'price_pro' } }] },
        current_period_end: Date.now() / 1000 + 86400,
      } as any;

      // Should not throw
      await handleSubscriptionCreated(subscription);
      expect(db.update).not.toHaveBeenCalled();
    });

    it('should set agency role for agency price', async () => {
      const subscription = {
        id: 'sub-1',
        metadata: { userId: 'user-1' },
        items: { data: [{ price: { id: 'price_agency' } }] },
        current_period_end: Date.now() / 1000 + 86400,
      } as any;

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await handleSubscriptionCreated(subscription);
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionDeleted', () => {
    it('should reset user to free role', async () => {
      const subscription = {
        metadata: { userId: 'user-1' },
      } as any;

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await handleSubscriptionDeleted(subscription);
      expect(db.update).toHaveBeenCalled();
    });

    it('should skip when no userId', async () => {
      await handleSubscriptionDeleted({ metadata: {} } as any);
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('handleProviderSubscriptionCreated', () => {
    it('should update provider tier', async () => {
      const subscription = {
        id: 'sub-p1',
        metadata: { providerId: 'provider-1', tier: 'premium' },
        current_period_end: Date.now() / 1000 + 86400,
      } as any;

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await handleProviderSubscriptionCreated(subscription);
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('handleProviderSubscriptionDeleted', () => {
    it('should reset provider to free tier', async () => {
      const subscription = {
        metadata: { providerId: 'provider-1' },
      } as any;

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      await handleProviderSubscriptionDeleted(subscription);
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return null for non-existent user', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);

      const result = await getSubscriptionStatus('nonexistent');
      expect(result).toBeNull();
    });

    it('should return active status for valid subscription', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        stripeSubscriptionId: 'sub-1',
        stripePriceId: 'price_pro',
        stripeCurrentPeriodEnd: new Date(Date.now() + 86400000),
        role: 'premium',
      } as any);

      const result = await getSubscriptionStatus('user-1');
      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(true);
      expect(result!.role).toBe('premium');
    });

    it('should return inactive for expired subscription', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        stripeSubscriptionId: 'sub-1',
        stripePriceId: 'price_pro',
        stripeCurrentPeriodEnd: new Date(Date.now() - 86400000),
        role: 'premium',
      } as any);

      const result = await getSubscriptionStatus('user-1');
      expect(result!.isActive).toBe(false);
    });
  });
});
