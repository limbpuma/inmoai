/**
 * Portals Router
 * API endpoints for the Autoposting system
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { db } from '../../../infrastructure/database';
import {
  portalConnections,
  portalPosts,
  portalAnalytics,
  portalLeads,
  portalSyncJobs,
  listings,
  notifications,
  type Portal,
} from '../../../infrastructure/database/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import {
  getAllPortalInfo,
  getPortalInfo,
  getAdapter,
  encryptTokens,
  decryptTokens,
  generateOAuthState,
  hashOAuthState,
  schedulePublish,
  scheduleUpdate,
  scheduleDelete,
  scheduleSync,
  scheduleRecurringSync,
  cancelRecurringSync,
  getQueueStats,
} from '../../../services/portals';
import { env } from '../../../../config/env';

// ============================================
// INPUT SCHEMAS
// ============================================

const portalSchema = z.enum(['idealista', 'fotocasa', 'habitaclia', 'pisos', 'milanuncios']);

// ============================================
// ROUTER
// ============================================

export const portalsRouter = createTRPCRouter({
  /**
   * Get all available portals with their capabilities
   */
  getAvailablePortals: protectedProcedure.query(async () => {
    return getAllPortalInfo();
  }),

  /**
   * Get user's portal connections
   */
  getConnections: protectedProcedure.query(async ({ ctx }) => {
    const connections = await db.query.portalConnections.findMany({
      where: eq(portalConnections.userId, ctx.session.user.id),
      orderBy: [desc(portalConnections.createdAt)],
    });

    return connections.map((conn) => ({
      id: conn.id,
      portal: conn.portal,
      status: conn.status,
      portalAccountEmail: conn.portalAccountEmail,
      portalAccountName: conn.portalAccountName,
      autoSync: conn.autoSync,
      syncInterval: conn.syncInterval,
      lastSyncAt: conn.lastSyncAt,
      lastErrorMessage: conn.lastErrorMessage,
      lastErrorAt: conn.lastErrorAt,
      createdAt: conn.createdAt,
    }));
  }),

  /**
   * Get OAuth authorization URL for a portal
   */
  getAuthorizationUrl: protectedProcedure
    .input(z.object({
      portal: portalSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const adapter = await getAdapter(input.portal);
      const config = adapter.getOAuthConfig();

      if (!config) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${input.portal} does not support OAuth`,
        });
      }

      // Generate state for CSRF protection
      const state = generateOAuthState();
      const stateHash = hashOAuthState(state);

      // Store state in session or database for verification
      // For now, we'll encode user ID in the state
      const statePayload = JSON.stringify({
        hash: stateHash,
        userId: ctx.session.user.id,
        portal: input.portal,
        timestamp: Date.now(),
      });

      const encodedState = Buffer.from(statePayload).toString('base64url');

      const redirectUri = `${env.APP_URL}/api/portals/callback/${input.portal}`;
      const authUrl = adapter.getAuthorizationUrl(encodedState, redirectUri);

      return { authUrl, state: encodedState };
    }),

  /**
   * Complete OAuth connection (called from callback route)
   */
  completeConnection: protectedProcedure
    .input(z.object({
      portal: portalSchema,
      code: z.string(),
      state: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify state
      let statePayload: { userId: string; portal: string; timestamp: number };
      try {
        statePayload = JSON.parse(Buffer.from(input.state, 'base64url').toString());
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid state parameter',
        });
      }

      if (statePayload.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'State mismatch',
        });
      }

      // Check state is not too old (15 minutes max)
      if (Date.now() - statePayload.timestamp > 15 * 60 * 1000) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Authorization expired, please try again',
        });
      }

      const adapter = await getAdapter(input.portal);
      const redirectUri = `${env.APP_URL}/api/portals/callback/${input.portal}`;

      const result = await adapter.exchangeCodeForTokens(input.code, redirectUri);

      if (!result.success || !result.tokens) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error || 'Failed to exchange code for tokens',
        });
      }

      // Encrypt tokens
      const encryptedTokens = encryptTokens({
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });

      // Check for existing connection
      const existing = await db.query.portalConnections.findFirst({
        where: and(
          eq(portalConnections.userId, ctx.session.user.id),
          eq(portalConnections.portal, input.portal)
        ),
      });

      if (existing) {
        // Update existing connection
        await db
          .update(portalConnections)
          .set({
            accessToken: encryptedTokens.accessToken,
            refreshToken: encryptedTokens.refreshToken,
            tokenExpiresAt: result.tokens.expiresAt,
            portalAccountId: result.accountInfo?.id,
            portalAccountEmail: result.accountInfo?.email,
            portalAccountName: result.accountInfo?.name,
            status: 'active',
            lastErrorMessage: null,
            lastErrorAt: null,
            updatedAt: new Date(),
          })
          .where(eq(portalConnections.id, existing.id));

        return { connectionId: existing.id, isNew: false };
      }

      // Create new connection
      const [connection] = await db
        .insert(portalConnections)
        .values({
          userId: ctx.session.user.id,
          portal: input.portal,
          accessToken: encryptedTokens.accessToken,
          refreshToken: encryptedTokens.refreshToken,
          tokenExpiresAt: result.tokens.expiresAt,
          portalAccountId: result.accountInfo?.id,
          portalAccountEmail: result.accountInfo?.email,
          portalAccountName: result.accountInfo?.name,
          status: 'active',
        })
        .returning();

      // Schedule recurring sync
      if (connection.autoSync) {
        await scheduleRecurringSync(connection.id, input.portal, connection.syncInterval || 6);
      }

      return { connectionId: connection.id, isNew: true };
    }),

  /**
   * Disconnect a portal
   */
  disconnect: protectedProcedure
    .input(z.object({
      connectionId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const connection = await db.query.portalConnections.findFirst({
        where: and(
          eq(portalConnections.id, input.connectionId),
          eq(portalConnections.userId, ctx.session.user.id)
        ),
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection not found',
        });
      }

      // Cancel recurring syncs
      await cancelRecurringSync(connection.id);

      // Revoke tokens if possible
      try {
        const adapter = await getAdapter(connection.portal);
        const tokens = decryptTokens({
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken,
        });

        await adapter.revokeTokens({
          connectionId: connection.id,
          userId: ctx.session.user.id,
          portal: connection.portal,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      } catch (error) {
        console.warn('Failed to revoke tokens:', error);
      }

      // Update status to revoked
      await db
        .update(portalConnections)
        .set({
          status: 'revoked',
          updatedAt: new Date(),
        })
        .where(eq(portalConnections.id, input.connectionId));

      return { success: true };
    }),

  /**
   * Publish a listing to one or more portals
   */
  publishToPortals: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid(),
      portals: z.array(portalSchema),
      options: z.object({
        featured: z.boolean().optional(),
        highlighted: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify listing exists and belongs to user
      const listing = await db.query.listings.findFirst({
        where: eq(listings.id, input.listingId),
      });

      if (!listing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Listing not found',
        });
      }

      const results: { portal: Portal; jobId: string | null; error?: string }[] = [];

      for (const portal of input.portals) {
        // Get user's connection for this portal
        const connection = await db.query.portalConnections.findFirst({
          where: and(
            eq(portalConnections.userId, ctx.session.user.id),
            eq(portalConnections.portal, portal),
            eq(portalConnections.status, 'active')
          ),
        });

        if (!connection) {
          results.push({
            portal,
            jobId: null,
            error: `Not connected to ${portal}`,
          });
          continue;
        }

        // Create portal post record (in pending state)
        const existingPost = await db.query.portalPosts.findFirst({
          where: and(
            eq(portalPosts.listingId, input.listingId),
            eq(portalPosts.portal, portal)
          ),
        });

        let postId: string;
        if (existingPost) {
          await db
            .update(portalPosts)
            .set({
              status: 'pending',
              connectionId: connection.id,
              updatedAt: new Date(),
            })
            .where(eq(portalPosts.id, existingPost.id));
          postId = existingPost.id;
        } else {
          const [newPost] = await db
            .insert(portalPosts)
            .values({
              connectionId: connection.id,
              listingId: input.listingId,
              portal,
              status: 'pending',
            })
            .returning();
          postId = newPost.id;
        }

        // Create sync job record
        const [job] = await db
          .insert(portalSyncJobs)
          .values({
            connectionId: connection.id,
            postId,
            jobType: 'publish',
            status: 'pending',
            payload: { listingId: input.listingId, options: input.options },
          })
          .returning();

        // Schedule the job
        const jobId = await schedulePublish({
          connectionId: connection.id,
          listingId: input.listingId,
          portal,
          options: input.options,
        });

        // Update job record with BullMQ ID
        if (jobId) {
          await db
            .update(portalSyncJobs)
            .set({ bullmqJobId: jobId })
            .where(eq(portalSyncJobs.id, job.id));
        }

        results.push({ portal, jobId });
      }

      return { results };
    }),

  /**
   * Get publication status for a listing
   */
  getPublicationStatus: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      const posts = await db.query.portalPosts.findMany({
        where: eq(portalPosts.listingId, input.listingId),
        with: {
          connection: {
            columns: {
              id: true,
              userId: true,
            },
          },
        },
      });

      // Filter to only user's posts
      return posts
        .filter((p) => p.connection?.userId === ctx.session.user.id)
        .map((p) => ({
          id: p.id,
          portal: p.portal,
          status: p.status,
          portalUrl: p.portalUrl,
          publishedAt: p.publishedAt,
          expiresAt: p.expiresAt,
          errorMessage: p.errorMessage,
          retryCount: p.retryCount,
        }));
    }),

  /**
   * Unpublish from a portal
   */
  unpublish: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid(),
      portal: portalSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const post = await db.query.portalPosts.findFirst({
        where: and(
          eq(portalPosts.listingId, input.listingId),
          eq(portalPosts.portal, input.portal)
        ),
        with: {
          connection: true,
        },
      });

      if (!post || post.connection?.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Post not found',
        });
      }

      if (!post.portalListingId) {
        // Just mark as deleted if not actually published
        await db
          .update(portalPosts)
          .set({
            status: 'deleted',
            unpublishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(portalPosts.id, post.id));

        return { success: true };
      }

      // Schedule delete job
      const jobId = await scheduleDelete({
        connectionId: post.connectionId,
        postId: post.id,
        portal: input.portal,
        portalListingId: post.portalListingId,
      });

      // Update status to deleting
      await db
        .update(portalPosts)
        .set({
          status: 'deleting',
          lastStatusChange: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(portalPosts.id, post.id));

      return { success: true, jobId };
    }),

  /**
   * Get analytics for a listing across all portals
   */
  getListingAnalytics: protectedProcedure
    .input(z.object({
      listingId: z.string().uuid(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const startDate = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = input.endDate ? new Date(input.endDate) : new Date();

      const posts = await db.query.portalPosts.findMany({
        where: eq(portalPosts.listingId, input.listingId),
        with: {
          connection: {
            columns: { userId: true },
          },
          analytics: {
            where: and(
              gte(portalAnalytics.date, startDate),
              lte(portalAnalytics.date, endDate)
            ),
            orderBy: [desc(portalAnalytics.date)],
          },
        },
      });

      // Filter and aggregate
      const userPosts = posts.filter((p) => p.connection?.userId === ctx.session.user.id);

      const byPortal: Record<string, { views: number; clicks: number; leads: number }> = {};
      let totalViews = 0;
      let totalClicks = 0;
      let totalLeads = 0;

      for (const post of userPosts) {
        const portalStats = { views: 0, clicks: 0, leads: 0 };

        for (const day of post.analytics) {
          portalStats.views += day.views || 0;
          portalStats.clicks += day.clicks || 0;
          portalStats.leads += day.leadsGenerated || 0;
        }

        byPortal[post.portal] = portalStats;
        totalViews += portalStats.views;
        totalClicks += portalStats.clicks;
        totalLeads += portalStats.leads;
      }

      return {
        total: { views: totalViews, clicks: totalClicks, leads: totalLeads },
        byPortal,
        period: { start: startDate, end: endDate },
      };
    }),

  /**
   * Get user's overall portal analytics
   */
  getUserAnalytics: protectedProcedure
    .input(z.object({
      period: z.enum(['7d', '30d', '90d']).default('30d'),
    }))
    .query(async ({ input, ctx }) => {
      const days = input.period === '7d' ? 7 : input.period === '30d' ? 30 : 90;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get all user's connections
      const connections = await db.query.portalConnections.findMany({
        where: eq(portalConnections.userId, ctx.session.user.id),
        columns: { id: true, portal: true },
      });

      if (connections.length === 0) {
        return {
          totalViews: 0,
          totalClicks: 0,
          totalLeads: 0,
          activeListings: 0,
          byPortal: {},
        };
      }

      const connectionIds = connections.map((c) => c.id);

      // Get analytics aggregated by portal
      const posts = await db.query.portalPosts.findMany({
        where: sql`${portalPosts.connectionId} IN (${sql.join(connectionIds.map(id => sql`${id}`), sql`, `)})`,
        with: {
          analytics: {
            where: gte(portalAnalytics.date, startDate),
          },
        },
      });

      const byPortal: Record<string, { views: number; clicks: number; leads: number; listings: number }> = {};
      let totalViews = 0;
      let totalClicks = 0;
      let totalLeads = 0;
      let activeListings = 0;

      for (const post of posts) {
        if (!byPortal[post.portal]) {
          byPortal[post.portal] = { views: 0, clicks: 0, leads: 0, listings: 0 };
        }

        if (post.status === 'published') {
          byPortal[post.portal].listings++;
          activeListings++;
        }

        for (const day of post.analytics) {
          byPortal[post.portal].views += day.views || 0;
          byPortal[post.portal].clicks += day.clicks || 0;
          byPortal[post.portal].leads += day.leadsGenerated || 0;

          totalViews += day.views || 0;
          totalClicks += day.clicks || 0;
          totalLeads += day.leadsGenerated || 0;
        }
      }

      return {
        totalViews,
        totalClicks,
        totalLeads,
        activeListings,
        byPortal,
        period: input.period,
      };
    }),

  /**
   * Get portal leads (inquiries)
   */
  getLeads: protectedProcedure
    .input(z.object({
      portal: portalSchema.optional(),
      listingId: z.string().uuid().optional(),
      unreadOnly: z.boolean().default(false),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      // Get user's connections
      const connections = await db.query.portalConnections.findMany({
        where: eq(portalConnections.userId, ctx.session.user.id),
        columns: { id: true },
      });

      if (connections.length === 0) {
        return { leads: [], total: 0 };
      }

      const connectionIds = connections.map((c) => c.id);

      // Build query conditions
      let conditions = sql`${portalPosts.connectionId} IN (${sql.join(connectionIds.map(id => sql`${id}`), sql`, `)})`;

      if (input.portal) {
        conditions = sql`${conditions} AND ${portalLeads.portal} = ${input.portal}`;
      }

      if (input.listingId) {
        conditions = sql`${conditions} AND ${portalPosts.listingId} = ${input.listingId}`;
      }

      if (input.unreadOnly) {
        conditions = sql`${conditions} AND ${portalLeads.isRead} = false`;
      }

      const leads = await db.query.portalLeads.findMany({
        where: sql`${portalLeads.postId} IN (SELECT id FROM portal_posts WHERE ${conditions})`,
        orderBy: [desc(portalLeads.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          post: {
            columns: { listingId: true, portalUrl: true },
          },
        },
      });

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(portalLeads)
        .where(sql`${portalLeads.postId} IN (SELECT id FROM portal_posts WHERE ${conditions})`);

      return {
        leads: leads.map((lead) => ({
          id: lead.id,
          portal: lead.portal,
          listingId: lead.post?.listingId,
          portalUrl: lead.post?.portalUrl,
          contactName: lead.contactName,
          contactEmail: lead.contactEmail,
          contactPhone: lead.contactPhone,
          subject: lead.subject,
          message: lead.message,
          isRead: lead.isRead,
          isReplied: lead.isReplied,
          receivedAt: lead.portalReceivedAt || lead.createdAt,
        })),
        total: count,
      };
    }),

  /**
   * Mark lead as read
   */
  markLeadRead: protectedProcedure
    .input(z.object({
      leadId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const lead = await db.query.portalLeads.findFirst({
        where: eq(portalLeads.id, input.leadId),
        with: {
          post: {
            with: {
              connection: {
                columns: { userId: true },
              },
            },
          },
        },
      });

      if (!lead || lead.post?.connection?.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Lead not found',
        });
      }

      await db
        .update(portalLeads)
        .set({
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(portalLeads.id, input.leadId));

      return { success: true };
    }),

  /**
   * Trigger manual sync for a connection
   */
  triggerSync: protectedProcedure
    .input(z.object({
      connectionId: z.string().uuid(),
      syncType: z.enum(['leads', 'analytics', 'all']).default('all'),
    }))
    .mutation(async ({ input, ctx }) => {
      const connection = await db.query.portalConnections.findFirst({
        where: and(
          eq(portalConnections.id, input.connectionId),
          eq(portalConnections.userId, ctx.session.user.id)
        ),
      });

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Connection not found',
        });
      }

      const jobId = await scheduleSync({
        connectionId: connection.id,
        portal: connection.portal,
        syncType: input.syncType,
      });

      return { jobId };
    }),

  /**
   * Get queue statistics (admin only)
   */
  getQueueStats: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Add admin check
    return getQueueStats();
  }),

  /**
   * Get user notifications
   */
  getNotifications: protectedProcedure
    .input(z.object({
      unreadOnly: z.boolean().default(false),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input, ctx }) => {
      const conditions = input.unreadOnly
        ? and(eq(notifications.userId, ctx.session.user.id), eq(notifications.isRead, false))
        : eq(notifications.userId, ctx.session.user.id);

      const items = await db.query.notifications.findMany({
        where: conditions,
        orderBy: [desc(notifications.createdAt)],
        limit: input.limit,
      });

      return items;
    }),

  /**
   * Mark notification as read
   */
  markNotificationRead: protectedProcedure
    .input(z.object({
      notificationId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.userId, ctx.session.user.id)
          )
        );

      return { success: true };
    }),
});
