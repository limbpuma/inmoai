import { createTRPCRouter } from '../trpc';
import { authRouter } from './auth.router';
import { searchRouter } from './search.router';
import { listingsRouter } from './listings.router';

/**
 * Root router combining all sub-routers
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  search: searchRouter,
  listings: listingsRouter,
});

export type AppRouter = typeof appRouter;
