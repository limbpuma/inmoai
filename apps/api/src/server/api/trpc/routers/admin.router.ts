import { z } from 'zod';
import { router, adminProcedure } from '../trpc';
import { db } from '@/server/infrastructure/database';
import { users, listings } from '@/server/infrastructure/database/schema';
import { count, sql, desc, eq, gte, and } from 'drizzle-orm';

export const adminRouter = router({
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
        type: z.enum(['all', 'user', 'listing', 'payment', 'system']).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      // In a real implementation, this would query an activity_logs table
      // For now, return mock data
      const mockActivity = [
        {
          id: '1',
          type: 'user',
          message: 'Nuevo usuario registrado',
          details: 'juan@example.com',
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'listing',
          message: '45 nuevos listings importados',
          details: 'Source: Idealista',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '3',
          type: 'payment',
          message: 'Nueva suscripcion Pro',
          details: 'maria@example.com',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: '4',
          type: 'system',
          message: 'Scraping completado',
          details: 'Fotocasa: 234 listings',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
        },
      ];

      if (input?.type && input.type !== 'all') {
        return mockActivity.filter((a) => a.type === input.type);
      }

      return mockActivity;
    }),

  /**
   * Get system alerts
   */
  getAlerts: adminProcedure.query(async () => {
    // In a real implementation, this would query an alerts table
    // For now, return mock data
    return [
      {
        id: '1',
        severity: 'high' as const,
        message: '3 listings con score de fraude > 90%',
        createdAt: new Date().toISOString(),
        resolved: false,
      },
      {
        id: '2',
        severity: 'medium' as const,
        message: 'Scraping de Fotocasa fallo 2 veces',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        resolved: false,
      },
      {
        id: '3',
        severity: 'low' as const,
        message: '5 usuarios con sesion expirada',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        resolved: false,
      },
    ];
  }),

  /**
   * Resolve an alert
   */
  resolveAlert: adminProcedure
    .input(z.object({ alertId: z.string() }))
    .mutation(async ({ input }) => {
      // In a real implementation, this would update the alert in the database
      return { success: true, alertId: input.alertId };
    }),
});
