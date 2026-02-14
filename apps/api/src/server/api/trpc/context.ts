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
 * Extract client IP from request headers
 */
function getClientIp(req: Request): string {
  // Try standard proxy headers first
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim();
  }

  // Try Cloudflare header
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Try real IP header (nginx)
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback - unknown client
  return 'unknown';
}

/**
 * Creates context for an incoming request
 */
export async function createContext(opts: FetchCreateContextFnOptions) {
  // Get session from NextAuth
  const session = await auth();

  // Extract client IP for rate limiting
  const clientIp = getClientIp(opts.req);

  return {
    db,
    session: session as Session | null,
    req: opts.req,
    clientIp,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
