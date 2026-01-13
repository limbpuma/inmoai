import { createTRPCRouter } from '../trpc';
import { searchRouter } from './search.router';
import { listingsRouter } from './listings.router';

/**
 * Root router combining all sub-routers
 */
export const appRouter = createTRPCRouter({
  search: searchRouter,
  listings: listingsRouter,
});

export type AppRouter = typeof appRouter;
