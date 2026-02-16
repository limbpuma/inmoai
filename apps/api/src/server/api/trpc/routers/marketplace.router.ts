import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure, rateLimitedPublicProcedure } from '../trpc';
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
import { eq, and, desc, sql, inArray, asc } from 'drizzle-orm';
import { proximityService } from '@/server/services/marketplace';
import { notifications } from '@/server/infrastructure/database/schema';
import { PROVIDER_PLANS, stripe, createCheckoutSession } from '@/server/services/stripe/stripe.service';

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
  searchProviders: rateLimitedPublicProcedure
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
  getRecommendedProviders: rateLimitedPublicProcedure
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
    .input(z.object({ slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/) }))
    .query(async ({ input }) => {
      const provider = await db.query.serviceProviders.findFirst({
        where: and(eq(serviceProviders.slug, input.slug), eq(serviceProviders.status, 'active')),
        columns: {
          id: true,
          businessName: true,
          slug: true,
          description: true,
          logoUrl: true,
          address: true,
          city: true,
          province: true,
          tier: true,
          averageRating: true,
          totalReviews: true,
          totalLeads: true,
          responseTimeMinutes: true,
          isVerified: true,
          coverageRadiusKm: true,
          contactPhone: true,
          contactEmail: true,
          website: true,
          latitude: true,
          longitude: true,
        },
        with: {
          services: {
            where: eq(providerServices.isActive, true),
          },
          reviews: {
            where: eq(providerReviews.isPublished, true),
            orderBy: [desc(providerReviews.createdAt)],
            limit: 10,
            columns: {
              id: true,
              rating: true,
              title: true,
              content: true,
              authorName: true,
              qualityRating: true,
              communicationRating: true,
              timelinessRating: true,
              valueRating: true,
              category: true,
              isVerified: true,
              providerResponse: true,
              createdAt: true,
            },
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
        reviews: provider.reviews,
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
      columns: {
        id: true,
        businessName: true,
        slug: true,
        description: true,
        logoUrl: true,
        city: true,
        tier: true,
        averageRating: true,
        totalReviews: true,
        totalLeads: true,
        responseTimeMinutes: true,
        isVerified: true,
        coverageRadiusKm: true,
        contactPhone: true,
        contactEmail: true,
        website: true,
        latitude: true,
        longitude: true,
      },
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

      // Enforce lead limits per tier
      const providerPlan = PROVIDER_PLANS[provider.tier as keyof typeof PROVIDER_PLANS] ?? PROVIDER_PLANS.free;
      if (
        providerPlan.limits.leadsPerMonth !== -1 &&
        (provider.leadsThisMonth ?? 0) >= providerPlan.limits.leadsPerMonth
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Este profesional ha alcanzado el limite de ${providerPlan.limits.leadsPerMonth} leads/mes de su plan ${providerPlan.name}. Intenta con otro profesional.`,
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

      // Create lead and update counter in a transaction
      const lead = await db.transaction(async (tx) => {
        const [newLead] = await tx
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

        await tx
          .update(serviceProviders)
          .set({
            totalLeads: sql`${serviceProviders.totalLeads} + 1`,
            leadsThisMonth: sql`${serviceProviders.leadsThisMonth} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(serviceProviders.id, input.providerId));

        return newLead;
      });

      // Send notification to provider if they have a userId
      if (provider.userId) {
        await db.insert(notifications).values({
          userId: provider.userId,
          type: 'system',
          title: `Nuevo presupuesto: ${input.title}`,
          message: `${input.clientName} solicita presupuesto de ${input.category} en ${input.workCity || provider.city}`,
          metadata: {
            notificationType: 'service_lead_received',
            leadId: lead.id,
            providerId: provider.id,
            category: input.category,
            clientName: input.clientName,
          },
        });
      }

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

      // Prevent duplicate reviews from the same user
      const existingReview = await db.query.providerReviews.findFirst({
        where: and(
          eq(providerReviews.userId, ctx.session.user.id),
          eq(providerReviews.providerId, input.providerId),
        ),
      });

      if (existingReview) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ya has enviado una opinion para este profesional',
        });
      }

      // Check if user can verify review via service lead (must belong to this user)
      let isVerified = false;
      if (input.serviceLeadId) {
        const lead = await db.query.serviceLeads.findFirst({
          where: and(
            eq(serviceLeads.id, input.serviceLeadId),
            eq(serviceLeads.providerId, input.providerId),
            eq(serviceLeads.status, 'completed'),
            eq(serviceLeads.clientEmail, ctx.session.user.email)
          ),
        });
        isVerified = !!lead;
      }

      // Create review and update rating in a transaction
      const review = await db.transaction(async (tx) => {
        const [newReview] = await tx
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

        // Recalculate rating atomically within the transaction
        const allReviews = await tx
          .select({ rating: providerReviews.rating })
          .from(providerReviews)
          .where(
            and(eq(providerReviews.providerId, input.providerId), eq(providerReviews.isPublished, true))
          );

        const avgRating =
          allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        await tx
          .update(serviceProviders)
          .set({
            totalReviews: allReviews.length,
            averageRating: avgRating.toFixed(1),
            updatedAt: new Date(),
          })
          .where(eq(serviceProviders.id, input.providerId));

        return newReview;
      });

      return {
        id: review.id,
        isVerified: review.isVerified,
        createdAt: review.createdAt,
      };
    }),

  // ==========================================
  // Provider Registration & Management
  // ==========================================

  /**
   * Register as a service provider
   */
  registerProvider: protectedProcedure
    .input(
      z.object({
        businessName: z.string().min(2).max(255),
        description: z.string().max(2000).optional(),
        contactName: z.string().min(2).max(255),
        contactEmail: z.string().email(),
        contactPhone: z.string().min(6).max(50),
        website: z.string().url().optional(),
        address: z.string().max(500).optional(),
        city: z.string().min(1).max(100),
        province: z.string().max(100).optional(),
        postalCode: z.string().max(20).optional(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        coverageRadiusKm: z.number().min(1).max(200).default(25),
        services: z.array(
          z.object({
            category: serviceCategoryEnum,
            title: z.string().min(2).max(255),
            description: z.string().max(1000).optional(),
            priceMin: z.number().min(0).optional(),
            priceMax: z.number().min(0).optional(),
            priceUnit: z.string().max(50).default('proyecto'),
          })
        ).min(1).max(10),
        metadata: z.object({
          yearsInBusiness: z.number().min(0).max(100).optional(),
          employeeCount: z.number().min(1).max(10000).optional(),
          certifications: z.array(z.string()).optional(),
          insuranceInfo: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already has a provider profile
      const existing = await db.query.serviceProviders.findFirst({
        where: eq(serviceProviders.userId, ctx.session.user.id),
        columns: { id: true, status: true },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Ya tienes un perfil de profesional registrado',
        });
      }

      // Generate slug from business name
      const baseSlug = input.businessName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check slug uniqueness and append suffix if needed
      let slug = baseSlug;
      let suffix = 0;
      while (true) {
        const existingSlug = await db.query.serviceProviders.findFirst({
          where: eq(serviceProviders.slug, slug),
          columns: { id: true },
        });
        if (!existingSlug) break;
        suffix++;
        slug = `${baseSlug}-${suffix}`;
      }

      // Create provider and services in a transaction
      const provider = await db.transaction(async (tx) => {
        const [newProvider] = await tx
          .insert(serviceProviders)
          .values({
            userId: ctx.session.user.id,
            businessName: input.businessName,
            slug,
            description: input.description,
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            website: input.website,
            address: input.address,
            city: input.city,
            province: input.province,
            postalCode: input.postalCode,
            latitude: input.latitude.toString(),
            longitude: input.longitude.toString(),
            coverageRadiusKm: input.coverageRadiusKm,
            status: 'active',
            tier: 'free',
            metadata: input.metadata,
          })
          .returning({ id: serviceProviders.id, slug: serviceProviders.slug });

        // Insert services
        if (input.services.length > 0) {
          await tx.insert(providerServices).values(
            input.services.map((s) => ({
              providerId: newProvider.id,
              category: s.category,
              title: s.title,
              description: s.description,
              priceMin: s.priceMin?.toString(),
              priceMax: s.priceMax?.toString(),
              priceUnit: s.priceUnit,
              isActive: true,
            }))
          );
        }

        return newProvider;
      });

      return {
        id: provider.id,
        slug: provider.slug,
      };
    }),

  /**
   * Get the current user's provider profile
   */
  getMyProvider: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.query.serviceProviders.findFirst({
      where: eq(serviceProviders.userId, ctx.session.user.id),
      with: {
        services: true,
      },
    });

    if (!provider) {
      return null;
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

  /**
   * Update provider profile
   */
  updateMyProvider: protectedProcedure
    .input(
      z.object({
        businessName: z.string().min(2).max(255).optional(),
        description: z.string().max(2000).optional(),
        contactName: z.string().min(2).max(255).optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().min(6).max(50).optional(),
        website: z.string().url().nullable().optional(),
        address: z.string().max(500).optional(),
        city: z.string().min(1).max(100).optional(),
        province: z.string().max(100).optional(),
        postalCode: z.string().max(20).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        coverageRadiusKm: z.number().min(1).max(200).optional(),
        metadata: z.object({
          yearsInBusiness: z.number().min(0).max(100).optional(),
          employeeCount: z.number().min(1).max(10000).optional(),
          certifications: z.array(z.string()).optional(),
          insuranceInfo: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const provider = await db.query.serviceProviders.findFirst({
        where: eq(serviceProviders.userId, ctx.session.user.id),
        columns: { id: true },
      });

      if (!provider) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No tienes un perfil de profesional' });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.businessName !== undefined) updateData.businessName = input.businessName;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.contactName !== undefined) updateData.contactName = input.contactName;
      if (input.contactEmail !== undefined) updateData.contactEmail = input.contactEmail;
      if (input.contactPhone !== undefined) updateData.contactPhone = input.contactPhone;
      if (input.website !== undefined) updateData.website = input.website;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.city !== undefined) updateData.city = input.city;
      if (input.province !== undefined) updateData.province = input.province;
      if (input.postalCode !== undefined) updateData.postalCode = input.postalCode;
      if (input.latitude !== undefined) updateData.latitude = input.latitude.toString();
      if (input.longitude !== undefined) updateData.longitude = input.longitude.toString();
      if (input.coverageRadiusKm !== undefined) updateData.coverageRadiusKm = input.coverageRadiusKm;
      if (input.metadata !== undefined) updateData.metadata = input.metadata;

      await db
        .update(serviceProviders)
        .set(updateData)
        .where(eq(serviceProviders.id, provider.id));

      return { success: true };
    }),

  /**
   * Get provider's leads
   */
  getMyLeads: protectedProcedure
    .input(
      z.object({
        status: z.enum(['new', 'viewed', 'contacted', 'quoted', 'accepted', 'completed', 'cancelled']).optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const provider = await db.query.serviceProviders.findFirst({
        where: eq(serviceProviders.userId, ctx.session.user.id),
        columns: { id: true },
      });

      if (!provider) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No tienes un perfil de profesional' });
      }

      const conditions = [eq(serviceLeads.providerId, provider.id)];
      if (input.status) {
        conditions.push(eq(serviceLeads.status, input.status));
      }

      const [leads, countResult] = await Promise.all([
        db
          .select({
            id: serviceLeads.id,
            category: serviceLeads.category,
            title: serviceLeads.title,
            description: serviceLeads.description,
            clientName: serviceLeads.clientName,
            clientEmail: serviceLeads.clientEmail,
            clientPhone: serviceLeads.clientPhone,
            workCity: serviceLeads.workCity,
            budget: serviceLeads.budget,
            urgency: serviceLeads.urgency,
            preferredDate: serviceLeads.preferredDate,
            status: serviceLeads.status,
            viewedAt: serviceLeads.viewedAt,
            contactedAt: serviceLeads.contactedAt,
            quotedAmount: serviceLeads.quotedAmount,
            quotedAt: serviceLeads.quotedAt,
            completedAt: serviceLeads.completedAt,
            source: serviceLeads.source,
            createdAt: serviceLeads.createdAt,
          })
          .from(serviceLeads)
          .where(and(...conditions))
          .orderBy(desc(serviceLeads.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(serviceLeads)
          .where(and(...conditions)),
      ]);

      return {
        leads: leads.map((l) => ({
          ...l,
          budget: l.budget ? Number(l.budget) : null,
          quotedAmount: l.quotedAmount ? Number(l.quotedAmount) : null,
        })),
        total: countResult[0]?.count ?? 0,
        hasMore: input.offset + leads.length < (countResult[0]?.count ?? 0),
      };
    }),

  /**
   * Update lead status
   */
  updateLeadStatus: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        status: z.enum(['viewed', 'contacted', 'quoted', 'accepted', 'completed', 'cancelled']),
        quotedAmount: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const provider = await db.query.serviceProviders.findFirst({
        where: eq(serviceProviders.userId, ctx.session.user.id),
        columns: { id: true },
      });

      if (!provider) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No tienes un perfil de profesional' });
      }

      // Verify the lead belongs to this provider
      const lead = await db.query.serviceLeads.findFirst({
        where: and(
          eq(serviceLeads.id, input.leadId),
          eq(serviceLeads.providerId, provider.id),
        ),
        columns: { id: true, status: true },
      });

      if (!lead) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead no encontrado' });
      }

      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
      };

      // Set timestamps based on status
      if (input.status === 'viewed') updateData.viewedAt = new Date();
      if (input.status === 'contacted') updateData.contactedAt = new Date();
      if (input.status === 'quoted') {
        updateData.quotedAt = new Date();
        if (input.quotedAmount !== undefined) {
          updateData.quotedAmount = input.quotedAmount.toString();
        }
      }
      if (input.status === 'completed') updateData.completedAt = new Date();

      await db
        .update(serviceLeads)
        .set(updateData)
        .where(eq(serviceLeads.id, input.leadId));

      return { success: true };
    }),

  /**
   * Respond to a review
   */
  respondToReview: protectedProcedure
    .input(
      z.object({
        reviewId: z.string().uuid(),
        response: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const provider = await db.query.serviceProviders.findFirst({
        where: eq(serviceProviders.userId, ctx.session.user.id),
        columns: { id: true },
      });

      if (!provider) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No tienes un perfil de profesional' });
      }

      // Verify the review belongs to this provider
      const review = await db.query.providerReviews.findFirst({
        where: and(
          eq(providerReviews.id, input.reviewId),
          eq(providerReviews.providerId, provider.id),
        ),
        columns: { id: true, providerResponse: true },
      });

      if (!review) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Opinion no encontrada' });
      }

      await db
        .update(providerReviews)
        .set({
          providerResponse: input.response,
          providerRespondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(providerReviews.id, input.reviewId));

      return { success: true };
    }),

  /**
   * Get provider's reviews (for management)
   */
  getMyReviews: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const provider = await db.query.serviceProviders.findFirst({
        where: eq(serviceProviders.userId, ctx.session.user.id),
        columns: { id: true },
      });

      if (!provider) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No tienes un perfil de profesional' });
      }

      const [reviews, countResult] = await Promise.all([
        db
          .select({
            id: providerReviews.id,
            rating: providerReviews.rating,
            title: providerReviews.title,
            content: providerReviews.content,
            authorName: providerReviews.authorName,
            category: providerReviews.category,
            isVerified: providerReviews.isVerified,
            providerResponse: providerReviews.providerResponse,
            providerRespondedAt: providerReviews.providerRespondedAt,
            createdAt: providerReviews.createdAt,
          })
          .from(providerReviews)
          .where(
            and(eq(providerReviews.providerId, provider.id), eq(providerReviews.isPublished, true))
          )
          .orderBy(desc(providerReviews.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(providerReviews)
          .where(
            and(eq(providerReviews.providerId, provider.id), eq(providerReviews.isPublished, true))
          ),
      ]);

      return {
        reviews,
        total: countResult[0]?.count ?? 0,
      };
    }),

  /**
   * Get provider stats summary
   */
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.query.serviceProviders.findFirst({
      where: eq(serviceProviders.userId, ctx.session.user.id),
      columns: {
        id: true,
        totalLeads: true,
        leadsThisMonth: true,
        totalReviews: true,
        averageRating: true,
        responseTimeMinutes: true,
        tier: true,
        isVerified: true,
        status: true,
      },
    });

    if (!provider) {
      return null;
    }

    // Count leads by status
    const statusCounts = await db
      .select({
        status: serviceLeads.status,
        count: sql<number>`count(*)::int`,
      })
      .from(serviceLeads)
      .where(eq(serviceLeads.providerId, provider.id))
      .groupBy(serviceLeads.status);

    const leadsByStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      leadsByStatus[row.status] = row.count;
    }

    return {
      totalLeads: provider.totalLeads ?? 0,
      leadsThisMonth: provider.leadsThisMonth ?? 0,
      totalReviews: provider.totalReviews ?? 0,
      averageRating: Number(provider.averageRating),
      responseTimeMinutes: provider.responseTimeMinutes,
      tier: provider.tier,
      isVerified: provider.isVerified,
      status: provider.status,
      leadsByStatus,
    };
  }),

  /**
   * Update provider services
   */
  updateMyServices: protectedProcedure
    .input(
      z.object({
        services: z.array(
          z.object({
            id: z.string().uuid().optional(),
            category: serviceCategoryEnum,
            title: z.string().min(2).max(255),
            description: z.string().max(1000).optional(),
            priceMin: z.number().min(0).optional(),
            priceMax: z.number().min(0).optional(),
            priceUnit: z.string().max(50).default('proyecto'),
            isActive: z.boolean().default(true),
          })
        ).min(1).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const provider = await db.query.serviceProviders.findFirst({
        where: eq(serviceProviders.userId, ctx.session.user.id),
        columns: { id: true },
      });

      if (!provider) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No tienes un perfil de profesional' });
      }

      await db.transaction(async (tx) => {
        // Delete existing services and re-insert
        await tx
          .delete(providerServices)
          .where(eq(providerServices.providerId, provider.id));

        await tx.insert(providerServices).values(
          input.services.map((s) => ({
            providerId: provider.id,
            category: s.category,
            title: s.title,
            description: s.description,
            priceMin: s.priceMin?.toString(),
            priceMax: s.priceMax?.toString(),
            priceUnit: s.priceUnit,
            isActive: s.isActive,
          }))
        );
      });

      return { success: true };
    }),

  // ==========================================
  // Provider Billing
  // ==========================================

  /**
   * Get provider plans
   */
  getProviderPlans: publicProcedure.query(() => {
    return Object.entries(PROVIDER_PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      features: plan.features,
      limits: plan.limits,
    }));
  }),

  /**
   * Create checkout session for provider tier upgrade
   */
  createProviderCheckout: protectedProcedure
    .input(
      z.object({
        tier: z.enum(['premium', 'enterprise']),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!stripe) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Sistema de pagos no configurado',
        });
      }

      const provider = await db.query.serviceProviders.findFirst({
        where: eq(serviceProviders.userId, ctx.session.user.id),
        columns: { id: true, tier: true, stripeCustomerId: true },
      });

      if (!provider) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No tienes un perfil de profesional' });
      }

      const plan = PROVIDER_PLANS[input.tier];
      if (!plan.priceId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Plan no disponible para compra',
        });
      }

      // Create or get Stripe customer
      let customerId = provider.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.session.user.email,
          name: ctx.session.user.name ?? undefined,
          metadata: {
            userId: ctx.session.user.id,
            providerId: provider.id,
            type: 'provider',
          },
        });
        customerId = customer.id;

        await db
          .update(serviceProviders)
          .set({ stripeCustomerId: customerId, updatedAt: new Date() })
          .where(eq(serviceProviders.id, provider.id));
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: plan.priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          providerId: provider.id,
          tier: input.tier,
          type: 'provider_subscription',
        },
      });

      return { url: session.url };
    }),

  /**
   * Get current provider subscription status
   */
  getProviderSubscription: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.query.serviceProviders.findFirst({
      where: eq(serviceProviders.userId, ctx.session.user.id),
      columns: {
        id: true,
        tier: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    if (!provider) {
      return null;
    }

    const plan = PROVIDER_PLANS[provider.tier as keyof typeof PROVIDER_PLANS] || PROVIDER_PLANS.free;
    const isActive = provider.tier !== 'free' &&
      provider.stripeCurrentPeriodEnd !== null &&
      new Date(provider.stripeCurrentPeriodEnd) > new Date();

    return {
      tier: provider.tier,
      planName: plan.name,
      price: plan.price,
      features: plan.features,
      limits: plan.limits,
      isActive: provider.tier === 'free' || isActive,
      currentPeriodEnd: provider.stripeCurrentPeriodEnd,
      hasSubscription: !!provider.stripeSubscriptionId,
    };
  }),
});
