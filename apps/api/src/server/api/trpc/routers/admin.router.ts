import { z } from 'zod';
import { createTRPCRouter, adminProcedure } from '../trpc';
import { db } from '@/server/infrastructure/database';
import {
  users,
  listings,
  activityLog,
  systemAlerts,
} from '@/server/infrastructure/database/schema';
import { count, sql, desc, eq, gte, and } from 'drizzle-orm';

export const adminRouter = createTRPCRouter({
  /**
   * Get dashboard metrics
   */
  getMetrics: adminProcedure.query(async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Total users
    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(users);

    // Users last 30 days
    const [usersLast30Result] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo));

    // Users 30-60 days ago (for comparison)
    const [usersPrevious30Result] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          gte(users.createdAt, sixtyDaysAgo),
          sql`${users.createdAt} < ${thirtyDaysAgo}`
        )
      );

    // Total listings
    const [totalListingsResult] = await db
      .select({ count: count() })
      .from(listings);

    // Active listings (assuming there's an active field or we use all)
    const activeListings = totalListingsResult?.count || 0;

    // Calculate user growth percentage
    const usersLast30 = usersLast30Result?.count || 0;
    const usersPrevious30 = usersPrevious30Result?.count || 1;
    const userGrowth = ((usersLast30 - usersPrevious30) / usersPrevious30) * 100;

    // Paid users (premium or agency role)
    const [paidUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(
        sql`${users.role} IN ('premium', 'agency')`
      );

    return {
      totalUsers: totalUsersResult?.count || 0,
      totalListings: totalListingsResult?.count || 0,
      activeListings,
      paidUsers: paidUsersResult?.count || 0,
      userGrowth: Math.round(userGrowth * 10) / 10,
      // Mock data for searches and revenue (would need separate tables)
      searchesToday: 3847,
      mrr: 8234,
    };
  }),

  /**
   * Get recent users
   */
  getRecentUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit || 10;

      const recentUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          image: users.image,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit);

      return recentUsers;
    }),

  /**
   * Get user stats by role
   */
  getUserStats: adminProcedure.query(async () => {
    const stats = await db
      .select({
        role: users.role,
        count: count(),
      })
      .from(users)
      .groupBy(users.role);

    return stats.reduce(
      (acc, stat) => {
        acc[stat.role || 'user'] = stat.count;
        return acc;
      },
      {} as Record<string, number>
    );
  }),

  /**
   * Get listings stats by city
   */
  getListingsByCity: adminProcedure.query(async () => {
    const stats = await db
      .select({
        city: listings.city,
        count: count(),
      })
      .from(listings)
      .groupBy(listings.city)
      .orderBy(desc(count()))
      .limit(10);

    return stats;
  }),

  /**
   * Get system activity log
   */
  getActivityLog: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        type: z.enum([
          'all',
          'user_registered',
          'user_login',
          'listing_created',
          'listing_updated',
          'lead_received',
          'payment_received',
          'social_post_published',
          'system_event',
        ]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit || 20;

      // Build conditions
      const conditions = [];
      if (input?.type && input.type !== 'all') {
        conditions.push(eq(activityLog.type, input.type));
      }

      const activities = await db.query.activityLog.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: (log, { desc }) => [desc(log.createdAt)],
        limit,
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return activities.map((a) => ({
        id: a.id,
        type: a.type,
        message: a.message,
        details: a.details,
        metadata: a.metadata,
        userId: a.userId,
        userName: a.user?.name || null,
        timestamp: a.createdAt.toISOString(),
      }));
    }),

  /**
   * Get system alerts
   */
  getAlerts: adminProcedure
    .input(
      z.object({
        resolved: z.boolean().optional(),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        limit: z.number().min(1).max(100).default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input?.resolved !== undefined) {
        conditions.push(eq(systemAlerts.resolved, input.resolved));
      }

      if (input?.severity) {
        conditions.push(eq(systemAlerts.severity, input.severity));
      }

      const alerts = await db.query.systemAlerts.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: (alert, { desc }) => [desc(alert.createdAt)],
        limit: input?.limit || 20,
      });

      return alerts.map((a) => ({
        id: a.id,
        severity: a.severity,
        message: a.message,
        details: a.details,
        createdAt: a.createdAt.toISOString(),
        resolved: a.resolved,
        resolvedAt: a.resolvedAt?.toISOString() || null,
      }));
    }),

  /**
   * Resolve an alert
   */
  resolveAlert: adminProcedure
    .input(z.object({ alertId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(systemAlerts)
        .set({
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: ctx.session.user.id,
        })
        .where(eq(systemAlerts.id, input.alertId));

      return { success: true, alertId: input.alertId };
    }),

  /**
   * Create a new alert (for system use)
   */
  createAlert: adminProcedure
    .input(
      z.object({
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        message: z.string().min(1).max(500),
        details: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [alert] = await db
        .insert(systemAlerts)
        .values({
          severity: input.severity,
          message: input.message,
          details: input.details || null,
          metadata: input.metadata || null,
        })
        .returning({ id: systemAlerts.id });

      return { success: true, alertId: alert.id };
    }),

  /**
   * Log an activity (for system use)
   */
  logActivity: adminProcedure
    .input(
      z.object({
        type: z.enum([
          'user_registered',
          'user_login',
          'listing_created',
          'listing_updated',
          'listing_deleted',
          'lead_received',
          'payment_received',
          'subscription_started',
          'subscription_cancelled',
          'social_post_published',
          'cadastre_verified',
          'system_event',
        ]),
        message: z.string().min(1).max(500),
        details: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
        listingId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [entry] = await db
        .insert(activityLog)
        .values({
          type: input.type,
          message: input.message,
          details: input.details || null,
          metadata: input.metadata || null,
          userId: ctx.session.user.id,
          listingId: input.listingId || null,
          leadId: input.leadId || null,
        })
        .returning({ id: activityLog.id });

      return { success: true, activityId: entry.id };
    }),
});
