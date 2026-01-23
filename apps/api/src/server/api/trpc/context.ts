import type { inferAsyncReturnType } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { auth } from '@/config/auth';
import { db } from '@/server/infrastructure/database';

export interface Session {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: 'user' | 'premium' | 'agency' | 'admin';
  };
  expires: string;
}

/**
 * Creates context for an incoming request
 */
export async function createContext(opts: FetchCreateContextFnOptions) {
  // Get session from NextAuth
  const session = await auth();

  return {
    db,
    session: session as Session | null,
    req: opts.req,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
