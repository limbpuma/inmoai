/**
 * Verification Service Unit Tests
 * Tests listing verification against Spanish Cadastre data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock cadastre service
vi.mock('../server/services/cadastre/cadastre.service', () => ({
  cadastreService: {
    getPropertyByReference: vi.fn(),
    verifyProperty: vi.fn(),
    getReferenceByCoordenates: vi.fn(),
  },
}));

import { verifyListing, verificationService } from '../server/services/verification/verification.service';
import { cadastreService } from '../server/services/cadastre/cadastre.service';
import { db } from '@/server/infrastructure/database';
import type { CadastralProperty } from '../server/services/cadastre/cadastre.service';

function createMockCadastralProperty(overrides: Partial<CadastralProperty> = {}): CadastralProperty {
  return {
    reference: '12345678901234567890',
    address: {
      street: 'Gran Vía',
      number: '1',
      postalCode: '28013',
      municipality: 'Madrid',
      province: 'Madrid',
    },
    surface: { built: 90 },
    use: 'residential',
    constructionYear: 2005,
    ...overrides,
  };
}

describe('VerificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyListing', () => {
    it('should return not verified for non-existent listing', async () => {
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await verifyListing('nonexistent-id');
      expect(result.verified).toBe(false);
      expect(result.error).toBe('Listing not found');
      expect(result.trustScore).toBe(0);
    });

    it('should verify listing with cadastral reference', async () => {
      const mockListing = {
        id: 'listing-1',
        cadastralRef: '12345678901234567890',
        sizeSqm: 90,
        yearBuilt: 2005,
        propertyType: 'piso',
        address: 'Gran Vía 1',
        city: 'Madrid',
        province: 'Madrid',
        postalCode: '28013',
        latitude: null,
        longitude: null,
      };

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockListing]),
          }),
        }),
      } as any);

      vi.mocked(cadastreService.getPropertyByReference).mockResolvedValueOnce(
        createMockCadastralProperty()
      );

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await verifyListing('listing-1');
      expect(result.verified).toBe(true);
      expect(result.cadastralRef).toBe('12345678901234567890');
      expect(result.trustScore).toBeGreaterThan(0);
    });

    it('should verify listing by address when no cadastral ref', async () => {
      const mockListing = {
        id: 'listing-2',
        cadastralRef: null,
        sizeSqm: 90,
        yearBuilt: null,
        propertyType: 'piso',
        address: 'Gran Vía 1',
        city: 'Madrid',
        province: 'Madrid',
        postalCode: '28013',
        latitude: null,
        longitude: null,
      };

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockListing]),
          }),
        }),
      } as any);

      vi.mocked(cadastreService.verifyProperty).mockResolvedValueOnce({
        verified: true,
        reference: '12345678901234567890',
        property: createMockCadastralProperty(),
        matchesAddress: true,
        verificationDate: new Date(),
      });

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await verifyListing('listing-2');
      expect(result.verified).toBe(true);
    });

    it('should verify listing by coordinates as fallback', async () => {
      const mockListing = {
        id: 'listing-3',
        cadastralRef: null,
        sizeSqm: 90,
        yearBuilt: null,
        propertyType: 'piso',
        address: null,
        city: null,
        province: null,
        postalCode: null,
        latitude: '40.4168',
        longitude: '-3.7038',
      };

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockListing]),
          }),
        }),
      } as any);

      vi.mocked(cadastreService.getReferenceByCoordenates).mockResolvedValueOnce({
        found: true,
        properties: [createMockCadastralProperty()],
      });

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await verifyListing('listing-3');
      expect(result.verified).toBe(true);
    });

    it('should return unverified with base trust score when property not found', async () => {
      const mockListing = {
        id: 'listing-4',
        cadastralRef: null,
        sizeSqm: 90,
        address: null,
        city: null,
        province: null,
        latitude: null,
        longitude: null,
      };

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockListing]),
          }),
        }),
      } as any);

      const result = await verifyListing('listing-4');
      expect(result.verified).toBe(false);
      expect(result.trustScore).toBe(30);
    });

    it('should handle service errors gracefully', async () => {
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const result = await verifyListing('listing-5');
      expect(result.verified).toBe(false);
      expect(result.trustScore).toBe(0);
      expect(result.error).toBe('Database error');
    });
  });

  describe('detectMismatches', () => {
    it('should detect surface mismatch with high severity', () => {
      const result = verificationService.detectMismatches(
        { sizeSqm: 120, yearBuilt: null, propertyType: 'piso', address: '' } as any,
        createMockCadastralProperty({ surface: { built: 90 } })
      );

      const surfaceMismatch = result.find(m => m.field === 'surface');
      expect(surfaceMismatch).toBeDefined();
      expect(surfaceMismatch!.severity).toBe('high');
    });

    it('should detect surface mismatch with medium severity', () => {
      const result = verificationService.detectMismatches(
        { sizeSqm: 100, yearBuilt: null, propertyType: 'piso', address: '' } as any,
        createMockCadastralProperty({ surface: { built: 90 } })
      );

      const surfaceMismatch = result.find(m => m.field === 'surface');
      expect(surfaceMismatch).toBeDefined();
      expect(surfaceMismatch!.severity).toBe('medium');
    });

    it('should detect year built mismatch', () => {
      const result = verificationService.detectMismatches(
        { sizeSqm: null, yearBuilt: 1990, propertyType: 'piso', address: '' } as any,
        createMockCadastralProperty({ constructionYear: 2005 })
      );

      const yearMismatch = result.find(m => m.field === 'yearBuilt');
      expect(yearMismatch).toBeDefined();
      expect(yearMismatch!.severity).toBe('medium');
    });

    it('should detect property type mismatch', () => {
      const result = verificationService.detectMismatches(
        { sizeSqm: null, yearBuilt: null, propertyType: 'oficina', address: '' } as any,
        createMockCadastralProperty({ use: 'residential' })
      );

      const useMismatch = result.find(m => m.field === 'use');
      expect(useMismatch).toBeDefined();
      expect(useMismatch!.severity).toBe('high');
    });

    it('should return empty array when data matches', () => {
      const result = verificationService.detectMismatches(
        { sizeSqm: 90, yearBuilt: 2005, propertyType: 'piso', address: 'Gran Vía 1' } as any,
        createMockCadastralProperty()
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('calculateTrustScore', () => {
    it('should return 100 for verified with no mismatches', () => {
      const score = verificationService.calculateTrustScore([], true);
      expect(score).toBe(100);
    });

    it('should return 30 for unverified', () => {
      const score = verificationService.calculateTrustScore([], false);
      expect(score).toBe(30);
    });

    it('should deduct 25 for high severity mismatch', () => {
      const score = verificationService.calculateTrustScore(
        [{ field: 'use', listingValue: 'oficina', cadastreValue: 'residential', severity: 'high', description: 'test' }],
        true
      );
      expect(score).toBe(75);
    });

    it('should deduct 15 for medium severity mismatch', () => {
      const score = verificationService.calculateTrustScore(
        [{ field: 'year', listingValue: 1990, cadastreValue: 2005, severity: 'medium', description: 'test' }],
        true
      );
      expect(score).toBe(85);
    });

    it('should not go below 0', () => {
      const mismatches = Array.from({ length: 10 }, () => ({
        field: 'test',
        listingValue: null,
        cadastreValue: null,
        severity: 'high' as const,
        description: 'test',
      }));
      const score = verificationService.calculateTrustScore(mismatches, true);
      expect(score).toBe(0);
    });
  });
});
