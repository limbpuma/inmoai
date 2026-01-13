import type { inferAsyncReturnType } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { db } from '@/server/infrastructure/database';

interface Session {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'user' | 'premium' | 'agency' | 'admin';
  } | null;
  expires: string;
}

/**
 * Creates context for an incoming request
 */
export async function createContext(opts: FetchCreateContextFnOptions) {
  // TODO: Get session from NextAuth
  const session: Session | null = null;

  return {
    db,
    session,
    req: opts.req,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
