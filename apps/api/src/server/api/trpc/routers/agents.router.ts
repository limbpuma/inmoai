/**
 * Agents Router - API Gateway for AI Agents
 * Exposes agent capabilities for both web UI and B2B API consumption
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import { orchestrator, agentRegistry, type AgentRequest } from '@/server/services/agents';
import { db } from '@/server/infrastructure/database';
import { agentSessions, agentTransactions, agentApiKeys, agentUsage } from '@/server/infrastructure/database/schema';
import { eq, desc, and, gte, count, sum, sql } from 'drizzle-orm';

// Input schemas
const agentTypeSchema = z.enum([
  'search', 'verify', 'negotiate', 'service_match',
  'valuation', 'alert', 'publish', 'transaction'
]);

const chatMessageSchema = z.object({
  sessionToken: z.string().optional(),
  agentType: agentTypeSchema.optional(),
  message: z.string().min(1).max(4000),
  context: z.object({
    listingId: z.string().uuid().optional(),
    searchCriteria: z.record(z.unknown()).optional(),
    providerId: z.string().uuid().optional(),
    intent: z.string().optional(),
    referrer: z.string().optional(),
    locale: z.string().optional(),
  }).optional(),
  metadata: z.object({
    userAgent: z.string().optional(),
    deviceType: z.enum(['mobile', 'desktop', 'tablet']).optional(),
    source: z.enum(['web', 'api', 'widget', 'mobile_app']).optional(),
  }).optional(),
});

const b2bRequestSchema = z.object({
  agentType: agentTypeSchema,
  operation: z.string(),
  params: z.record(z.unknown()),
  webhookUrl: z.string().url().optional(),
});

export const agentsRouter = createTRPCRouter({
  // ============================================
  // AGENT DISCOVERY
  // ============================================

  /**
   * List available agents and their capabilities
   */
  listAgents: publicProcedure.query(async () => {
    const capabilities = agentRegistry.getCapabilities();

    return {
      agents: capabilities.map((agent) => ({
        type: agent.type,
        name: agent.name,
        description: agent.description,
        capabilities: agent.capabilities,
        pricing: {
          sessionCost: agent.pricing.sessionCost,
          outcomeCost: agent.pricing.outcomeCost,
          transactionFeePercent: agent.pricing.transactionFeePercent,
        },
        available: agentRegistry.isAvailable(agent.type),
      })),
    };
  }),

  /**
   * Get specific agent configuration
   */
  getAgent: publicProcedure
    .input(z.object({ type: agentTypeSchema }))
    .query(async ({ input }) => {
      const config = agentRegistry.getConfig(input.type);

      if (!config) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Agent type '${input.type}' not found`,
        });
      }

      return {
        type: config.type,
        name: config.name,
        description: config.description,
        capabilities: config.capabilities,
        pricing: config.pricing,
        limits: config.limits,
        available: agentRegistry.isAvailable(input.type),
      };
    }),

  // ============================================
  // CHAT (Web UI)
  // ============================================

  /**
   * Send a message to an agent (creates or continues session)
   */
  chat: publicProcedure
    .input(chatMessageSchema)
    .mutation(async ({ input, ctx }) => {
      const { sessionToken, agentType, message, context, metadata } = input;

      // Validate that we have either sessionToken or agentType
      if (!sessionToken && !agentType) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Either sessionToken or agentType must be provided',
        });
      }

      // Check if agent type is available
      if (agentType && !agentRegistry.isAvailable(agentType)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Agent type '${agentType}' is not available`,
        });
      }

      try {
        const request: AgentRequest = {
          sessionToken,
          agentType,
          message,
          context,
          metadata,
        };

        const response = await orchestrator.processRequest(
          request,
          ctx.session?.user?.id
        );

        return {
          sessionToken: response.sessionToken,
          status: response.status,
          message: response.message,
          data: response.data,
          suggestions: response.suggestions,
          usage: {
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
          },
        };
      } catch (error) {
        console.error('[AgentsRouter] Chat error:', error);

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Agent processing failed',
        });
      }
    }),

  /**
   * End an active session
   */
  endSession: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      reason: z.enum(['completed', 'abandoned']).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        await orchestrator.endSession(input.sessionToken, input.reason || 'completed');
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found or already ended',
        });
      }
    }),

  /**
   * Get session details
   */
  getSession: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const session = await orchestrator.getSession(input.sessionToken);

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      return {
        id: session.id,
        agentType: session.agentType,
        status: session.status,
        startedAt: session.startedAt,
        lastActivityAt: session.lastActivityAt,
        outcomesGenerated: session.outcomesGenerated,
        totalTokensUsed: session.totalTokensUsed,
        conversationLength: (session.conversationHistory as unknown[])?.length ?? 0,
      };
    }),

  // ============================================
  // B2B API
  // ============================================

  /**
   * B2B API endpoint - requires API key in header
   */
  b2bRequest: publicProcedure
    .input(b2bRequestSchema)
    .mutation(async ({ input, ctx }) => {
      // Extract API key from header
      const headers = ctx.req?.headers;
      const apiKey = (headers && typeof headers.get === 'function'
        ? headers.get('x-api-key')
        : (headers as unknown as Record<string, string>)?.['x-api-key']) as string | undefined;

      if (!apiKey) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'API key required. Include X-API-Key header.',
        });
      }

      const response = await orchestrator.processB2BRequest({
        apiKey,
        agentType: input.agentType,
        operation: input.operation,
        params: input.params,
        webhookUrl: input.webhookUrl,
      });

      if (response.status === 'error') {
        throw new TRPCError({
          code: response.error?.code === 'INVALID_API_KEY' ? 'UNAUTHORIZED' :
                response.error?.code === 'RATE_LIMIT_EXCEEDED' ? 'TOO_MANY_REQUESTS' :
                'INTERNAL_SERVER_ERROR',
          message: response.error?.message ?? 'Request failed',
        });
      }

      return response;
    }),

  // ============================================
  // API KEY MANAGEMENT
  // ============================================

  /**
   * List user's API keys
   */
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const keys = await db.query.agentApiKeys.findMany({
      where: eq(agentApiKeys.userId, ctx.session.user.id),
      orderBy: [desc(agentApiKeys.createdAt)],
    });

    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      tier: key.tier,
      allowedAgents: key.allowedAgents,
      rateLimit: key.rateLimit,
      monthlyCredits: key.monthlyCredits,
      usedCreditsThisMonth: key.usedCreditsThisMonth,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
    }));
  }),

  /**
   * Create a new API key
   */
  createApiKey: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      allowedAgents: z.array(agentTypeSchema).optional(),
      scopes: z.array(z.string()).optional(),
      tier: z.enum(['developer', 'business', 'enterprise']).optional(),
      webhookUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { randomBytes, createHash } = await import('crypto');

      // Generate key
      const keyId = randomBytes(16).toString('hex');
      const keySecret = randomBytes(32).toString('hex');
      const fullKey = `inmo_agent_${keyId}${keySecret}`;
      const keyPrefix = `inmo_agent_${keyId}`;
      const keyHash = createHash('sha256').update(fullKey).digest('hex');

      const [apiKey] = await db
        .insert(agentApiKeys)
        .values({
          userId: ctx.session.user.id,
          name: input.name,
          keyPrefix,
          keyHash,
          allowedAgents: input.allowedAgents ?? [],
          scopes: input.scopes ?? [],
          tier: input.tier ?? 'developer',
          webhookUrl: input.webhookUrl,
          monthlyCredits: input.tier === 'enterprise' ? 1000000 :
                          input.tier === 'business' ? 100000 : 10000,
        })
        .returning();

      return {
        id: apiKey.id,
        name: apiKey.name,
        // Only return full key once on creation
        key: fullKey,
        keyPrefix: apiKey.keyPrefix,
        tier: apiKey.tier,
        monthlyCredits: apiKey.monthlyCredits,
        createdAt: apiKey.createdAt,
      };
    }),

  /**
   * Revoke an API key
   */
  revokeApiKey: protectedProcedure
    .input(z.object({ keyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const result = await db
        .update(agentApiKeys)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(agentApiKeys.id, input.keyId),
            eq(agentApiKeys.userId, ctx.session.user.id)
          )
        )
        .returning();

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        });
      }

      return { success: true };
    }),

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Get user's agent usage analytics
   */
  getAnalytics: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).optional().default(30),
    }))
    .query(async ({ input, ctx }) => {
      const analytics = await orchestrator.getUserAnalytics(
        ctx.session.user.id,
        input.days
      );

      return analytics;
    }),

  /**
   * Get session history
   */
  getSessionHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional().default(20),
      agentType: agentTypeSchema.optional(),
    }))
    .query(async ({ input, ctx }) => {
      const conditions = [eq(agentSessions.userId, ctx.session.user.id)];

      if (input.agentType) {
        conditions.push(eq(agentSessions.agentType, input.agentType));
      }

      const sessions = await db.query.agentSessions.findMany({
        where: and(...conditions),
        orderBy: [desc(agentSessions.createdAt)],
        limit: input.limit,
      });

      return sessions.map((s) => ({
        id: s.id,
        agentType: s.agentType,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        outcomesGenerated: s.outcomesGenerated,
        totalTokensUsed: s.totalTokensUsed,
        estimatedCost: parseFloat(s.estimatedCost ?? '0'),
        messageCount: (s.conversationHistory as unknown[])?.length ?? 0,
      }));
    }),

  /**
   * Get transaction history
   */
  getTransactionHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional().default(20),
      transactionType: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const conditions = [eq(agentTransactions.userId, ctx.session.user.id)];

      const transactions = await db.query.agentTransactions.findMany({
        where: and(...conditions),
        orderBy: [desc(agentTransactions.createdAt)],
        limit: input.limit,
      });

      return transactions.map((t) => ({
        id: t.id,
        transactionType: t.transactionType,
        status: t.status,
        baseAmount: parseFloat(t.baseAmount),
        platformFee: parseFloat(t.platformFee ?? '0'),
        totalAmount: parseFloat(t.totalAmount),
        currency: t.currency,
        description: t.description,
        createdAt: t.createdAt,
        billedAt: t.billedAt,
        paidAt: t.paidAt,
      }));
    }),

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get platform-wide agent statistics (admin only)
   */
  getPlatformStats: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is admin
    if (ctx.session.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get session counts
    const [sessionStats] = await db
      .select({
        totalSessions: count(),
        activeSessions: sql<number>`COUNT(*) FILTER (WHERE status = 'active')`,
      })
      .from(agentSessions);

    // Get transaction totals
    const [transactionStats] = await db
      .select({
        totalTransactions: count(),
        totalRevenue: sql<number>`COALESCE(SUM(CAST(total_amount AS NUMERIC)), 0)`,
      })
      .from(agentTransactions)
      .where(eq(agentTransactions.status, 'completed'));

    // Get usage totals
    const [usageStats] = await db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(total_tokens), 0)`,
        totalCost: sql<number>`COALESCE(SUM(CAST(total_cost AS NUMERIC)), 0)`,
      })
      .from(agentUsage);

    // Get API key counts
    const [apiKeyStats] = await db
      .select({
        totalKeys: count(),
        activeKeys: sql<number>`COUNT(*) FILTER (WHERE is_active = true)`,
      })
      .from(agentApiKeys);

    return {
      sessions: {
        total: sessionStats?.totalSessions ?? 0,
        active: sessionStats?.activeSessions ?? 0,
      },
      transactions: {
        total: transactionStats?.totalTransactions ?? 0,
        revenue: transactionStats?.totalRevenue ?? 0,
      },
      usage: {
        totalTokens: usageStats?.totalTokens ?? 0,
        totalCost: usageStats?.totalCost ?? 0,
      },
      apiKeys: {
        total: apiKeyStats?.totalKeys ?? 0,
        active: apiKeyStats?.activeKeys ?? 0,
      },
    };
  }),
});
