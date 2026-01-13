import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { searchService } from '@/server/services/search';
import { searchFiltersSchema } from '@/shared/types';

export const searchRouter = createTRPCRouter({
  /**
   * Semantic search with natural language
   */
  semantic: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        filters: searchFiltersSchema.partial().optional(),
      })
    )
    .query(async ({ input }) => {
      return searchService.semanticSearch(input.query, input.filters);
    }),

  /**
   * Filter-based search
   */
  filter: publicProcedure
    .input(searchFiltersSchema)
    .query(async ({ input }) => {
      return searchService.filterSearch(input);
    }),

  /**
   * Hybrid search (semantic + filters)
   */
  hybrid: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        filters: searchFiltersSchema,
      })
    )
    .query(async ({ input }) => {
      return searchService.hybridSearch(input.query, input.filters);
    }),

  /**
   * Autocomplete suggestions
   */
  autocomplete: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ input }) => {
      return searchService.autocomplete(input.query, input.limit);
    }),

  /**
   * Find similar listings
   */
  similar: publicProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        limit: z.number().min(1).max(20).default(6),
      })
    )
    .query(async ({ input }) => {
      return searchService.findSimilar(input.listingId, input.limit);
    }),

  /**
   * Parse natural language query
   */
  parseQuery: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ input }) => {
      return searchService.parseNaturalLanguageQuery(input.query);
    }),
});
