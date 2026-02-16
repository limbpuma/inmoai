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
import { agentsRouter } from './agents.router';
import { escrowRouter } from './escrow.router';
import { cadastreRouter } from './cadastre.router';
import { socialRouter } from './social.router';
import { contentRouter } from './content.router';
import { onboardingRouter } from './onboarding.router';

/**
 * Root router combining all sub-routers
 *
 * KEY DIFFERENTIATORS (what makes InmoAI indispensable):
 * - cadastre: Official Spanish property registry integration
 * - escrow: Regulated transaction trust layer
 * - marketplace: Verified service provider network
 * - agents: AI orchestration for external agents
 * - social: Autoposting to social media (Facebook, Instagram, LinkedIn, TikTok)
 * - content: AI-powered content generation
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
  agents: agentsRouter,
  escrow: escrowRouter,
  cadastre: cadastreRouter,
  social: socialRouter,
  content: contentRouter,
  onboarding: onboardingRouter,
});

export type AppRouter = typeof appRouter;
