/**
 * Agent Orchestrator Service
 * Coordinates all specialized agents, manages sessions, tracks usage, and handles billing
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '@/server/infrastructure/database';
import {
  agentSessions,
  agentTransactions,
  agentUsage,
  agentApiKeys,
  type AgentType,
  type AgentSessionStatus,
} from '@/server/infrastructure/database/schema';
import { agentRegistry } from './registry';
import type {
  AgentRequest,
  AgentResponse,
  AgentContext,
  SessionCreateParams,
  ConversationMessage,
  AgentOutcome,
  OrchestratorConfig,
  B2BApiRequest,
  B2BApiResponse,
} from './types';
import type { BaseAgent } from './base.agent';

const DEFAULT_CONFIG: OrchestratorConfig = {
  defaultModel: 'gemini-2.0-flash',
  maxRetries: 3,
  retryDelayMs: 1000,
  enableUsageTracking: true,
  enableBilling: true,
};

class AgentOrchestrator {
  private config: OrchestratorConfig;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Process a user request - creates or continues a session
   */
  async processRequest(
    request: AgentRequest,
    userId?: string,
    apiKeyId?: string
  ): Promise<AgentResponse> {
    let context: AgentContext;

    if (request.sessionToken) {
      // Continue existing session
      context = await this.resumeSession(request.sessionToken);
    } else if (request.agentType) {
      // Create new session
      context = await this.createSession({
        userId,
        apiKeyId,
        agentType: request.agentType,
        initialContext: request.context,
        metadata: request.metadata,
      });
    } else {
      throw new Error('Either sessionToken or agentType must be provided');
    }

    // Get the appropriate agent
    const agent = agentRegistry.getAgent(context.agentType);
    if (!agent) {
      throw new Error(`Agent type '${context.agentType}' not found`);
    }

    // Process the message
    const response = await this.executeWithRetry(
      () => agent.processMessage(request.message, context),
      this.config.maxRetries
    );

    // Update session with new message and response
    await this.updateSession(context, request.message, response);

    // Track usage
    if (this.config.enableUsageTracking) {
      await this.trackUsage(context, response);
    }

    // Process billing for outcomes
    if (this.config.enableBilling && response.outcomes?.length) {
      await this.processBilling(context, response.outcomes);
    }

    return response;
  }

  /**
   * Create a new agent session
   */
  async createSession(params: SessionCreateParams): Promise<AgentContext> {
    const sessionToken = this.generateSessionToken();

    const [session] = await db
      .insert(agentSessions)
      .values({
        userId: params.userId,
        apiKeyId: params.apiKeyId,
        agentType: params.agentType,
        sessionToken,
        status: 'active',
        initialContext: params.initialContext ?? {},
        conversationHistory: [],
        outcomesGenerated: 0,
        totalTokensUsed: 0,
        estimatedCost: '0',
        metadata: params.metadata ?? {},
      })
      .returning();

    return this.buildContext(session);
  }

  /**
   * Resume an existing session
   */
  async resumeSession(sessionToken: string): Promise<AgentContext> {
    const session = await db.query.agentSessions.findFirst({
      where: eq(agentSessions.sessionToken, sessionToken),
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error(`Session is ${session.status}`);
    }

    // Check timeout
    const agent = agentRegistry.getAgent(session.agentType);
    const timeoutMs = (agent?.getConfig().limits.sessionTimeoutMinutes ?? 30) * 60 * 1000;
    const lastActivity = new Date(session.lastActivityAt ?? session.startedAt).getTime();

    if (Date.now() - lastActivity > timeoutMs) {
      await this.endSession(sessionToken, 'timeout');
      throw new Error('Session timed out');
    }

    return this.buildContext(session);
  }

  /**
   * End a session
   */
  async endSession(
    sessionToken: string,
    status: AgentSessionStatus = 'completed'
  ): Promise<void> {
    await db
      .update(agentSessions)
      .set({
        status,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentSessions.sessionToken, sessionToken));
  }

  /**
   * Get session by token
   */
  async getSession(sessionToken: string) {
    return db.query.agentSessions.findFirst({
      where: eq(agentSessions.sessionToken, sessionToken),
    });
  }

  // ============================================
  // B2B API SUPPORT
  // ============================================

  /**
   * Process a B2B API request
   */
  async processB2BRequest(request: B2BApiRequest): Promise<B2BApiResponse> {
    const requestId = this.generateRequestId();

    try {
      // Validate API key
      const apiKey = await this.validateApiKey(request.apiKey, request.agentType);

      if (!apiKey) {
        return {
          requestId,
          status: 'error',
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid or expired API key',
          },
          usage: { creditsUsed: 0, creditsRemaining: 0 },
        };
      }

      // Check rate limits
      if (!this.checkRateLimit(apiKey)) {
        return {
          requestId,
          status: 'error',
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded',
          },
          usage: {
            creditsUsed: 0,
            creditsRemaining: (apiKey.monthlyCredits ?? 0) - (apiKey.usedCreditsThisMonth ?? 0),
          },
        };
      }

      // Create session for this request
      const context = await this.createSession({
        apiKeyId: apiKey.id,
        agentType: request.agentType,
        initialContext: {
          intent: request.operation,
          ...request.params,
        },
      });

      // Process the operation
      const agent = agentRegistry.getAgent(request.agentType);
      if (!agent) {
        throw new Error(`Agent type '${request.agentType}' not available`);
      }

      // Execute operation
      const response = await agent.processMessage(
        JSON.stringify(request.params),
        context
      );

      // Calculate credits used
      const creditsUsed = this.calculateCredits(response);

      // Update API key usage
      await this.updateApiKeyUsage(apiKey.id, creditsUsed);

      // Send webhook if configured
      let webhookSent = false;
      if (request.webhookUrl) {
        webhookSent = await this.sendWebhook(request.webhookUrl, {
          requestId,
          status: 'success',
          data: response.data,
        });
      }

      // End session
      await this.endSession(context.sessionToken);

      return {
        requestId,
        status: 'success',
        data: response.data,
        usage: {
          creditsUsed,
          creditsRemaining: (apiKey.monthlyCredits ?? 0) - (apiKey.usedCreditsThisMonth ?? 0) - creditsUsed,
        },
        webhookSent,
      };
    } catch (error) {
      // Security: Only log detailed errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('B2B API error:', error);
      } else {
        console.error('B2B API error:', error instanceof Error ? error.message : 'Unknown error');
      }

      return {
        requestId,
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        usage: { creditsUsed: 0, creditsRemaining: 0 },
      };
    }
  }

  // ============================================
  // USAGE & BILLING
  // ============================================

  /**
   * Track usage for a session turn
   */
  private async trackUsage(context: AgentContext, response: AgentResponse): Promise<void> {
    await db.insert(agentUsage).values({
      sessionId: context.sessionId,
      userId: context.userId,
      apiKeyId: context.apiKeyId,
      agentType: context.agentType,
      operationType: 'message',
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      totalTokens: response.usage.inputTokens + response.usage.outputTokens,
      durationMs: response.usage.durationMs,
      modelUsed: response.usage.modelUsed,
      tokenCost: String(this.calculateTokenCost(response.usage.inputTokens + response.usage.outputTokens)),
      computeCost: '0',
      totalCost: String(this.calculateTokenCost(response.usage.inputTokens + response.usage.outputTokens)),
    });

    // Update session totals
    await db
      .update(agentSessions)
      .set({
        totalTokensUsed: context.usage.totalTokens + response.usage.inputTokens + response.usage.outputTokens,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentSessions.id, context.sessionId));
  }

  /**
   * Process billing for generated outcomes
   */
  private async processBilling(
    context: AgentContext,
    outcomes: AgentOutcome[]
  ): Promise<void> {
    for (const outcome of outcomes) {
      await db.insert(agentTransactions).values({
        sessionId: context.sessionId,
        userId: context.userId,
        apiKeyId: context.apiKeyId,
        transactionType: outcome.type,
        status: 'completed',
        baseAmount: String(outcome.amount),
        platformFee: String(outcome.amount * 0.1), // 10% platform fee
        totalAmount: String(outcome.amount * 1.1),
        currency: 'EUR',
        listingId: context.relatedEntities.listingId,
        serviceProviderId: context.relatedEntities.providerId,
        serviceLeadId: context.relatedEntities.leadId,
        description: outcome.description,
        outcomeData: outcome.data,
      });
    }

    // Update session outcomes count
    await db
      .update(agentSessions)
      .set({
        outcomesGenerated: context.usage.outcomesGenerated + outcomes.length,
        updatedAt: new Date(),
      })
      .where(eq(agentSessions.id, context.sessionId));
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Get usage analytics for a user
   */
  async getUserAnalytics(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await db.query.agentSessions.findMany({
      where: and(
        eq(agentSessions.userId, userId),
        // TODO: Add date filter with gte
      ),
      orderBy: [desc(agentSessions.createdAt)],
      limit: 100,
    });

    const transactions = await db.query.agentTransactions.findMany({
      where: eq(agentTransactions.userId, userId),
      orderBy: [desc(agentTransactions.createdAt)],
      limit: 100,
    });

    const usage = await db.query.agentUsage.findMany({
      where: eq(agentUsage.userId, userId),
      orderBy: [desc(agentUsage.createdAt)],
      limit: 500,
    });

    return {
      totalSessions: sessions.length,
      totalTokens: usage.reduce((sum, u) => sum + (u.totalTokens ?? 0), 0),
      totalTransactions: transactions.length,
      totalRevenue: transactions.reduce(
        (sum, t) => sum + parseFloat(t.totalAmount ?? '0'),
        0
      ),
      byAgentType: this.groupByAgentType(sessions),
      byTransactionType: this.groupByTransactionType(transactions),
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  private generateRequestId(): string {
    return `req_${randomBytes(16).toString('hex')}`;
  }

  private buildContext(session: typeof agentSessions.$inferSelect): AgentContext {
    return {
      sessionId: session.id,
      sessionToken: session.sessionToken,
      userId: session.userId ?? undefined,
      apiKeyId: session.apiKeyId ?? undefined,
      agentType: session.agentType,
      locale: (session.initialContext as Record<string, unknown>)?.locale as string ?? 'es',
      initialContext: (session.initialContext ?? {}) as AgentContext['initialContext'],
      conversationHistory: (session.conversationHistory ?? []) as ConversationMessage[],
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: session.totalTokensUsed ?? 0,
        outcomesGenerated: session.outcomesGenerated ?? 0,
        estimatedCost: parseFloat(session.estimatedCost ?? '0'),
      },
      relatedEntities: {
        listingId: (session.initialContext as Record<string, unknown>)?.listingId as string,
        providerId: (session.initialContext as Record<string, unknown>)?.providerId as string,
      },
    };
  }

  private async updateSession(
    context: AgentContext,
    userMessage: string,
    response: AgentResponse
  ): Promise<void> {
    const newHistory: ConversationMessage[] = [
      ...context.conversationHistory,
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
      {
        role: 'agent',
        content: response.message,
        timestamp: new Date().toISOString(),
        toolCalls: response.toolCalls?.map((tc) => ({
          name: tc.name,
          args: tc.args,
          result: tc.result,
        })),
      },
    ];

    await db
      .update(agentSessions)
      .set({
        status: response.status,
        conversationHistory: newHistory,
        lastActivityAt: new Date(),
        completedAt: response.status !== 'active' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(agentSessions.id, context.sessionId));
  }

  // Dummy hash for constant-time comparison when key not found (prevents timing attacks)
  private static readonly DUMMY_HASH = createHash('sha256').update('dummy-key-for-timing').digest('hex');

  private async validateApiKey(
    keyString: string,
    agentType: AgentType
  ): Promise<typeof agentApiKeys.$inferSelect | null> {
    // Extract prefix (first 16 characters after 'inmo_agent_' prefix if present)
    const keyPrefix = keyString.startsWith('inmo_agent_')
      ? keyString.slice(0, 27) // 'inmo_agent_' (11) + 16 hex chars
      : keyString.slice(0, 16);

    const apiKey = await db.query.agentApiKeys.findFirst({
      where: and(
        eq(agentApiKeys.keyPrefix, keyPrefix),
        eq(agentApiKeys.isActive, true)
      ),
    });

    // Use dummy hash if key not found to prevent timing attacks
    const storedHash = apiKey?.keyHash ?? AgentOrchestrator.DUMMY_HASH;

    // Security: Verify the full key hash using constant-time comparison
    const providedHash = createHash('sha256').update(keyString).digest('hex');

    let hashMatch = false;
    try {
      hashMatch = timingSafeEqual(
        Buffer.from(storedHash, 'hex'),
        Buffer.from(providedHash, 'hex')
      );
    } catch {
      // Buffer length mismatch - invalid hash
      hashMatch = false;
    }

    // All validations AFTER constant-time comparison to prevent timing attacks
    if (!apiKey || !hashMatch) {
      return null;
    }

    // Check if agent type is allowed
    const allowedAgents = (apiKey.allowedAgents ?? []) as AgentType[];
    if (allowedAgents.length > 0 && !allowedAgents.includes(agentType)) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return null;
    }

    // Update last used
    await db
      .update(agentApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(agentApiKeys.id, apiKey.id));

    return apiKey;
  }

  private checkRateLimit(apiKey: typeof agentApiKeys.$inferSelect): boolean {
    const monthlyLimit = apiKey.monthlyCredits ?? 100000;
    const usedCredits = apiKey.usedCreditsThisMonth ?? 0;

    return usedCredits < monthlyLimit;
  }

  private async updateApiKeyUsage(apiKeyId: string, creditsUsed: number): Promise<void> {
    await db
      .update(agentApiKeys)
      .set({
        usedCreditsThisMonth: sql<number>`COALESCE(used_credits_this_month, 0) + ${creditsUsed}`,
        updatedAt: new Date(),
      })
      .where(eq(agentApiKeys.id, apiKeyId));
  }

  private calculateCredits(response: AgentResponse): number {
    // Base credits for tokens
    let credits = Math.ceil((response.usage.inputTokens + response.usage.outputTokens) / 1000);

    // Additional credits for outcomes
    if (response.outcomes) {
      credits += response.outcomes.length * 10;
    }

    return credits;
  }

  private calculateTokenCost(tokens: number): number {
    // Gemini 2.0 Flash pricing: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
    // Simplified: average $0.2 per 1M tokens
    return (tokens / 1_000_000) * 0.2;
  }

  /**
   * Security: Validate webhook URL to prevent SSRF attacks
   * Blocks private IPs, localhost, cloud metadata endpoints
   */
  private validateWebhookUrl(url: string): { valid: boolean; error?: string } {
    try {
      const parsed = new URL(url);

      // Only allow HTTPS in production
      if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
        return { valid: false, error: 'HTTPS required in production' };
      }

      // Block non-HTTP(S) protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, error: 'Only HTTP/HTTPS protocols allowed' };
      }

      const hostname = parsed.hostname.toLowerCase();

      // Block localhost variations
      const localhostPatterns = [
        'localhost',
        '127.0.0.1',
        '::1',
        '0.0.0.0',
        '[::1]',
        '0177.0.0.1', // Octal
        '2130706433', // Decimal
        '0x7f.0x0.0x0.0x1', // Hex
      ];

      if (localhostPatterns.some(p => hostname === p || hostname.includes(p))) {
        return { valid: false, error: 'Localhost URLs not allowed' };
      }

      // Check if hostname is an IP address
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const ipMatch = hostname.match(ipv4Regex);

      if (ipMatch) {
        const octets = ipMatch.slice(1).map(Number);

        // Block private IP ranges (RFC 1918)
        if (octets[0] === 10) {
          return { valid: false, error: 'Private IP range (10.x.x.x) not allowed' };
        }
        if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
          return { valid: false, error: 'Private IP range (172.16-31.x.x) not allowed' };
        }
        if (octets[0] === 192 && octets[1] === 168) {
          return { valid: false, error: 'Private IP range (192.168.x.x) not allowed' };
        }

        // Block loopback (127.x.x.x)
        if (octets[0] === 127) {
          return { valid: false, error: 'Loopback address not allowed' };
        }

        // Block link-local (169.254.x.x) - cloud metadata
        if (octets[0] === 169 && octets[1] === 254) {
          return { valid: false, error: 'Link-local/metadata endpoint not allowed' };
        }

        // Block carrier-grade NAT (100.64-127.x.x)
        if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) {
          return { valid: false, error: 'Carrier-grade NAT range not allowed' };
        }

        // Block multicast (224-239.x.x.x)
        if (octets[0] >= 224 && octets[0] <= 239) {
          return { valid: false, error: 'Multicast address not allowed' };
        }

        // Block reserved (240-255.x.x.x)
        if (octets[0] >= 240) {
          return { valid: false, error: 'Reserved IP range not allowed' };
        }
      }

      // Block cloud metadata hostnames
      const blockedHostnames = [
        'metadata.google.internal',
        'metadata.google.com',
        'instance-data',
        'metadata',
        'metadata.azure.internal',
      ];

      if (blockedHostnames.some(h => hostname === h || hostname.endsWith('.' + h))) {
        return { valid: false, error: 'Cloud metadata endpoint not allowed' };
      }

      // Block AWS metadata by path as well
      if (parsed.pathname.includes('/latest/meta-data') ||
          parsed.pathname.includes('/computeMetadata')) {
        return { valid: false, error: 'Metadata path not allowed' };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  private async sendWebhook(
    url: string,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    // Security: Validate URL to prevent SSRF
    const validation = this.validateWebhookUrl(url);
    if (!validation.valid) {
      console.error(`SSRF protection blocked webhook: ${validation.error}`);
      return false;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('Webhook send error:', error);
      return false;
    }
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Attempt ${attempt + 1} failed:`, lastError.message);

        if (attempt < maxRetries - 1) {
          await this.delay(this.config.retryDelayMs * (attempt + 1));
        }
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private groupByAgentType(sessions: typeof agentSessions.$inferSelect[]) {
    const groups: Record<string, number> = {};
    for (const session of sessions) {
      groups[session.agentType] = (groups[session.agentType] ?? 0) + 1;
    }
    return groups;
  }

  private groupByTransactionType(transactions: typeof agentTransactions.$inferSelect[]) {
    const groups: Record<string, { count: number; total: number }> = {};
    for (const tx of transactions) {
      if (!groups[tx.transactionType]) {
        groups[tx.transactionType] = { count: 0, total: 0 };
      }
      groups[tx.transactionType].count++;
      groups[tx.transactionType].total += parseFloat(tx.totalAmount ?? '0');
    }
    return groups;
  }
}

// Singleton instance
export const orchestrator = new AgentOrchestrator();
