import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, adminProcedure } from '../trpc';
import { db } from '@/server/infrastructure/database';
import { users } from '@/server/infrastructure/database/schema';
import { eq, like, desc, asc, count, sql, and, or } from 'drizzle-orm';

const userRoleEnum = z.enum(['user', 'premium', 'agency', 'admin']);
const userStatusEnum = z.enum(['active', 'suspended', 'pending']);

export const usersRouter = router({
  /**
   * List users with filtering and pagination
   */
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        role: userRoleEnum.optional(),
        status: userStatusEnum.optional(),
        sortBy: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = input || {};
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions = [];

      if (search) {
        conditions.push(
          or(
            like(users.name, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        );
      }

      if (role) {
        conditions.push(eq(users.role, role));
      }

      // Note: status would need to be added to the schema
      // For now, we'll skip this filter

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(users)
        .where(whereClause);

      // Get users
      const orderByColumn = sortBy === 'createdAt' ? users.createdAt :
                           sortBy === 'name' ? users.name : users.email;
      const orderFn = sortOrder === 'desc' ? desc : asc;

      const usersList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          image: users.image,
          createdAt: users.createdAt,
          emailVerified: users.emailVerified,
        })
        .from(users)
        .where(whereClause)
        .orderBy(orderFn(orderByColumn))
        .limit(limit)
        .offset(offset);

      return {
        users: usersList,
        total: countResult?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((countResult?.count || 0) / limit),
      };
    }),

  /**
   * Get user by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          image: users.image,
          createdAt: users.createdAt,
          emailVerified: users.emailVerified,
          stripeCustomerId: users.stripeCustomerId,
          stripeSubscriptionId: users.stripeSubscriptionId,
          stripePriceId: users.stripePriceId,
          stripeCurrentPeriodEnd: users.stripeCurrentPeriodEnd,
        })
        .from(users)
        .where(eq(users.id, input.id));

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuario no encontrado',
        });
      }

      return user;
    }),

  /**
   * Update user role
   */
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: userRoleEnum,
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Prevent admin from changing their own role
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No puedes cambiar tu propio rol',
        });
      }

      const [updated] = await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId))
        .returning({ id: users.id, role: users.role });

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuario no encontrado',
        });
      }

      return updated;
    }),

  /**
   * Delete user
   */
  delete: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Prevent admin from deleting themselves
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No puedes eliminar tu propia cuenta desde aqui',
        });
      }

      const [deleted] = await db
        .delete(users)
        .where(eq(users.id, input.userId))
        .returning({ id: users.id });

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuario no encontrado',
        });
      }

      return { success: true, deletedId: deleted.id };
    }),

  /**
   * Get user stats summary
   */
  getStats: adminProcedure.query(async () => {
    const stats = await db
      .select({
        role: users.role,
        count: count(),
      })
      .from(users)
      .groupBy(users.role);

    const result = {
      total: 0,
      user: 0,
      premium: 0,
      agency: 0,
      admin: 0,
    };

    stats.forEach((stat) => {
      const role = stat.role || 'user';
      if (role in result) {
        result[role as keyof typeof result] = stat.count;
      }
      result.total += stat.count;
    });

    return result;
  }),

  /**
   * Bulk update users
   */
  bulkUpdateRole: adminProcedure
    .input(
      z.object({
        userIds: z.array(z.string()),
        role: userRoleEnum,
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Filter out current user
      const filteredIds = input.userIds.filter((id) => id !== ctx.session.user.id);

      if (filteredIds.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No hay usuarios validos para actualizar',
        });
      }

      const updated = await db
        .update(users)
        .set({ role: input.role })
        .where(sql`${users.id} IN ${filteredIds}`)
        .returning({ id: users.id });

      return {
        success: true,
        updatedCount: updated.length,
      };
    }),
});
