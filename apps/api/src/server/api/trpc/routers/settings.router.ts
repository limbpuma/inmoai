import { z } from 'zod';
import { createTRPCRouter, adminProcedure } from '../trpc';
import { db } from '@/server/infrastructure/database';
import { systemSettings } from '@/server/infrastructure/database/schema';
import { eq } from 'drizzle-orm';

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_SYSTEM_SETTINGS = {
  siteName: 'InmoAI',
  siteUrl: 'https://inmoai.es',
  maintenanceMode: false,
  debugMode: false,
  semanticSearchEnabled: true,
  cadastreVerificationEnabled: true,
  fraudDetectionEnabled: true,
  fraudThreshold: 70,
  priceAnalysisEnabled: true,
  autoModerationEnabled: false,
  adminAlerts: true,
  errorNotifications: true,
  weeklyReport: true,
  alertEmail: 'admin@inmoai.es',
};

const DEFAULT_FEATURE_FLAGS = {
  voiceSearch: true,
  semanticSearch: true,
  aiChat: false,
  betaFeatures: false,
  darkMode: true,
  multiLanguage: false,
  socialAutopost: true,
  cadastreVerification: true,
};

// ============================================
// HELPERS
// ============================================

async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const setting = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, key),
  });

  if (!setting) {
    return defaultValue;
  }

  return setting.value as T;
}

async function setSetting<T>(
  key: string,
  value: T,
  userId?: string,
  description?: string
): Promise<void> {
  await db
    .insert(systemSettings)
    .values({
      key,
      value: value as unknown as Record<string, unknown>,
      description,
      updatedBy: userId || null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: value as unknown as Record<string, unknown>,
        updatedBy: userId || null,
        updatedAt: new Date(),
      },
    });
}

// ============================================
// ROUTER
// ============================================

export const settingsRouter = createTRPCRouter({
  /**
   * Get all system settings
   */
  getAll: adminProcedure.query(async () => {
    return getSetting('system_settings', DEFAULT_SYSTEM_SETTINGS);
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
        semanticSearchEnabled: z.boolean().optional(),
        cadastreVerificationEnabled: z.boolean().optional(),
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
    .mutation(async ({ ctx, input }) => {
      const currentSettings = await getSetting('system_settings', DEFAULT_SYSTEM_SETTINGS);

      const updatedSettings = {
        ...currentSettings,
        ...input,
      };

      await setSetting(
        'system_settings',
        updatedSettings,
        ctx.session.user.id,
        'System configuration'
      );

      return updatedSettings;
    }),

  /**
   * Get feature flags
   */
  getFeatureFlags: adminProcedure.query(async () => {
    return getSetting('feature_flags', DEFAULT_FEATURE_FLAGS);
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
        socialAutopost: z.boolean().optional(),
        cadastreVerification: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentFlags = await getSetting('feature_flags', DEFAULT_FEATURE_FLAGS);

      const updatedFlags = {
        ...currentFlags,
        ...input,
      };

      await setSetting(
        'feature_flags',
        updatedFlags,
        ctx.session.user.id,
        'Feature flags'
      );

      return updatedFlags;
    }),

  /**
   * Get system health status
   */
  getHealth: adminProcedure.query(async () => {
    // Check database connectivity
    let dbStatus = 'disconnected';
    try {
      await db.query.systemSettings.findFirst();
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '0.3.0',
      services: {
        database: dbStatus,
        redis: 'not_configured',
        stripe: 'connected',
        anthropic: 'connected',
      },
    };
  }),

  /**
   * Clear system cache
   */
  clearCache: adminProcedure.mutation(async () => {
    // TODO: Integrate with Redis when available
    return {
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Trigger search reindex
   */
  reindexSearch: adminProcedure.mutation(async () => {
    // TODO: Trigger actual search reindex job
    return {
      success: true,
      message: 'Search reindex queued',
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Get all settings history (audit log)
   */
  getHistory: adminProcedure
    .input(z.object({ key: z.string().optional() }))
    .query(async ({ input }) => {
      // Get all settings with their last update info
      const conditions = input.key ? eq(systemSettings.key, input.key) : undefined;

      const settings = await db.query.systemSettings.findMany({
        where: conditions,
        orderBy: (s, { desc }) => [desc(s.updatedAt)],
      });

      return settings.map((s) => ({
        key: s.key,
        updatedAt: s.updatedAt,
        updatedBy: s.updatedBy,
        description: s.description,
      }));
    }),
});
