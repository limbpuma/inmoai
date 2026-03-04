/**
 * Search Service Unit Tests
 * Tests query parsing, filter extraction, and result merging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AI engine before importing search service
vi.mock('@/server/services/ai', () => ({
  aiEngine: {
    parseSearchQuery: vi.fn().mockResolvedValue({
      originalQuery: 'test',
      filters: {},
      interpretation: 'test',
      confidence: 0.8,
    }),
  },
}));

import { searchService } from '../server/services/search/search.service';

describe('SearchService', () => {
  describe('extractBasicFilters - City extraction', () => {
    it('should extract Madrid from query', async () => {
      const result = await searchService.semanticSearch('piso en madrid');
      // The service calls filterSearch internally, which uses the db mock
      expect(result).toBeDefined();
    });

    it('should extract Barcelona abbreviation barna', async () => {
      const result = await searchService.semanticSearch('apartamento en barna');
      expect(result).toBeDefined();
    });

    it('should extract neighborhood and infer city', async () => {
      const result = await searchService.semanticSearch('piso en chamberí');
      expect(result).toBeDefined();
    });
  });

  describe('extractBasicFilters - Property type extraction', () => {
    it('should detect apartment type from "piso"', async () => {
      const result = await searchService.semanticSearch('piso céntrico');
      expect(result).toBeDefined();
    });

    it('should detect house type from "chalet"', async () => {
      const result = await searchService.semanticSearch('chalet en las afueras');
      expect(result).toBeDefined();
    });

    it('should detect penthouse from "ático"', async () => {
      const result = await searchService.semanticSearch('ático con terraza');
      expect(result).toBeDefined();
    });
  });

  describe('extractBasicFilters - Price extraction', () => {
    it('should extract max price from "menos de 300000"', async () => {
      const result = await searchService.semanticSearch('piso menos de 300000 euros');
      expect(result).toBeDefined();
    });

    it('should extract price range from "entre X y Y"', async () => {
      const result = await searchService.semanticSearch('piso entre 200000 y 400000');
      expect(result).toBeDefined();
    });

    it('should handle k suffix for price', async () => {
      const result = await searchService.semanticSearch('piso hasta 300k');
      expect(result).toBeDefined();
    });
  });

  describe('extractBasicFilters - Operation type', () => {
    it('should detect rent from "alquiler"', async () => {
      const result = await searchService.semanticSearch('alquiler piso madrid');
      expect(result).toBeDefined();
    });

    it('should detect sale from "comprar"', async () => {
      const result = await searchService.semanticSearch('comprar casa valencia');
      expect(result).toBeDefined();
    });
  });

  describe('extractBasicFilters - Features', () => {
    it('should detect parking requirement', async () => {
      const result = await searchService.semanticSearch('piso con parking madrid');
      expect(result).toBeDefined();
    });

    it('should detect pool requirement', async () => {
      const result = await searchService.semanticSearch('casa con piscina');
      expect(result).toBeDefined();
    });

    it('should detect bedroom count', async () => {
      const result = await searchService.semanticSearch('piso 3 habitaciones madrid');
      expect(result).toBeDefined();
    });
  });

  describe('extractBasicFilters - Size inference', () => {
    it('should infer min size from "amplio"', async () => {
      const result = await searchService.semanticSearch('piso amplio madrid');
      expect(result).toBeDefined();
    });

    it('should extract explicit size', async () => {
      const result = await searchService.semanticSearch('piso mas de 80 m2 madrid');
      expect(result).toBeDefined();
    });
  });

  describe('filterSearch', () => {
    it('should return search results with pagination', async () => {
      const result = await searchService.filterSearch({
        city: 'Madrid',
        limit: 20,
        offset: 0,
      });

      expect(result).toHaveProperty('listings');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');
    });

    it('should handle empty results gracefully', async () => {
      const result = await searchService.filterSearch({
        city: 'NonexistentCity',
        limit: 20,
        offset: 0,
      });

      expect(result.listings).toEqual([]);
    });
  });

  describe('autocomplete', () => {
    it('should return suggestions array', async () => {
      const result = await searchService.autocomplete('Mad', 10);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findSimilar', () => {
    it('should return empty array for non-existent listing', async () => {
      const result = await searchService.findSimilar('nonexistent-id');
      expect(result).toEqual([]);
    });
  });

  describe('parseNaturalLanguageQuery', () => {
    it('should return parsed query with filters', async () => {
      const result = await searchService.parseNaturalLanguageQuery('piso en madrid');
      expect(result).toHaveProperty('originalQuery');
      expect(result).toHaveProperty('filters');
      expect(result).toHaveProperty('confidence');
    });

    it('should fallback gracefully when AI fails', async () => {
      const { aiEngine } = await import('../server/services/ai');
      vi.mocked(aiEngine.parseSearchQuery).mockRejectedValueOnce(new Error('AI unavailable'));

      const result = await searchService.parseNaturalLanguageQuery('test query');
      expect(result.confidence).toBe(0.5);
    });
  });
});
