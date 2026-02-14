/**
 * Cadastre Router - Spanish Property Registry Integration
 *
 * Provides verified property data from the official Spanish Cadastre.
 * This is a KEY DIFFERENTIATOR - data that AI agents cannot get elsewhere.
 *
 * Features:
 * - Verify property ownership
 * - Get official cadastral data
 * - Detect discrepancies in listings
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import { cadastreService } from '@/server/services/cadastre';

// Input schemas
const addressSchema = z.object({
  street: z.string().min(1),
  number: z.string().min(1),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().optional(),
});

const verifyPropertySchema = z.object({
  listingId: z.string().uuid().optional(),
  cadastralRef: z.string().length(20).optional(),
  address: addressSchema.optional(),
}).refine(
  (data) => data.cadastralRef || data.address,
  { message: 'Either cadastralRef or address must be provided' }
);

export const cadastreRouter = createTRPCRouter({
  /**
   * Verify a property against the Spanish Cadastre
   * Returns official data including cadastral reference, surface, year, etc.
   */
  verify: publicProcedure
    .input(verifyPropertySchema)
    .query(async ({ input }) => {
      try {
        if (input.cadastralRef) {
          // Direct lookup by cadastral reference
          const property = await cadastreService.getPropertyByReference(input.cadastralRef);

          if (!property) {
            return {
              verified: false,
              error: 'Property not found in Cadastre with this reference',
              cadastralRef: input.cadastralRef,
            };
          }

          return {
            verified: true,
            cadastralRef: property.reference,
            property: {
              address: property.address,
              surface: property.surface,
              use: property.use,
              constructionYear: property.constructionYear,
              coordinates: property.coordinates,
            },
            verifiedAt: new Date().toISOString(),
          };
        }

        if (input.address) {
          // Search by address
          const verification = await cadastreService.verifyProperty(input.address);

          return {
            verified: verification.verified,
            cadastralRef: verification.reference,
            property: verification.property ? {
              address: verification.property.address,
              surface: verification.property.surface,
              use: verification.property.use,
              constructionYear: verification.property.constructionYear,
              coordinates: verification.property.coordinates,
            } : undefined,
            matchesAddress: verification.matchesAddress,
            verifiedAt: verification.verificationDate.toISOString(),
            error: verification.error,
          };
        }

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Either cadastralRef or address must be provided',
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify property with Cadastre',
        });
      }
    }),

  /**
   * Search properties by coordinates
   * Useful for verifying properties on a map
   */
  searchByCoordinates: publicProcedure
    .input(z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }))
    .query(async ({ input }) => {
      try {
        const result = await cadastreService.getReferenceByCoordenates(
          input.latitude,
          input.longitude
        );

        return {
          found: result.found,
          properties: result.properties.map(p => ({
            cadastralRef: p.reference,
            address: p.address,
            surface: p.surface,
            use: p.use,
          })),
          error: result.error,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search Cadastre by coordinates',
        });
      }
    }),

  /**
   * Validate cadastral reference format
   * Quick check without calling the API
   */
  validateReference: publicProcedure
    .input(z.object({
      reference: z.string(),
    }))
    .query(({ input }) => {
      const isValid = cadastreService.isValidCadastralReference(input.reference);
      return {
        valid: isValid,
        reference: input.reference,
        format: isValid ? 'Valid Spanish cadastral reference (20 chars)' : 'Invalid format',
      };
    }),

  /**
   * Get full property details (protected - requires authentication)
   * More detailed data for authenticated users
   */
  getDetails: protectedProcedure
    .input(z.object({
      cadastralRef: z.string().length(20),
    }))
    .query(async ({ input }) => {
      try {
        const property = await cadastreService.getPropertyByReference(input.cadastralRef);

        if (!property) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Property not found in Cadastre',
          });
        }

        return {
          cadastralRef: property.reference,
          address: property.address,
          surface: property.surface,
          use: property.use,
          constructionYear: property.constructionYear,
          cadastralValue: property.cadastralValue,
          coordinates: property.coordinates,
          // Additional data could be added here with premium access
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get property details',
        });
      }
    }),
});
