/**
 * Social Media tRPC Router
 * Handles social media connections and posting
 */

import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { db } from '@/server/infrastructure/database';
import {
  socialConnections,
  socialPosts,
  listings,
  type SocialPlatform,
} from '@/server/infrastructure/database/schema';
import { getAdapter, getAvailablePlatforms, isPlatformSupported } from '@/server/services/social/adapters';

// ============================================
// SCHEMAS
// ============================================

const platformSchema = z.enum(['facebook', 'instagram', 'linkedin', 'tiktok', 'twitter']);

const publishSchema = z.object({
  listingId: z.string().uuid(),
  platforms: z.array(platformSchema).min(1),
  customMessage: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

const connectSchema = z.object({
  platform: platformSchema,
  code: z.string(),
  redirectUri: z.string().url(),
  pageId: z.string().optional(),
  pageAccessToken: z.string().optional(),
});

// ============================================
// ROUTER
// ============================================

export const socialRouter = router({
  /**
   * Get available platforms
   */
  getAvailablePlatforms: publicProcedure.query(() => {
    return {
      platforms: getAvailablePlatforms().map((platform) => {
        const adapter = getAdapter(platform);
        return {
          id: platform,
          name: platform.charAt(0).toUpperCase() + platform.slice(1),
          limits: adapter.limits,
        };
      }),
    };
  }),

  /**
   * Get OAuth authorization URL for a platform
   */
  getAuthUrl: protectedProcedure
    .input(
      z.object({
        platform: platformSchema,
        redirectUri: z.string().url(),
      })
    )
    .mutation(({ input }) => {
      const adapter = getAdapter(input.platform);
      const state = crypto.randomUUID();

      return {
        authUrl: adapter.getAuthorizationUrl(input.redirectUri, state),
        state,
      };
    }),

  /**
   * Complete OAuth connection
   */
  connect: protectedProcedure.input(connectSchema).mutation(async ({ input, ctx }) => {
    const { platform, code, redirectUri, pageId, pageAccessToken } = input;

    const adapter = getAdapter(platform);

    try {
      // Exchange code for tokens
      const tokens = await adapter.exchangeCodeForTokens(code, redirectUri);

      // Get account info
      const tempConnection = {
        accessToken: tokens.accessToken,
        pageAccessToken: pageAccessToken || tokens.accessToken,
        pageId,
      } as Parameters<typeof adapter.getAccountInfo>[0];

      let accountInfo;
      try {
        accountInfo = await adapter.getAccountInfo(tempConnection);
      } catch {
        accountInfo = { id: 'unknown', username: 'unknown' };
      }

      // Check if connection already exists
      const existing = await db
        .select()
        .from(socialConnections)
        .where(
          and(
            eq(socialConnections.userId, ctx.session.user.id),
            eq(socialConnections.platform, platform),
            pageId ? eq(socialConnections.pageId, pageId) : undefined
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing connection
        await db
          .update(socialConnections)
          .set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.expiresAt,
            pageAccessToken,
            platformUserId: accountInfo.id,
            platformUsername: accountInfo.username,
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(socialConnections.id, existing[0].id));

        return { success: true, connectionId: existing[0].id, updated: true };
      }

      // Create new connection
      const [connection] = await db
        .insert(socialConnections)
        .values({
          userId: ctx.session.user.id,
          platform,
          platformUserId: accountInfo.id,
          platformUsername: accountInfo.username,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiresAt,
          pageId,
          pageName: accountInfo.displayName,
          pageAccessToken,
          status: 'active',
          scopes: tokens.scope,
        })
        .returning();

      return { success: true, connectionId: connection.id, updated: false };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to connect platform',
      });
    }
  }),

  /**
   * Get user's social connections
   */
  getConnections: protectedProcedure.query(async ({ ctx }) => {
    const connections = await db
      .select({
        id: socialConnections.id,
        platform: socialConnections.platform,
        username: socialConnections.platformUsername,
        pageName: socialConnections.pageName,
        status: socialConnections.status,
        lastUsedAt: socialConnections.lastUsedAt,
        createdAt: socialConnections.createdAt,
      })
      .from(socialConnections)
      .where(eq(socialConnections.userId, ctx.session.user.id))
      .orderBy(desc(socialConnections.createdAt));

    return { connections };
  }),

  /**
   * Disconnect a social platform
   */
  disconnect: protectedProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [connection] = await db
        .select()
        .from(socialConnections)
        .where(
          and(
            eq(socialConnections.id, input.connectionId),
            eq(socialConnections.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!connection) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Connection not found' });
      }

      // Revoke access on the platform
      try {
        const adapter = getAdapter(connection.platform as SocialPlatform);
        if (connection.accessToken) {
          await adapter.revokeAccess(connection.accessToken);
        }
      } catch {
        // Continue even if revoke fails
      }

      // Delete connection
      await db.delete(socialConnections).where(eq(socialConnections.id, input.connectionId));

      return { success: true };
    }),

  /**
   * Publish to social media
   */
  publish: protectedProcedure.input(publishSchema).mutation(async ({ input, ctx }) => {
    const { listingId, platforms, customMessage, scheduledAt } = input;

    // Get listing
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
    }

    const results: Record<
      string,
      { success: boolean; postUrl?: string; postId?: string; error?: string }
    > = {};

    for (const platform of platforms) {
      // Get connection
      const [connection] = await db
        .select()
        .from(socialConnections)
        .where(
          and(
            eq(socialConnections.userId, ctx.session.user.id),
            eq(socialConnections.platform, platform),
            eq(socialConnections.status, 'active')
          )
        )
        .limit(1);

      if (!connection) {
        results[platform] = { success: false, error: `No ${platform} connection found` };
        continue;
      }

      const adapter = getAdapter(platform);

      // Build content
      const content = customMessage || buildDefaultContent(listing, platform);
      const hashtags = generateHashtags(listing, platform);

      // TODO: Fetch listing images from listingImages table
      const postData = {
        content,
        hashtags,
        mediaUrls: [] as string[],
        mediaType: 'image' as const,
        listing,
      };

      try {
        if (scheduledAt) {
          // Create scheduled post in database
          const [post] = await db
            .insert(socialPosts)
            .values({
              listingId,
              connectionId: connection.id,
              userId: ctx.session.user.id,
              platform,
              content,
              hashtags,
              mediaUrls: postData.mediaUrls,
              status: 'scheduled',
              scheduledAt: new Date(scheduledAt),
            })
            .returning();

          results[platform] = {
            success: true,
            postId: post.id,
          };
        } else {
          // Publish immediately
          const result = await adapter.publishPost(connection, postData);

          if (result.success) {
            // Save post record
            const [post] = await db
              .insert(socialPosts)
              .values({
                listingId,
                connectionId: connection.id,
                userId: ctx.session.user.id,
                platform,
                platformPostId: result.platformPostId,
                postUrl: result.postUrl,
                content,
                hashtags,
                mediaUrls: postData.mediaUrls,
                status: 'published',
                publishedAt: new Date(),
              })
              .returning();

            // Update last used
            await db
              .update(socialConnections)
              .set({ lastUsedAt: new Date() })
              .where(eq(socialConnections.id, connection.id));

            results[platform] = {
              success: true,
              postUrl: result.postUrl,
              postId: post.id,
            };
          } else {
            results[platform] = { success: false, error: result.error };
          }
        }
      } catch (error) {
        results[platform] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    const successCount = Object.values(results).filter((r) => r.success).length;

    return {
      success: successCount > 0,
      results,
      successCount,
      totalPlatforms: platforms.length,
    };
  }),

  /**
   * Get posts for a listing
   */
  getPosts: protectedProcedure
    .input(
      z.object({
        listingId: z.string().uuid().optional(),
        platform: platformSchema.optional(),
        status: z.enum(['draft', 'scheduled', 'published', 'failed']).optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      let query = db
        .select({
          id: socialPosts.id,
          platform: socialPosts.platform,
          postUrl: socialPosts.postUrl,
          content: socialPosts.content,
          status: socialPosts.status,
          scheduledAt: socialPosts.scheduledAt,
          publishedAt: socialPosts.publishedAt,
          analytics: socialPosts.analytics,
          createdAt: socialPosts.createdAt,
        })
        .from(socialPosts)
        .where(eq(socialPosts.userId, ctx.session.user.id))
        .orderBy(desc(socialPosts.createdAt))
        .limit(input.limit);

      const posts = await query;

      // Filter in memory for optional fields
      const filtered = posts.filter((post) => {
        if (input.listingId && post.id !== input.listingId) return false;
        if (input.platform && post.platform !== input.platform) return false;
        if (input.status && post.status !== input.status) return false;
        return true;
      });

      return { posts: filtered };
    }),

  /**
   * Get analytics for posts
   */
  getAnalytics: protectedProcedure
    .input(
      z.object({
        listingId: z.string().uuid().optional(),
        platform: platformSchema.optional(),
        dateRange: z
          .object({
            from: z.string().datetime(),
            to: z.string().datetime(),
          })
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const posts = await db
        .select({
          id: socialPosts.id,
          platform: socialPosts.platform,
          analytics: socialPosts.analytics,
          publishedAt: socialPosts.publishedAt,
        })
        .from(socialPosts)
        .where(
          and(
            eq(socialPosts.userId, ctx.session.user.id),
            eq(socialPosts.status, 'published')
          )
        );

      // Filter and aggregate
      const filtered = posts.filter((post) => {
        if (input.listingId && post.id !== input.listingId) return false;
        if (input.platform && post.platform !== input.platform) return false;
        if (input.dateRange) {
          const publishedAt = post.publishedAt ? new Date(post.publishedAt) : null;
          if (!publishedAt) return false;
          if (publishedAt < new Date(input.dateRange.from)) return false;
          if (publishedAt > new Date(input.dateRange.to)) return false;
        }
        return true;
      });

      const aggregated = filtered.reduce(
        (acc, post) => {
          const analytics = post.analytics as Record<string, number> | null;
          if (analytics) {
            acc.impressions += analytics.impressions || 0;
            acc.reach += analytics.reach || 0;
            acc.engagement += analytics.engagement || 0;
            acc.likes += analytics.likes || 0;
            acc.comments += analytics.comments || 0;
            acc.shares += analytics.shares || 0;
            acc.clicks += analytics.clicks || 0;
          }
          return acc;
        },
        {
          impressions: 0,
          reach: 0,
          engagement: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
        }
      );

      // Group by platform
      const byPlatform = filtered.reduce(
        (acc, post) => {
          if (!acc[post.platform]) {
            acc[post.platform] = { posts: 0, engagement: 0 };
          }
          acc[post.platform].posts++;
          const analytics = post.analytics as Record<string, number> | null;
          if (analytics) {
            acc[post.platform].engagement += analytics.engagement || 0;
          }
          return acc;
        },
        {} as Record<string, { posts: number; engagement: number }>
      );

      return {
        totalPosts: filtered.length,
        aggregated,
        byPlatform,
      };
    }),

  /**
   * Delete a post
   */
  deletePost: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [post] = await db
        .select()
        .from(socialPosts)
        .where(
          and(eq(socialPosts.id, input.postId), eq(socialPosts.userId, ctx.session.user.id))
        )
        .limit(1);

      if (!post) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
      }

      // Try to delete from platform if published
      if (post.status === 'published' && post.platformPostId) {
        try {
          const [connection] = await db
            .select()
            .from(socialConnections)
            .where(eq(socialConnections.id, post.connectionId))
            .limit(1);

          if (connection) {
            const adapter = getAdapter(post.platform as SocialPlatform);
            await adapter.deletePost(connection, post.platformPostId);
          }
        } catch {
          // Continue even if platform delete fails
        }
      }

      // Delete from database
      await db.delete(socialPosts).where(eq(socialPosts.id, input.postId));

      return { success: true };
    }),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildDefaultContent(
  listing: typeof listings.$inferSelect,
  platform: SocialPlatform
): string {
  const price = listing.price
    ? new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(Number(listing.price))
    : 'Consultar precio';

  const location = [listing.neighborhood, listing.city].filter(Boolean).join(', ');

  const features = [
    listing.bedrooms ? `${listing.bedrooms} hab.` : null,
    listing.bathrooms ? `${listing.bathrooms} baños` : null,
    listing.sizeSqm ? `${listing.sizeSqm}m²` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  switch (platform) {
    case 'instagram':
      return `🏠 ${listing.title}\n\n📍 ${location}\n💰 ${price}\n📐 ${features}\n\n${listing.aiDescription || listing.description || ''}\n\n¡Contacta para más info! Link en bio 👆`;

    case 'linkedin':
      return `Nueva oportunidad inmobiliaria en ${location}\n\n${listing.title}\n\n✓ Precio: ${price}\n✓ Características: ${features}\n\n${listing.aiDescription || listing.description || ''}\n\nContacta conmigo para más información.`;

    case 'tiktok':
      return `🏡 ${listing.title} en ${location}\n💰 ${price}\n📐 ${features}`;

    case 'facebook':
    default:
      return `🏠 ${listing.title}\n\n📍 Ubicación: ${location}\n💰 Precio: ${price}\n📐 ${features}\n\n${listing.aiDescription || listing.description || ''}\n\n¿Interesado? ¡Contáctanos!`;
  }
}

function generateHashtags(
  listing: typeof listings.$inferSelect,
  platform: SocialPlatform
): string[] {
  const baseHashtags = [
    'inmobiliaria',
    'realestate',
    listing.operationType === 'rent' ? 'alquiler' : 'venta',
    listing.propertyType?.replace('_', ''),
  ].filter(Boolean) as string[];

  const locationHashtags = [
    listing.city?.toLowerCase().replace(/\s+/g, ''),
    listing.neighborhood?.toLowerCase().replace(/\s+/g, ''),
  ].filter(Boolean) as string[];

  const featureHashtags: string[] = [];
  if (listing.hasPool) featureHashtags.push('piscinaprivada');
  if (listing.hasTerrace) featureHashtags.push('terraza');

  const allHashtags = [...baseHashtags, ...locationHashtags, ...featureHashtags];

  const maxHashtags = platform === 'instagram' ? 30 : platform === 'tiktok' ? 10 : 5;

  return allHashtags.slice(0, maxHashtags);
}
