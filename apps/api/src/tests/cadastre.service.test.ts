/**
 * Cadastre Service Unit Tests
 * Tests surface discrepancy detection, reference validation, caching, and API integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectSurfaceDiscrepancy,
  searchByAddress,
  getPropertyByReference,
  getReferenceByCoordenates,
  verifyProperty,
  crossVerifyWithListing,
  getCacheStats,
  clearCache,
  cadastreService,
} from '../server/services/cadastre/cadastre.service';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CadastreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
    mockFetch.mockReset();
  });

  // --- detectSurfaceDiscrepancy (Pure function tests) ---

  describe('detectSurfaceDiscrepancy', () => {
    it('should return "none" severity for matching surfaces', () => {
      const result = detectSurfaceDiscrepancy(90, 90);
      expect(result.severity).toBe('none');
      expect(result.hasMajorDiscrepancy).toBe(false);
      expect(result.differenceM2).toBe(0);
    });

    it('should return "minor" for 5-10% difference', () => {
      const result = detectSurfaceDiscrepancy(95, 88);
      expect(result.severity).toBe('minor');
      expect(result.hasMajorDiscrepancy).toBe(false);
    });

    it('should return "significant" for 10-20% difference', () => {
      const result = detectSurfaceDiscrepancy(110, 90);
      expect(result.severity).toBe('significant');
      expect(result.hasMajorDiscrepancy).toBe(true);
      expect(result.warning).toContain('significativa');
    });

    it('should return "critical" for >20% difference', () => {
      const result = detectSurfaceDiscrepancy(130, 90);
      expect(result.severity).toBe('critical');
      expect(result.hasMajorDiscrepancy).toBe(true);
      expect(result.warning).toContain('critica');
    });

    it('should handle zero cadastral surface', () => {
      const result = detectSurfaceDiscrepancy(90, 0);
      expect(result.severity).toBe('none');
      expect(result.differencePercent).toBe(0);
    });

    it('should correctly calculate negative differences', () => {
      const result = detectSurfaceDiscrepancy(70, 90);
      expect(result.differenceM2).toBe(-20);
      expect(result.differencePercent).toBeLessThan(0);
    });
  });

  // --- isValidCadastralReference ---

  describe('isValidCadastralReference', () => {
    it('should validate correct 20-char reference', () => {
      expect(cadastreService.isValidCadastralReference('12345678901234567890')).toBe(true);
    });

    it('should validate alphanumeric reference', () => {
      expect(cadastreService.isValidCadastralReference('AB12CD34EF56GH78IJ90')).toBe(true);
    });

    it('should reject short references', () => {
      expect(cadastreService.isValidCadastralReference('12345')).toBe(false);
    });

    it('should reject references with special characters', () => {
      expect(cadastreService.isValidCadastralReference('1234-5678-9012-3456!')).toBe(false);
    });

    it('should handle references with spaces (strips them)', () => {
      expect(cadastreService.isValidCadastralReference('1234 5678 9012 3456 7890')).toBe(true);
    });
  });

  // --- searchByAddress ---

  describe('searchByAddress', () => {
    it('should return empty result on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchByAddress('MADRID', 'MADRID', 'GRAN VIA', '1');
      expect(result.found).toBe(false);
      expect(result.properties).toEqual([]);
      expect(result.error).toBeDefined();
    });

    it('should return results from XML response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0"?>
          <consulta_numerero>
            <numerero>
              <nump>
                <pc><pc1>1234567</pc1><pc2>8901234</pc2></pc>
                <num><pnp>1</pnp></num>
              </nump>
            </numerero>
          </consulta_numerero>`),
      });

      const result = await searchByAddress('MADRID', 'MADRID', 'GRAN VIA', '1');
      expect(result.found).toBe(true);
      expect(result.properties.length).toBeGreaterThan(0);
    });

    it('should use cache for repeated queries', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0"?>
          <consulta_numerero>
            <numerero>
              <nump>
                <pc><pc1>1234567</pc1><pc2>8901234</pc2></pc>
                <num><pnp>1</pnp></num>
              </nump>
            </numerero>
          </consulta_numerero>`),
      });

      await searchByAddress('MADRID', 'MADRID', 'GRAN VIA', '1');
      await searchByAddress('MADRID', 'MADRID', 'GRAN VIA', '1');

      // fetch should only be called once due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // --- getPropertyByReference ---

  describe('getPropertyByReference', () => {
    it('should reject invalid reference format', async () => {
      const result = await getPropertyByReference('invalid');
      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));
      const result = await getPropertyByReference('12345678901234567890');
      expect(result).toBeNull();
    });
  });

  // --- getReferenceByCoordenates ---

  describe('getReferenceByCoordenates', () => {
    it('should return results for valid coordinates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0"?>
          <consulta_coordenadas>
            <coordenadas>
              <coord>
                <pc><pc1>1234567</pc1><pc2>8901234</pc2></pc>
                <geo><xcen>40.4168</xcen><ycen>-3.7038</ycen></geo>
              </coord>
            </coordenadas>
          </consulta_coordenadas>`),
      });

      const result = await getReferenceByCoordenates(40.4168, -3.7038);
      expect(result.found).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getReferenceByCoordenates(40.4168, -3.7038);
      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // --- verifyProperty ---

  describe('verifyProperty', () => {
    it('should return not verified when property not found', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'));

      const result = await verifyProperty({
        street: 'Test Street',
        number: '1',
        city: 'Madrid',
        province: 'Madrid',
      });

      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // --- crossVerifyWithListing ---

  describe('crossVerifyWithListing', () => {
    it('should calculate risk score for unverified property', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'));

      const result = await crossVerifyWithListing({
        address: {
          street: 'Test',
          number: '1',
          city: 'Madrid',
          province: 'Madrid',
        },
        surfaceM2: 90,
      });

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskFactors.length).toBeGreaterThan(0);
    });

    it('should cap risk score at 100', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'));

      const result = await crossVerifyWithListing({
        address: {
          street: 'Test',
          number: '1',
          city: 'Madrid',
          province: 'Madrid',
        },
        surfaceM2: 200,
        constructionYear: 2020,
        cadastralReference: 'invalid',
      });

      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });

  // --- Cache functions ---

  describe('Cache management', () => {
    it('should return zero stats after clear', () => {
      clearCache();
      const stats = getCacheStats();
      expect(stats.properties).toBe(0);
      expect(stats.searches).toBe(0);
    });

    it('should increment stats after queries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0"?>
          <consulta_numerero>
            <numerero><nump><pc><pc1>1234567</pc1><pc2>8901234</pc2></pc><num><pnp>1</pnp></num></nump></numerero>
          </consulta_numerero>`),
      });

      await searchByAddress('MADRID', 'MADRID', 'GRAN VIA', '1');
      const stats = getCacheStats();
      expect(stats.searches).toBe(1);
    });
  });
});
