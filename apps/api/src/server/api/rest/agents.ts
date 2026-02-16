/**
 * REST API for AI Consumers
 * Provides a simple REST interface for AI agents that don't use MCP or OpenAI Functions
 *
 * Usage:
 * - POST /api/v1/agents/execute - Execute any InmoAI tool
 * - GET /api/v1/agents/capabilities - List available agents
 * - GET /api/v1/agents/schemas - Get OpenAI/Gemini schemas
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/infrastructure/database';
import { apiKeys } from '@/server/infrastructure/database/schema';
import { eq, and, gt } from 'drizzle-orm';
import { agentRegistry, DEFAULT_AGENT_CONFIGS } from '@/server/services/agents/registry';
import type { AgentType, AgentContext } from '@/server/services/agents/types';

// Import schemas
import openAIFunctions from '@/schemas/openai-functions.json';
import geminiTools from '@/schemas/gemini-tools.json';

// ============================================
// TYPES
// ============================================

interface ExecuteRequest {
  tool: string;
  params: Record<string, unknown>;
  apiKey: string;
  waitForResult?: boolean;
}

interface ExecuteResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  usage?: {
    creditsUsed: number;
    creditsRemaining: number;
  };
  meta?: {
    agentType: string;
    durationMs: number;
    toolCalls?: Array<{
      name: string;
      result: string;
    }>;
  };
}

interface ApiKeyValidation {
  userId: string;
  tier: string;
  creditsRemaining: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsRemaining: number;
  };
}

// ============================================
// SCHEMAS
// ============================================

const executeSchema = z.object({
  tool: z.string().min(1),
  params: z.record(z.unknown()).default({}),
  apiKey: z.string().min(10),
  waitForResult: z.boolean().default(true),
});

// ============================================
// API KEY VALIDATION
// ============================================

async function validateApiKey(apiKey: string): Promise<ApiKeyValidation | null> {
  // Check if key exists and is active
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.key, apiKey),
        eq(apiKeys.status, 'active'),
        gt(apiKeys.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!key) {
    return null;
  }

  // Update last used
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id));

  // Calculate rate limits based on tier
  const rateLimits: Record<string, number> = {
    free: 10,
    developer: 60,
    pro: 300,
    enterprise: 1000,
  };

  return {
    userId: key.userId,
    tier: key.tier || 'free',
    creditsRemaining: key.creditsRemaining || 100,
    rateLimit: {
      requestsPerMinute: rateLimits[key.tier || 'free'] || 10,
      requestsRemaining: rateLimits[key.tier || 'free'] || 10, // TODO: Track actual usage
    },
  };
}

// ============================================
// TOOL EXECUTION
// ============================================

const TOOL_TO_AGENT_MAP: Record<string, AgentType> = {
  inmoai_search_properties: 'search',
  inmoai_verify_property: 'verify',
  inmoai_estimate_value: 'valuation',
  inmoai_publish_social: 'social_media',
  inmoai_generate_content: 'content',
  inmoai_find_services: 'service_match',
  inmoai_delegate_task: 'coordinator',
  inmoai_create_workflow: 'coordinator',
  inmoai_get_social_analytics: 'social_media',
  inmoai_create_alert: 'alert',
  inmoai_get_agent_capabilities: 'coordinator',
};

const TOOL_COSTS: Record<string, number> = {
  inmoai_search_properties: 1,
  inmoai_verify_property: 2,
  inmoai_estimate_value: 3,
  inmoai_publish_social: 5,
  inmoai_generate_content: 2,
  inmoai_find_services: 2,
  inmoai_delegate_task: 0, // Costs apply to delegated agents
  inmoai_create_workflow: 1,
  inmoai_get_social_analytics: 1,
  inmoai_create_alert: 1,
  inmoai_get_agent_capabilities: 0,
};

async function executeTool(
  tool: string,
  params: Record<string, unknown>,
  userId: string
): Promise<{ success: boolean; data?: unknown; error?: string; durationMs: number }> {
  const startTime = Date.now();

  const agentType = TOOL_TO_AGENT_MAP[tool];
  if (!agentType) {
    return {
      success: false,
      error: `Unknown tool: ${tool}. Use GET /api/v1/agents/capabilities to see available tools.`,
      durationMs: Date.now() - startTime,
    };
  }

  const agent = agentRegistry.getAgent(agentType);
  if (!agent) {
    return {
      success: false,
      error: `Agent '${agentType}' is not available.`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    // Build context
    const context: AgentContext = {
      userId,
      sessionId: `rest-${Date.now()}`,
      agentType,
      conversationHistory: [],
      initialContext: params,
    };

    // Build message from params
    const message = buildMessageFromParams(tool, params);

    // Execute
    const response = await agent.processMessage(message, context);

    return {
      success: true,
      data: {
        message: response.message,
        ...response.data,
        suggestions: response.suggestions,
        toolCalls: response.toolCalls,
      },
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startTime,
    };
  }
}

function buildMessageFromParams(tool: string, params: Record<string, unknown>): string {
  // Convert params to natural language message for the agent
  switch (tool) {
    case 'inmoai_search_properties':
      return `Buscar propiedades ${params.operationType === 'rent' ? 'en alquiler' : 'en venta'} en ${params.location || 'España'}${
        params.priceMax ? ` hasta ${params.priceMax}€` : ''
      }${params.bedrooms ? ` con ${params.bedrooms}+ habitaciones` : ''}`;

    case 'inmoai_verify_property':
      return `Verificar propiedad ${params.cadastralReference || params.listingId || params.address}`;

    case 'inmoai_estimate_value':
      return `Valorar propiedad en ${params.address}, ${params.sizeSqm}m², ${params.propertyType}`;

    case 'inmoai_publish_social':
      return `Publicar propiedad ${params.listingId} en ${(params.platforms as string[])?.join(', ')}`;

    case 'inmoai_generate_content':
      return `Generar ${params.contentType} para propiedad ${params.listingId}`;

    case 'inmoai_find_services':
      return `Buscar ${params.serviceType} cerca de ${params.location || 'la propiedad'}`;

    case 'inmoai_delegate_task':
      return params.task as string;

    case 'inmoai_create_workflow':
      return `Crear workflow: ${params.name}`;

    case 'inmoai_get_agent_capabilities':
      return 'Listar capacidades de todos los agentes';

    default:
      return JSON.stringify(params);
  }
}

// ============================================
// ROUTE HANDLERS
// ============================================

/**
 * POST /api/v1/agents/execute
 * Execute an InmoAI tool
 */
