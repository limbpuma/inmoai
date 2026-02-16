import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/infrastructure/database';
import {
  serviceProviders,
  providerServices,
  serviceLeads,
  providerReviews,
  providerPortfolio,
  listings,
  type ServiceCategory,
} from '@/server/infrastructure/database/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { proximityService } from '@/server/services/marketplace';

const serviceCategoryEnum = z.enum([
  'painting',
  'renovation',
  'electrical',
  'plumbing',
  'garden',
  'general',
]);

export const marketplaceRouter = createTRPCRouter({
  // ==========================================
  // Provider Search
  // ==========================================

  /**
   * Search providers by proximity
   */
  searchProviders: publicProcedure
    .input(
      z.object({
        listingId: z.string().uuid().optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        city: z.string().optional(),
        neighborhood: z.string().optional(),
        categories: z.array(serviceCategoryEnum).optional(),
        maxDistanceKm: z.number().min(1).max(200).optional(),
        minRating: z.number().min(0).max(5).optional(),
        verifiedOnly: z.boolean().optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const result = await proximityService.searchProviders({
        ...input,
        improvementCategories: input.categories as ServiceCategory[] | undefined,
      });
      return result;
    }),

  /**
   * Get recommended providers for a listing
   */
  getRecommendedProviders: publicProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        limit: z.number().min(1).max(20).default(10),
        verifiedOnly: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const result = await proximityService.getRecommendedForListing(input.listingId, {
        limit: input.limit,
        verifiedOnly: input.verifiedOnly,
      });
      return result;
    }),

  // ==========================================
  // Provider Profile
  // ==========================================

  /**
   * Get provider by slug
   */
  getProviderBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const provider = await db.query.serviceProviders.findFirst({
        where: and(eq(serviceProviders.slug, input.slug), eq(serviceProviders.status, 'active')),
        with: {
          services: {
            where: eq(providerServices.isActive, true),
          },
          reviews: {
            where: eq(providerReviews.isPublished, true),
            orderBy: [desc(providerReviews.createdAt)],
            limit: 10,
          },
          portfolio: {
            where: eq(providerPortfolio.isPublished, true),
            orderBy: [providerPortfolio.position],
            limit: 20,
          },
        },
      });

      if (!provider) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Provider not found',
        });
      }

      return {
        ...provider,
        averageRating: Number(provider.averageRating),
        latitude: Number(provider.latitude),
        longitude: Number(provider.longitude),
        services: provider.services.map((s) => ({
          ...s,
          priceMin: s.priceMin ? Number(s.priceMin) : null,
          priceMax: s.priceMax ? Number(s.priceMax) : null,
        })),
        reviews: provider.reviews.map((r) => ({
          ...r,
          createdAt: r.createdAt,
        })),
        portfolio: provider.portfolio.map((p) => ({
          ...p,
          projectCost: p.projectCost ? Number(p.projectCost) : null,
        })),
      };
    }),

  /**
   * Get provider by ID
   */
  getProviderById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const provider = await db.query.serviceProviders.findFirst({
      where: and(eq(serviceProviders.id, input.id), eq(serviceProviders.status, 'active')),
      with: {
        services: {
          where: eq(providerServices.isActive, true),
        },
      },
    });

    if (!provider) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Provider not found',
      });
    }

    return {
      ...provider,
      averageRating: Number(provider.averageRating),
      latitude: Number(provider.latitude),
      longitude: Number(provider.longitude),
      services: provider.services.map((s) => ({
        ...s,
        priceMin: s.priceMin ? Number(s.priceMin) : null,
        priceMax: s.priceMax ? Number(s.priceMax) : null,
      })),
    };
  }),

  // ==========================================
  // Service Categories
  // ==========================================

  /**
   * Get all service categories
   */
  getCategories: publicProcedure.query(async () => {
    const categories: Array<{
      value: ServiceCategory;
      label: string;
      icon: string;
    }> = [
      { value: 'painting', label: 'Pintura', icon: 'paint-bucket' },
      { value: 'renovation', label: 'Reformas', icon: 'hammer' },
      { value: 'electrical', label: 'Electricidad', icon: 'zap' },
      { value: 'plumbing', label: 'Fontanería', icon: 'droplets' },
      { value: 'garden', label: 'Jardín/Exterior', icon: 'tree-deciduous' },
      { value: 'general', label: 'General', icon: 'wrench' },
    ];
    return categories;
  }),

  // ==========================================
  // Quote Requests (Leads)
  // ==========================================

  /**
   * Request a quote from a provider
   */
  requestQuote: protectedProcedure
    .input(
      z.object({
        providerId: z.string().uuid(),
        listingId: z.string().uuid().optional(),
        category: serviceCategoryEnum,
        title: z.string().min(5).max(255),
        description: z.string().max(2000).optional(),
        improvementId: z.string().optional(),
        workAddress: z.string().optional(),
        workCity: z.string().optional(),
        budget: z.number().min(0).optional(),
        urgency: z.enum(['urgent', 'normal', 'flexible']).default('normal'),
        preferredDate: z.date().optional(),
        clientName: z.string().min(2).max(255),
        clientEmail: z.string().email(),
        clientPhone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify provider exists and is active
      const provider = await db.query.serviceProviders.findFirst({
        where: and(eq(serviceProviders.id, input.providerId), eq(serviceProviders.status, 'active')),
      });

      if (!provider) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Provider not found',
        });
      }

      // Get location from listing if provided
      let workLocation = {
        address: input.workAddress,
        city: input.workCity,
        latitude: null as number | null,
        longitude: null as number | null,
      };

      if (input.listingId) {
        const listing = await db.query.listings.findFirst({
          where: eq(listings.id, input.listingId),
          columns: {
            address: true,
            city: true,
            latitude: true,
            longitude: true,
          },
        });

        if (listing) {
          workLocation = {
            address: input.workAddress ?? listing.address ?? undefined,
            city: input.workCity ?? listing.city ?? undefined,
            latitude: listing.latitude ? Number(listing.latitude) : null,
            longitude: listing.longitude ? Number(listing.longitude) : null,
          };
        }
      }

      // Create lead
      const [lead] = await db
        .insert(serviceLeads)
        .values({
          providerId: input.providerId,
          listingId: input.listingId,
          improvementId: input.improvementId,
          category: input.category,
          title: input.title,
          description: input.description,
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientPhone: input.clientPhone,
          workAddress: workLocation.address,
          workCity: workLocation.city,
          workLatitude: workLocation.latitude?.toString(),
          workLongitude: workLocation.longitude?.toString(),
          budget: input.budget?.toString(),
          urgency: input.urgency,
          preferredDate: input.preferredDate,
          status: 'new',
          source: input.listingId ? 'listing' : 'marketplace',
        })
        .returning();

      // Update provider's lead count
      await db
        .update(serviceProviders)
        .set({
          totalLeads: sql`${serviceProviders.totalLeads} + 1`,
          leadsThisMonth: sql`${serviceProviders.leadsThisMonth} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(serviceProviders.id, input.providerId));

      return {
        id: lead.id,
        status: lead.status,
        createdAt: lead.createdAt,
      };
    }),

  // ==========================================
  // Provider Reviews
  // ==========================================

  /**
   * Get reviews for a provider
   */
  getProviderReviews: publicProcedure
    .input(
      z.object({
        providerId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const [reviews, countResult] = await Promise.all([
        db
          .select({
            id: providerReviews.id,
            rating: providerReviews.rating,
            title: providerReviews.title,
            content: providerReviews.content,
            authorName: providerReviews.authorName,
            qualityRating: providerReviews.qualityRating,
            communicationRating: providerReviews.communicationRating,
            timelinessRating: providerReviews.timelinessRating,
            valueRating: providerReviews.valueRating,
            category: providerReviews.category,
            isVerified: providerReviews.isVerified,
            providerResponse: providerReviews.providerResponse,
            createdAt: providerReviews.createdAt,
          })
          .from(providerReviews)
          .where(
            and(eq(providerReviews.providerId, input.providerId), eq(providerReviews.isPublished, true))
          )
          .orderBy(desc(providerReviews.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(providerReviews)
          .where(
            and(eq(providerReviews.providerId, input.providerId), eq(providerReviews.isPublished, true))
          ),
      ]);

      const total = countResult[0]?.count ?? 0;

      return {
        reviews,
        total,
        hasMore: input.offset + reviews.length < total,
      };
    }),

  /**
   * Submit a review for a provider
   */
  submitReview: protectedProcedure
    .input(
      z.object({
        providerId: z.string().uuid(),
        serviceLeadId: z.string().uuid().optional(),
        rating: z.number().min(1).max(5),
        title: z.string().max(255).optional(),
        content: z.string().max(2000).optional(),
        qualityRating: z.number().min(1).max(5).optional(),
        communicationRating: z.number().min(1).max(5).optional(),
        timelinessRating: z.number().min(1).max(5).optional(),
        valueRating: z.number().min(1).max(5).optional(),
        category: serviceCategoryEnum.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify provider exists
      const provider = await db.query.serviceProviders.findFirst({
        where: eq(serviceProviders.id, input.providerId),
      });

      if (!provider) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Provider not found',
        });
      }

      // Check if user can verify review via service lead
      let isVerified = false;
      if (input.serviceLeadId) {
        const lead = await db.query.serviceLeads.findFirst({
          where: and(
            eq(serviceLeads.id, input.serviceLeadId),
            eq(serviceLeads.providerId, input.providerId),
            eq(serviceLeads.status, 'completed')
          ),
        });
        isVerified = !!lead;
      }

      // Create review
      const [review] = await db
        .insert(providerReviews)
        .values({
          providerId: input.providerId,
          serviceLeadId: input.serviceLeadId,
          userId: ctx.session.user.id,
          authorName: ctx.session.user.name ?? 'Usuario',
          authorEmail: ctx.session.user.email,
          rating: input.rating,
          title: input.title,
          content: input.content,
          qualityRating: input.qualityRating,
          communicationRating: input.communicationRating,
          timelinessRating: input.timelinessRating,
          valueRating: input.valueRating,
          category: input.category,
          isVerified,
          isPublished: true,
        })
        .returning();

      // Update provider's rating stats
      const allReviews = await db
        .select({ rating: providerReviews.rating })
        .from(providerReviews)
        .where(
          and(eq(providerReviews.providerId, input.providerId), eq(providerReviews.isPublished, true))
        );

      const avgRating =
        allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

      await db
        .update(serviceProviders)
        .set({
          totalReviews: allReviews.length,
          averageRating: avgRating.toFixed(1),
          updatedAt: new Date(),
        })
        .where(eq(serviceProviders.id, input.providerId));

      return {
        id: review.id,
        isVerified: review.isVerified,
        createdAt: review.createdAt,
      };
    }),
});
