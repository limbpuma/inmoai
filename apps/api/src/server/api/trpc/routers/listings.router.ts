import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import { db } from '@/server/infrastructure/database';
import {
  listings,
  listingImages,
  priceHistory,
  sources,
  userFavorites,
  leads,
} from '@/server/infrastructure/database/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import type { ListingDetail, ListingImage, PriceHistoryPoint } from '@/shared/types';

export const listingsRouter = createTRPCRouter({
  /**
   * Get listing by ID with full details
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }): Promise<ListingDetail | null> => {
      const listing = await db.query.listings.findFirst({
        where: eq(listings.id, input.id),
        with: {
          source: true,
          images: {
            orderBy: (images, { asc }) => [asc(images.position)],
          },
          priceHistory: {
            orderBy: (history, { desc }) => [desc(history.recordedAt)],
            limit: 50,
          },
        },
      });

      if (!listing) {
        return null;
      }

      const images: ListingImage[] = listing.images.map((img) => ({
        id: img.id,
        url: img.cdnUrl ?? img.originalUrl,
        thumbnailUrl: img.thumbnailUrl,
        position: img.position ?? 0,
        roomType: img.roomType,
        authenticityScore: img.authenticityScore,
        isAiGenerated: img.isAiGenerated,
        isEdited: img.isEdited,
        qualityScore: img.qualityScore,
      }));

      const priceHistoryPoints: PriceHistoryPoint[] = listing.priceHistory.map((ph) => ({
        price: Number(ph.price),
        date: ph.recordedAt,
      }));

      return {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        aiDescription: listing.aiDescription,
        aiHighlights: listing.aiHighlights,
        aiIssues: listing.aiIssues,
        price: listing.price ? Number(listing.price) : null,
        pricePerSqm: listing.pricePerSqm ? Number(listing.pricePerSqm) : null,
        city: listing.city,
        neighborhood: listing.neighborhood,
        address: listing.address,
        postalCode: listing.postalCode,
        province: listing.province,
        latitude: listing.latitude ? Number(listing.latitude) : null,
        longitude: listing.longitude ? Number(listing.longitude) : null,
        propertyType: listing.propertyType,
        operationType: listing.operationType,
        sizeSqm: listing.sizeSqm,
        rooms: listing.rooms,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        floor: listing.floor,
        totalFloors: listing.totalFloors,
        hasElevator: listing.hasElevator,
        hasParking: listing.hasParking,
        hasTerrace: listing.hasTerrace,
        hasBalcony: listing.hasBalcony,
        hasGarden: listing.hasGarden,
        hasPool: listing.hasPool,
        hasAirConditioning: listing.hasAirConditioning,
        hasHeating: listing.hasHeating,
        heatingType: listing.heatingType,
        orientation: listing.orientation,
        yearBuilt: listing.yearBuilt,
        energyRating: listing.energyRating,
        authenticityScore: listing.authenticityScore,
        isAiGenerated: listing.isAiGenerated,
        qualityScore: listing.qualityScore,
        valuationEstimate: listing.valuationEstimate
          ? Number(listing.valuationEstimate)
          : null,
        valuationConfidence: listing.valuationConfidence
          ? Number(listing.valuationConfidence)
          : null,
        externalUrl: listing.externalUrl,
        source: listing.source
          ? {
              id: listing.source.slug, // Use slug as ID for InmoAI detection
              name: listing.source.name,
              slug: listing.source.slug,
              website: listing.source.website,
            }
          : null,
        firstSeenAt: listing.firstSeenAt,
        lastSeenAt: listing.lastSeenAt,
        status: listing.status,
        improvements: listing.improvements,
        imageUrl: images[0]?.url ?? null,
        imageCount: images.length,
        images,
        priceHistory: priceHistoryPoints,
        createdAt: listing.createdAt,
      };
    }),

  /**
   * Get recent listings
   */
  getRecent: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(12),
        city: z.string().optional(),
        operationType: z.enum(['sale', 'rent']).optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [eq(listings.status, 'active')];

      if (input.city) {
        conditions.push(eq(listings.city, input.city));
      }

      if (input.operationType) {
        conditions.push(eq(listings.operationType, input.operationType));
      }

      const results = await db
        .select({
          id: listings.id,
          title: listings.title,
          price: listings.price,
          city: listings.city,
          neighborhood: listings.neighborhood,
          propertyType: listings.propertyType,
          operationType: listings.operationType,
          sizeSqm: listings.sizeSqm,
          rooms: listings.rooms,
          bedrooms: listings.bedrooms,
          bathrooms: listings.bathrooms,
          authenticityScore: listings.authenticityScore,
          createdAt: listings.createdAt,
        })
        .from(listings)
        .where(and(...conditions))
        .orderBy(desc(listings.createdAt))
        .limit(input.limit);

      // Get images for listings
      const listingIds = results.map((r) => r.id);
      const images =
        listingIds.length > 0
          ? await db
              .select({
                listingId: listingImages.listingId,
                url: listingImages.cdnUrl,
                originalUrl: listingImages.originalUrl,
              })
              .from(listingImages)
              .where(
                and(
                  inArray(listingImages.listingId, listingIds),
                  eq(listingImages.position, 0)
                )
              )
          : [];

      const imageMap = new Map(
        images.map((img) => [img.listingId, img.url ?? img.originalUrl])
      );

      return results.map((r) => ({
        ...r,
        price: r.price ? Number(r.price) : null,
        imageUrl: imageMap.get(r.id) ?? null,
      }));
    }),

  /**
   * Toggle favorite (add/remove)
   */
  toggleFavorite: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if already favorited
      const existing = await db.query.userFavorites.findFirst({
        where: and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.listingId, input.listingId)
        ),
      });

      if (existing) {
        // Remove favorite
        await db
          .delete(userFavorites)
          .where(eq(userFavorites.id, existing.id));
        return { favorited: false };
      } else {
        // Add favorite
        await db.insert(userFavorites).values({
          userId,
          listingId: input.listingId,
        });
        return { favorited: true };
      }
    }),

  /**
   * Get user's favorites
   */
  getFavorites: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const favorites = await db.query.userFavorites.findMany({
        where: eq(userFavorites.userId, userId),
        with: {
          listing: {
            with: {
              images: {
                where: eq(listingImages.position, 0),
                limit: 1,
              },
            },
          },
        },
        orderBy: (fav, { desc }) => [desc(fav.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return favorites.map((fav) => ({
        id: fav.listing.id,
        title: fav.listing.title,
        price: fav.listing.price ? Number(fav.listing.price) : null,
        city: fav.listing.city,
        neighborhood: fav.listing.neighborhood,
        propertyType: fav.listing.propertyType,
        operationType: fav.listing.operationType,
        sizeSqm: fav.listing.sizeSqm,
        rooms: fav.listing.rooms,
        bedrooms: fav.listing.bedrooms,
        bathrooms: fav.listing.bathrooms,
        authenticityScore: fav.listing.authenticityScore,
        imageUrl:
          fav.listing.images[0]?.cdnUrl ??
          fav.listing.images[0]?.originalUrl ??
          null,
        favoritedAt: fav.createdAt,
      }));
    }),

  /**
   * Check if listing is favorited
   */
  isFavorited: protectedProcedure
    .input(z.object({ listingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const favorite = await db.query.userFavorites.findFirst({
        where: and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.listingId, input.listingId)
        ),
      });

      return { favorited: !!favorite };
    }),

  /**
   * Submit a lead/inquiry for a listing
   */
  submitLead: publicProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        name: z.string().min(2, 'Nombre requerido'),
        email: z.string().email('Email inválido'),
        phone: z.string().optional(),
        message: z.string().max(1000).optional(),
        source: z.string().optional().default('website'),
        utmSource: z.string().optional(),
        utmMedium: z.string().optional(),
        utmCampaign: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify listing exists
      const listing = await db.query.listings.findFirst({
        where: eq(listings.id, input.listingId),
      });

      if (!listing) {
        throw new Error('Listing not found');
      }

      // Create lead
      const [lead] = await db
        .insert(leads)
        .values({
          listingId: input.listingId,
          name: input.name,
          email: input.email,
          phone: input.phone || null,
          message: input.message || null,
          source: input.source,
          utmSource: input.utmSource || null,
          utmMedium: input.utmMedium || null,
          utmCampaign: input.utmCampaign || null,
          status: 'new',
        })
        .returning({ id: leads.id });

      return {
        success: true,
        leadId: lead.id,
        message: 'Consulta enviada correctamente',
      };
    }),

  /**
   * Get leads for a listing (owner only)
   */
  getLeads: protectedProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify user owns the listing
      const listing = await db.query.listings.findFirst({
        where: and(
          eq(listings.id, input.listingId),
          eq(listings.userId, userId)
        ),
      });

      if (!listing) {
        throw new Error('Listing not found or not authorized');
      }

      const conditions = [eq(leads.listingId, input.listingId)];
      if (input.status) {
        conditions.push(eq(leads.status, input.status));
      }

      const results = await db.query.leads.findMany({
        where: and(...conditions),
        orderBy: (l, { desc }) => [desc(l.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return results;
    }),

  /**
   * Update lead status
   */
  updateLeadStatus: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get lead and verify ownership
      const lead = await db.query.leads.findFirst({
        where: eq(leads.id, input.leadId),
        with: { listing: true },
      });

      if (!lead || lead.listing?.userId !== userId) {
        throw new Error('Lead not found or not authorized');
      }

      await db
        .update(leads)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, input.leadId));

      return { success: true };
    }),
});
