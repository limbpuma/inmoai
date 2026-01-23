import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { db } from '@/server/infrastructure/database';
import { users } from '@/server/infrastructure/database/schema';

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  image: z.string().url().optional(),
  preferences: z
    .object({
      defaultCity: z.string().optional(),
      priceRange: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
        })
        .optional(),
      notifications: z
        .object({
          email: z.boolean().optional(),
          push: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
});

export const authRouter = router({
  // Register new user
  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
    const { email, password, name } = input;

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Ya existe una cuenta con este email',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name,
        hashedPassword,
        role: 'user',
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });

    return {
      success: true,
      user: newUser,
    };
  }),

  // Get current user profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
      columns: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        preferences: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Usuario no encontrado',
      });
    }

    return user;
  }),

  // Update profile
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await db
        .update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.session.user.id))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
          preferences: users.preferences,
        });

      return updatedUser;
    }),

  // Change password
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      });

      if (!user || !user.hashedPassword) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No puedes cambiar la contraseña de una cuenta OAuth',
        });
      }

      const isValid = await bcrypt.compare(input.currentPassword, user.hashedPassword);

      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Contraseña actual incorrecta',
        });
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 12);

      await db
        .update(users)
        .set({
          hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  // Delete account
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await db.delete(users).where(eq(users.id, ctx.session.user.id));

    return { success: true };
  }),
});
