import { createTRPCRouter } from '../trpc';
import { authRouter } from './auth.router';
import { billingRouter } from './billing.router';
import { searchRouter } from './search.router';
import { listingsRouter } from './listings.router';
import { adminRouter } from './admin.router';
import { usersRouter } from './users.router';

/**
 * Root router combining all sub-routers
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  billing: billingRouter,
  search: searchRouter,
  listings: listingsRouter,
  admin: adminRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
