/**
 * REST API Router
 * Exposes InmoAI tools via REST endpoints for AI consumers
 *
 * Endpoints:
 * - POST /api/v1/agents/execute - Execute any tool
 * - GET /api/v1/agents/capabilities - List available agents
 * - GET /api/v1/agents/schemas - Get OpenAI/Gemini schemas
 * - GET /api/v1/agents/health - Health check
 */

export { agentsRestRouter, handleExecute, handleCapabilities, handleSchemas, handleHealth } from './agents';

// Route configuration for Next.js API routes
export const REST_API_ROUTES = {
  execute: '/api/v1/agents/execute',
  capabilities: '/api/v1/agents/capabilities',
  schemas: '/api/v1/agents/schemas',
  health: '/api/v1/agents/health',
} as const;

// OpenAPI specification for the REST API
export const OPENAPI_SPEC = {
  openapi: '3.0.0',
  info: {
    title: 'InmoAI REST API',
    description: 'REST API for AI consumers to interact with InmoAI tools',
    version: '1.0.0',
    contact: {
      name: 'InmoAI Support',
      url: 'https://inmoai.com/docs',
    },
  },
  servers: [
    {
      url: 'https://api.inmoai.com',
      description: 'Production',
    },
    {
      url: 'http://localhost:3001',
      description: 'Development',
    },
  ],
  paths: {
    '/api/v1/agents/execute': {
      post: {
        summary: 'Execute an InmoAI tool',
        operationId: 'executeAgent',
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['tool', 'apiKey'],
                properties: {
                  tool: {
                    type: 'string',
                    description: 'Tool name (e.g., inmoai_search_properties)',
                  },
                  params: {
                    type: 'object',
                    description: 'Tool parameters',
                  },
                  apiKey: {
                    type: 'string',
                    description: 'Your InmoAI API key',
                  },
                  waitForResult: {
                    type: 'boolean',
                    default: true,
                    description: 'Wait for result or return immediately',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'object' },
                    usage: {
                      type: 'object',
                      properties: {
                        creditsUsed: { type: 'number' },
                        creditsRemaining: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid API key' },
          402: { description: 'Insufficient credits' },
          500: { description: 'Server error' },
        },
      },
    },
    '/api/v1/agents/capabilities': {
      get: {
        summary: 'List available agents and capabilities',
        operationId: 'getCapabilities',
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        agents: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              type: { type: 'string' },
                              name: { type: 'string' },
                              description: { type: 'string' },
                              capabilities: {
                                type: 'array',
                                items: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/agents/schemas': {
      get: {
        summary: 'Get OpenAI Functions or Gemini Tools schemas',
        operationId: 'getSchemas',
        parameters: [
          {
            name: 'format',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['openai', 'gemini'],
            },
            description: 'Schema format (openai or gemini)',
          },
        ],
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/agents/health': {
      get: {
        summary: 'Health check',
        operationId: 'healthCheck',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    status: { type: 'string' },
                    timestamp: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      apiKey: {
        type: 'apiKey',
        in: 'body',
        name: 'apiKey',
      },
    },
  },
};
