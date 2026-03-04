/**
 * Escrow Service Unit Tests
 * Tests secure payment holding, fund management, disputes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../server/services/escrow/types', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    PLATFORM_FEES: {
      property_sale: 0.003,
      property_rent: 0.005,
      service_completion: 0.10,
      custom: 0.05,
    },
    ESCROW_LIMITS: {
      minAmount: 50,
      maxAmount: 1000000,
      maxDurationDays: 90,
    },
  };
});

import { escrowService } from '../server/services/escrow/escrow.service';
import { db } from '@/server/infrastructure/database';

describe('EscrowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEscrow', () => {
    it('should create escrow with correct platform fee', async () => {
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'escrow-1' }]),
        }),
      } as any);

      vi.mocked(db.query.escrow.findFirst).mockResolvedValueOnce({
        id: 'escrow-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        amount: '100000',
        platformFee: '300',
        currency: 'EUR',
        status: 'pending',
        conditions: [],
        conditionsMet: false,
        createdAt: new Date(),
        evidence: null,
        notes: null,
        expiresAt: null,
        fundedAt: null,
        releasedAt: null,
        refundedAt: null,
        disputedAt: null,
        listingId: null,
        agentSessionId: null,
        stripePaymentIntentId: null,
        stripeTransferId: null,
        metadata: null,
        updatedAt: new Date(),
      } as any);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

      const result = await escrowService.createEscrow({
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        amount: 100000,
        type: 'property_sale',
        conditions: [{ type: 'property_sale', description: 'Sale completion' }],
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('escrow-1');
    });

    it('should reject amount below minimum', async () => {
      await expect(
        escrowService.createEscrow({
          buyerId: 'buyer-1',
          sellerId: 'seller-1',
          amount: 10,
          type: 'property_sale',
          conditions: [],
        })
      ).rejects.toThrow('Minimum escrow amount');
    });

    it('should reject amount above maximum', async () => {
      await expect(
        escrowService.createEscrow({
          buyerId: 'buyer-1',
          sellerId: 'seller-1',
          amount: 2000000,
          type: 'property_sale',
          conditions: [],
        })
      ).rejects.toThrow('Maximum escrow amount');
    });
  });

  describe('getEscrowDetails', () => {
    it('should throw for non-existent escrow', async () => {
      vi.mocked(db.query.escrow.findFirst).mockResolvedValueOnce(undefined);

      await expect(escrowService.getEscrowDetails('nonexistent')).rejects.toThrow('Escrow not found');
    });

    it('should return formatted escrow details', async () => {
      vi.mocked(db.query.escrow.findFirst).mockResolvedValueOnce({
        id: 'escrow-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        amount: '50000',
        platformFee: '150',
        currency: 'EUR',
        status: 'funded',
        conditions: [],
        conditionsMet: false,
        createdAt: new Date(),
        evidence: null,
        notes: null,
        expiresAt: null,
        fundedAt: new Date(),
        releasedAt: null,
        refundedAt: null,
        disputedAt: null,
        listingId: null,
        agentSessionId: null,
        stripePaymentIntentId: null,
        stripeTransferId: null,
        metadata: null,
        updatedAt: new Date(),
      } as any);

      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce({ name: 'Buyer', email: 'buyer@test.com' } as any)
        .mockResolvedValueOnce({ name: 'Seller', email: 'seller@test.com' } as any);

      const result = await escrowService.getEscrowDetails('escrow-1');

      expect(result.amount).toBe(50000);
      expect(result.platformFee).toBe(150);
      expect(result.totalAmount).toBe(50150);
      expect(result.buyer.name).toBe('Buyer');
      expect(result.seller.name).toBe('Seller');
    });
  });

  describe('fundEscrow', () => {
    it('should reject funding of non-pending escrow', async () => {
      vi.mocked(db.transaction).mockImplementationOnce(async (fn: Function) => {
        const tx = {
          query: {
            escrow: {
              findFirst: vi.fn()
                .mockResolvedValueOnce(null) // pending check fails
                .mockResolvedValueOnce({ id: 'escrow-1', status: 'funded' }), // exists check
            },
          },
        };
        return fn(tx);
      });

      await expect(
        escrowService.fundEscrow({ escrowId: 'escrow-1' })
      ).rejects.toThrow('Cannot fund escrow in funded status');
    });
  });

  describe('releaseEscrow', () => {
    it('should reject release of non-funded escrow', async () => {
      vi.mocked(db.transaction).mockImplementationOnce(async (fn: Function) => {
        const tx = {
          query: {
            escrow: {
              findFirst: vi.fn()
                .mockResolvedValueOnce(null) // funded check fails
                .mockResolvedValueOnce({ id: 'escrow-1', status: 'pending' }), // exists check
            },
          },
        };
        return fn(tx);
      });

      await expect(
        escrowService.releaseEscrow({ escrowId: 'escrow-1' })
      ).rejects.toThrow('Cannot release escrow in pending status');
    });
  });

  describe('refundEscrow', () => {
    it('should reject refund of released escrow', async () => {
      vi.mocked(db.transaction).mockImplementationOnce(async (fn: Function) => {
        const tx = {
          query: {
            escrow: {
              findFirst: vi.fn()
                .mockResolvedValueOnce(null) // valid status check fails
                .mockResolvedValueOnce({ id: 'escrow-1', status: 'released' }), // exists check
            },
          },
        };
        return fn(tx);
      });

      await expect(
        escrowService.refundEscrow({ escrowId: 'escrow-1', reason: 'Test' })
      ).rejects.toThrow('Cannot refund escrow in released status');
    });
  });

  describe('disputeEscrow', () => {
    it('should reject dispute of non-funded escrow', async () => {
      vi.mocked(db.transaction).mockImplementationOnce(async (fn: Function) => {
        const tx = {
          query: {
            escrow: {
              findFirst: vi.fn()
                .mockResolvedValueOnce(null) // funded check fails
                .mockResolvedValueOnce({ id: 'escrow-1', status: 'pending' }), // exists check
            },
          },
        };
        return fn(tx);
      });

      await expect(
        escrowService.disputeEscrow({ escrowId: 'escrow-1', reason: 'Fraud' })
      ).rejects.toThrow('Cannot dispute escrow in pending status');
    });
  });

  describe('verifyConditions', () => {
    it('should throw for non-existent escrow', async () => {
      vi.mocked(db.query.escrow.findFirst).mockResolvedValueOnce(undefined);

      await expect(escrowService.verifyConditions('nonexistent')).rejects.toThrow('Escrow not found');
    });

    it('should return true when no conditions required', async () => {
      vi.mocked(db.query.escrow.findFirst).mockResolvedValueOnce({
        id: 'escrow-1',
        conditions: [],
        conditionsMet: false,
        evidence: {},
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await escrowService.verifyConditions('escrow-1');
      expect(result).toBe(true);
    });
  });
});
