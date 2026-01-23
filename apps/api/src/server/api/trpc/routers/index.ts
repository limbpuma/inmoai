import { createTRPCRouter } from '../trpc';
import { authRouter } from './auth.router';
import { billingRouter } from './billing.router';
import { searchRouter } from './search.router';
import { listingsRouter } from './listings.router';
import { adminRouter } from './admin.router';

/**
 * Root router combining all sub-routers
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  billing: billingRouter,
  search: searchRouter,
  listings: listingsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