export async function handleExecute(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const parsed = executeSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: 'Invalid request body',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { tool, params, apiKey, waitForResult } = parsed.data;

    // Validate API key
    const keyData = await validateApiKey(apiKey);
    if (!keyData) {
      return Response.json(
        {
          success: false,
          error: 'Invalid or expired API key',
        },
        { status: 401 }
      );
    }

    // Check credits
    const cost = TOOL_COSTS[tool] || 1;
    if (keyData.creditsRemaining < cost) {
      return Response.json(
        {
          success: false,
          error: 'Insufficient credits',
          usage: {
            creditsRequired: cost,
            creditsRemaining: keyData.creditsRemaining,
          },
        },
        { status: 402 }
      );
    }

    // Execute tool
    const result = await executeTool(tool, params, keyData.userId);

    // Deduct credits if successful
    if (result.success) {
      await db
        .update(apiKeys)
        .set({
          creditsRemaining: keyData.creditsRemaining - cost,
        })
        .where(eq(apiKeys.key, apiKey));
    }

    const response: ExecuteResponse = {
      success: result.success,
      data: result.data,
      error: result.error,
      usage: {
        creditsUsed: result.success ? cost : 0,
        creditsRemaining: keyData.creditsRemaining - (result.success ? cost : 0),
      },
      meta: {
        agentType: TOOL_TO_AGENT_MAP[tool] || 'unknown',
        durationMs: result.durationMs,
      },
    };

    return Response.json(response, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/agents/capabilities
 * List available agents and their capabilities
 */
export async function handleCapabilities(req: Request): Promise<Response> {
  const capabilities = Object.entries(DEFAULT_AGENT_CONFIGS).map(([type, config]) => ({
    type,
    name: config.name,
    description: config.description,
    capabilities: config.capabilities,
    pricing: config.pricing,
    tools: Object.keys(TOOL_TO_AGENT_MAP).filter((tool) => TOOL_TO_AGENT_MAP[tool] === type),
  }));

  return Response.json({
    success: true,
    data: {
      agents: capabilities,
      totalAgents: capabilities.length,
      version: '1.0.0',
    },
  });
}

/**
 * GET /api/v1/agents/schemas
 * Get OpenAI Functions and Gemini Tools schemas
 */
export async function handleSchemas(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const format = url.searchParams.get('format');

  if (format === 'openai') {
    return Response.json(openAIFunctions);
  }

  if (format === 'gemini') {
    return Response.json(geminiTools);
  }

  return Response.json({
    success: true,
    data: {
      openai: openAIFunctions,
      gemini: geminiTools,
    },
    usage: {
      openai: 'Use with OpenAI Function Calling: client.chat.completions.create({ tools: schemas.openai.functions })',
      gemini: 'Use with Gemini: model.generateContent({ tools: schemas.gemini.tools })',
    },
  });
}

/**
 * GET /api/v1/agents/health
 * Health check endpoint
 */
export async function handleHealth(req: Request): Promise<Response> {
  const availableAgents = agentRegistry.getAvailableTypes();

  return Response.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    agents: {
      available: availableAgents.length,
      types: availableAgents,
    },
    version: '1.0.0',
  });
}

// ============================================
// EXPORT ROUTER
// ============================================

export const agentsRestRouter = {
  execute: handleExecute,
  capabilities: handleCapabilities,
  schemas: handleSchemas,
  health: handleHealth,
};