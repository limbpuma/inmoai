import { createTRPCRouter } from '../trpc';
import { authRouter } from './auth.router';
import { billingRouter } from './billing.router';
import { searchRouter } from './search.router';
import { listingsRouter } from './listings.router';
import { adminRouter } from './admin.router';
import { usersRouter } from './users.router';
import { settingsRouter } from './settings.router';
import { aiRouter } from './ai.router';
import { marketplaceRouter } from './marketplace.router';
import { portalsRouter } from './portals.router';
import { agentsRouter } from './agents.router';

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
  settings: settingsRouter,
  ai: aiRouter,
  marketplace: marketplaceRouter,
  portals: portalsRouter,
  agents: agentsRouter,
});

export type AppRouter = typeof appRouter;
