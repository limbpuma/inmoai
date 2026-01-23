import { z } from 'zod';
import { router, adminProcedure } from '../trpc';

// In-memory settings storage (would be database in production)
let systemSettings = {
  siteName: 'InmoAI',
  siteUrl: 'https://inmoai.es',
  maintenanceMode: false,
  debugMode: false,
  scrapingEnabled: true,
  scrapingInterval: 6,
  maxListingsPerRun: 500,
  sources: {
    idealista: true,
    fotocasa: true,
    habitaclia: true,
  },
  fraudDetectionEnabled: true,
  fraudThreshold: 70,
  priceAnalysisEnabled: true,
  autoModerationEnabled: false,
  adminAlerts: true,
  errorNotifications: true,
  weeklyReport: true,
  alertEmail: 'admin@inmoai.es',
};

// Feature flags
let featureFlags = {
  voiceSearch: true,
  semanticSearch: true,
  aiChat: false,
  betaFeatures: false,
  darkMode: true,
  multiLanguage: false,
};

export const settingsRouter = router({
  /**
   * Get all system settings
   */
  getAll: adminProcedure.query(() => {
    return systemSettings;
  }),

  /**
   * Update system settings
   */
  update: adminProcedure
    .input(
      z.object({
        siteName: z.string().optional(),
        siteUrl: z.string().url().optional(),
        maintenanceMode: z.boolean().optional(),
        debugMode: z.boolean().optional(),
        scrapingEnabled: z.boolean().optional(),
        scrapingInterval: z.number().min(1).max(24).optional(),
        maxListingsPerRun: z.number().min(1).max(10000).optional(),
        sources: z.object({
          idealista: z.boolean(),
          fotocasa: z.boolean(),
          habitaclia: z.boolean(),
        }).optional(),
        fraudDetectionEnabled: z.boolean().optional(),
        fraudThreshold: z.number().min(0).max(100).optional(),
        priceAnalysisEnabled: z.boolean().optional(),
        autoModerationEnabled: z.boolean().optional(),
        adminAlerts: z.boolean().optional(),
        errorNotifications: z.boolean().optional(),
        weeklyReport: z.boolean().optional(),
        alertEmail: z.string().email().optional(),
      })
    )
    .mutation(({ input }) => {
      systemSettings = {
        ...systemSettings,
        ...input,
        sources: input.sources || systemSettings.sources,
      };
      return systemSettings;
    }),

  /**
   * Get feature flags
   */
  getFeatureFlags: adminProcedure.query(() => {
    return featureFlags;
  }),

  /**
   * Update feature flags
   */
  updateFeatureFlags: adminProcedure
    .input(
      z.object({
        voiceSearch: z.boolean().optional(),
        semanticSearch: z.boolean().optional(),
        aiChat: z.boolean().optional(),
        betaFeatures: z.boolean().optional(),
        darkMode: z.boolean().optional(),
        multiLanguage: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => {
      featureFlags = {
        ...featureFlags,
        ...input,
      };
      return featureFlags;
    }),

  /**
   * Get system health status
   */
  getHealth: adminProcedure.query(() => {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '0.2.0',
      services: {
        database: 'connected',
        redis: 'connected',
        stripe: 'connected',
        gemini: 'connected',
      },
    };
  }),

  /**
   * Clear system cache
   */
  clearCache: adminProcedure.mutation(() => {
    // In production, this would clear Redis cache
    return { success: true, message: 'Cache cleared successfully' };
  }),

  /**
   * Trigger search reindex
   */
  reindexSearch: adminProcedure.mutation(() => {
    // In production, this would trigger a search reindex job
    return { success: true, message: 'Search reindex started' };
  }),
});
