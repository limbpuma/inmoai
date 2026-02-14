import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/server/infrastructure/database';
import { users, accounts, sessions, verificationTokens } from '@/server/infrastructure/database/schema';
import { env } from './env';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionsTable: sessions as any,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<{ id: string; email: string; name: string | null; image: string | null; role: string | undefined } | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role ?? undefined,
        };
      },
    }),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Handle session updates
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.image = session.image;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Set default role for new users
      if (user.id) {
        await db
          .update(users)
          .set({ role: 'user' })
          .where(eq(users.id, user.id));
      }
    },
  },
});

// Type augmentation for NextAuth
declare module 'next-auth' {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: string;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: string;
  }
}
