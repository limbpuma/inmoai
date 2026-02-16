#!/usr/bin/env node
/**
 * InmoAI MCP Server
 *
 * Model Context Protocol server that enables AI agents (Claude, GPT, Gemini, etc.)
 * to interact with InmoAI's real estate infrastructure.
 *
 * Capabilities:
 * - Property verification via Spanish Cadastre
 * - Escrow transaction initiation
 * - Visit scheduling
 * - Service provider booking
 * - Hyper-local market data
 *
 * Usage with Claude Desktop:
 * Add to claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "inmoai": {
 *       "command": "npx",
 *       "args": ["@inmoai/mcp-server"],
 *       "env": {
 *         "INMOAI_API_URL": "https://api.inmoai.com",
 *         "INMOAI_API_KEY": "your-api-key"
 *       }
 *     }
 *   }
 * }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Configuration
const INMOAI_API_URL = process.env.INMOAI_API_URL || 'http://localhost:9091';
const INMOAI_API_KEY = process.env.INMOAI_API_KEY;

// API Client
class InmoAIClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Property Tools
  async verifyProperty(params: {
    listingId?: string;
    cadastralRef?: string;
    address?: {
      street: string;
      number: string;
      city: string;
      province: string;
      postalCode: string;
    };
  }) {
    return this.request('/api/trpc/cadastre.verify', 'POST', params);
  }

  async getPropertyDetails(listingId: string) {
    return this.request(`/api/trpc/listings.get?input=${encodeURIComponent(JSON.stringify({ id: listingId }))}`);
  }

  // Market Tools
  async getMarketStats(params: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
  }) {
    return this.request('/api/trpc/market.stats', 'POST', params);
  }

  async getPriceHistory(cadastralRef: string) {
    return this.request(`/api/trpc/market.priceHistory?input=${encodeURIComponent(JSON.stringify({ cadastralRef }))}`);
  }

  // Transaction Tools
  async initiateEscrow(params: {
    listingId: string;
    buyerEmail: string;
    amount: number;
    conditions?: Array<{
      type: string;
      description: string;
      deadline?: string;
    }>;
  }) {
    return this.request('/api/trpc/escrow.create', 'POST', params);
  }

  // Visit Tools
  async scheduleVisit(params: {
    listingId: string;
    visitorName: string;
    visitorEmail: string;
    visitorPhone?: string;
    visitType: 'in_person' | 'virtual';
    preferredDates: string[];
  }) {
    return this.request('/api/trpc/visits.schedule', 'POST', params);
  }

  // Service Provider Tools
  async searchProviders(params: {
    latitude: number;
    longitude: number;
    category?: string;
    maxDistance?: number;
  }) {
    return this.request('/api/trpc/marketplace.searchProviders', 'POST', params);
  }

  async bookProvider(params: {
    providerId: string;
    serviceCategory: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    description?: string;
    listingId?: string;
  }) {
    return this.request('/api/trpc/marketplace.requestQuote', 'POST', params);
  }

  // Resources
  async getRecentListings(limit = 50) {
    return this.request(`/api/trpc/listings.search?input=${encodeURIComponent(JSON.stringify({ limit, verified: true }))}`);
  }

  async getVerifiedProviders() {
    return this.request('/api/trpc/marketplace.getCategories');
  }

  // ============================================
  // SOCIAL MEDIA TOOLS
  // ============================================

  async publishToSocial(params: {
    listingId: string;
    platforms: ('facebook' | 'instagram' | 'linkedin' | 'tiktok')[];
    customMessage?: string;
    scheduledAt?: string;
  }) {
    return this.request('/api/trpc/social.publish', 'POST', params);
  }

  async getSocialConnections() {
    return this.request('/api/trpc/social.getConnections');
  }

  async getSocialAnalytics(params: {
    listingId?: string;
    platform?: string;
    dateRange?: { from: string; to: string };
  }) {
    return this.request('/api/trpc/social.getAnalytics', 'POST', params);
  }

  async disconnectSocial(connectionId: string) {
    return this.request('/api/trpc/social.disconnect', 'POST', { connectionId });
  }

  // ============================================
  // CONTENT GENERATION TOOLS
  // ============================================

  async generateContent(params: {
    listingId: string;
    contentType: 'description' | 'hashtags' | 'social_post' | 'ad_copy' | 'email' | 'video_script';
    platform?: 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'email' | 'generic';
    tone?: 'professional' | 'casual' | 'luxury' | 'friendly' | 'urgent';
    language?: 'es' | 'en' | 'ca' | 'eu' | 'gl';
    maxLength?: number;
  }) {
    return this.request('/api/trpc/content.generate', 'POST', params);
  }

  async getGeneratedContent(params: {
    listingId?: string;
    contentType?: string;
  }) {
    return this.request('/api/trpc/content.getGenerated', 'POST', params);
  }

  // ============================================
  // AGENT COORDINATION TOOLS
  // ============================================

  async delegateTask(params: {
    task: string;
    context?: Record<string, unknown>;
    priority?: 'low' | 'normal' | 'high';
    waitForResult?: boolean;
  }) {
    return this.request('/api/trpc/agents.delegate', 'POST', params);
  }

  async getAgentCapabilities() {
    return this.request('/api/trpc/agents.capabilities');
  }

  // ============================================
  // WORKFLOW TOOLS
  // ============================================

  async createWorkflow(params: {
    name: string;
    trigger: {
      type: 'listing_created' | 'price_changed' | 'lead_received' | 'scheduled' | 'manual';
      conditions?: Record<string, unknown>;
    };
    actions: Array<{
      agent: string;
      params: Record<string, unknown>;
      onSuccess?: string;
      onFailure?: string;
    }>;
  }) {
    return this.request('/api/trpc/workflows.create', 'POST', params);
  }

  async listWorkflows() {
    return this.request('/api/trpc/workflows.list');
  }

  async executeWorkflow(workflowId: string) {
    return this.request('/api/trpc/workflows.execute', 'POST', { workflowId });
  }

  async getWorkflowExecutions(workflowId: string) {
    return this.request(`/api/trpc/workflows.executions?input=${encodeURIComponent(JSON.stringify({ workflowId }))}`);
  }
}

// Initialize server
const server = new Server(
  {
    name: 'inmoai-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

const client = new InmoAIClient(INMOAI_API_URL, INMOAI_API_KEY);

// ============================================
// TOOLS
// ============================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // === VERIFICATION TOOLS ===
    {
      name: 'inmoai_verify_property',
      description: `Verifica una propiedad contra el Catastro español oficial.
Obtiene datos verificados como referencia catastral, superficie, año de construcción,
y verifica si la dirección del listado coincide con los registros oficiales.
INDISPENSABLE para detectar fraudes inmobiliarios.`,
      inputSchema: {
        type: 'object',
        properties: {
          listingId: {
            type: 'string',
            description: 'ID del listado en InmoAI (si existe)',
          },
          cadastralRef: {
            type: 'string',
            description: 'Referencia catastral de 20 caracteres (si se conoce)',
          },
          address: {
            type: 'object',
            description: 'Dirección para buscar en el Catastro',
            properties: {
              street: { type: 'string' },
              number: { type: 'string' },
              city: { type: 'string' },
              province: { type: 'string' },
              postalCode: { type: 'string' },
            },
            required: ['street', 'number', 'city', 'province'],
          },
        },
      },
    },

    // === MARKET DATA TOOLS ===
    {
      name: 'inmoai_market_stats',
      description: `Obtiene estadísticas hiper-locales del mercado inmobiliario español.
Datos que NO están disponibles en otros sitios: precios reales de cierre,
días promedio en el mercado, índice de competencia, tendencias por barrio.`,
      inputSchema: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'Latitud del punto' },
          longitude: { type: 'number', description: 'Longitud del punto' },
          radiusMeters: {
            type: 'number',
            description: 'Radio de búsqueda en metros (default: 500)',
            default: 500,
          },
        },
        required: ['latitude', 'longitude'],
      },
    },
    {
      name: 'inmoai_price_history',
      description: `Obtiene el historial de precios de una propiedad específica.
Incluye cambios de precio históricos y estimación de valoración.`,
      inputSchema: {
        type: 'object',
        properties: {
          cadastralRef: {
            type: 'string',
            description: 'Referencia catastral de la propiedad',
          },
          listingId: {
            type: 'string',
            description: 'ID del listado en InmoAI (alternativo)',
          },
        },
      },
    },

    // === TRANSACTION TOOLS ===
    {
      name: 'inmoai_initiate_escrow',
      description: `Inicia un proceso de escrow (depósito en garantía) para una transacción inmobiliaria.
El dinero queda protegido hasta que se cumplan las condiciones acordadas.
Fees: 0.3% para ventas, 0.5% para alquileres.
REQUIERE autorización del comprador.`,
      inputSchema: {
        type: 'object',
        properties: {
          listingId: { type: 'string', description: 'ID del listado' },
          buyerEmail: { type: 'string', description: 'Email del comprador' },
          amount: { type: 'number', description: 'Cantidad en EUR' },
          conditions: {
            type: 'array',
            description: 'Condiciones para liberar el escrow',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['inspection', 'financing', 'documents', 'custom'],
                },
                description: { type: 'string' },
                deadline: { type: 'string', format: 'date' },
              },
            },
          },
        },
        required: ['listingId', 'buyerEmail', 'amount'],
      },
    },

    // === VISIT TOOLS ===
    {
      name: 'inmoai_schedule_visit',
      description: `Programa una visita a una propiedad (presencial o virtual).
Coordina automáticamente con el propietario/agente.`,
      inputSchema: {
        type: 'object',
        properties: {
          listingId: { type: 'string' },
          visitorName: { type: 'string' },
          visitorEmail: { type: 'string' },
          visitorPhone: { type: 'string' },
          visitType: {
            type: 'string',
            enum: ['in_person', 'virtual'],
            default: 'in_person',
          },
          preferredDates: {
            type: 'array',
            items: { type: 'string', format: 'date-time' },
            description: 'Fechas preferidas para la visita',
          },
        },
        required: ['listingId', 'visitorName', 'visitorEmail', 'preferredDates'],
      },
    },

    // === SERVICE PROVIDER TOOLS ===
    {
      name: 'inmoai_search_providers',
      description: `Busca proveedores de servicios inmobiliarios verificados cerca de una ubicación.
Categorías: reformas, pintura, electricidad, fontanería, jardinería, limpieza, mudanzas.`,
      inputSchema: {
        type: 'object',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          category: {
            type: 'string',
            enum: ['painting', 'renovation', 'electrical', 'plumbing', 'garden', 'cleaning', 'moving', 'general'],
          },
          maxDistance: {
            type: 'number',
            description: 'Distancia máxima en km (default: 20)',
            default: 20,
          },
        },
        required: ['latitude', 'longitude'],
      },
    },
    {
      name: 'inmoai_book_provider',
      description: `Solicita un presupuesto a un proveedor de servicios.
El proveedor recibirá los datos y contactará al cliente.`,
      inputSchema: {
        type: 'object',
        properties: {
          providerId: { type: 'string' },
          serviceCategory: { type: 'string' },
          clientName: { type: 'string' },
          clientEmail: { type: 'string' },
          clientPhone: { type: 'string' },
          description: { type: 'string', description: 'Descripción del trabajo' },
          listingId: { type: 'string', description: 'Propiedad relacionada (opcional)' },
        },
        required: ['providerId', 'serviceCategory', 'clientName', 'clientEmail'],
      },
    },

    // ============================================
    // SOCIAL MEDIA TOOLS (NEW)
    // ============================================
    {
      name: 'inmoai_publish_social',
      description: `Publica una propiedad en redes sociales automáticamente.
Genera contenido optimizado para cada plataforma usando IA.
Plataformas soportadas: Facebook, Instagram, LinkedIn, TikTok.
REQUIERE que el usuario haya conectado sus cuentas previamente.
Precio: 0.50€ por post publicado.`,
      inputSchema: {
        type: 'object',
        properties: {
          listingId: {
            type: 'string',
            description: 'ID del listado a publicar',
          },
          platforms: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['facebook', 'instagram', 'linkedin', 'tiktok'],
            },
            description: 'Plataformas donde publicar',
          },
          customMessage: {
            type: 'string',
            description: 'Mensaje personalizado (opcional, si no se genera automáticamente)',
          },
          scheduledAt: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha/hora para programar la publicación (opcional)',
          },
        },
        required: ['listingId', 'platforms'],
      },
    },
    {
      name: 'inmoai_get_social_connections',
      description: `Lista las conexiones de redes sociales del usuario.
Muestra qué plataformas están conectadas y su estado.`,
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'inmoai_get_social_analytics',
      description: `Obtiene analytics de los posts publicados en redes sociales.
Incluye impresiones, engagement, clicks, y más.`,
      inputSchema: {
        type: 'object',
        properties: {
          listingId: {
            type: 'string',
            description: 'ID del listado (opcional)',
          },
          platform: {
            type: 'string',
            enum: ['facebook', 'instagram', 'linkedin', 'tiktok'],
            description: 'Plataforma específica (opcional)',
          },
          dateRange: {
            type: 'object',
            properties: {
              from: { type: 'string', format: 'date' },
              to: { type: 'string', format: 'date' },
            },
            description: 'Rango de fechas (opcional)',
          },
        },
      },
    },

    // ============================================
    // CONTENT GENERATION TOOLS (NEW)
    // ============================================
    {
      name: 'inmoai_generate_content',
      description: `Genera contenido de marketing para una propiedad usando IA.
Optimizado para el mercado inmobiliario español.
Tipos disponibles: descripción, hashtags, post social, copy de anuncio, email, script de video.
Precio: 0.25€ por generación.`,
      inputSchema: {
        type: 'object',
        properties: {
          listingId: {
            type: 'string',
            description: 'ID del listado',
          },
          contentType: {
            type: 'string',
            enum: ['description', 'hashtags', 'social_post', 'ad_copy', 'email', 'video_script'],
            description: 'Tipo de contenido a generar',
          },
          platform: {
            type: 'string',
            enum: ['facebook', 'instagram', 'linkedin', 'tiktok', 'email', 'generic'],
            description: 'Plataforma destino (afecta formato y longitud)',
          },
          tone: {
            type: 'string',
            enum: ['professional', 'casual', 'luxury', 'friendly', 'urgent'],
            description: 'Tono del contenido',
          },
          language: {
            type: 'string',
            enum: ['es', 'en', 'ca', 'eu', 'gl'],
            default: 'es',
            description: 'Idioma del contenido',
          },
          maxLength: {
            type: 'number',
            description: 'Longitud máxima en caracteres (opcional)',
          },
        },
        required: ['listingId', 'contentType'],
      },
    },
    {
      name: 'inmoai_get_generated_content',
      description: `Recupera contenido generado previamente para un listado.
Útil para reutilizar contenido sin regenerar.`,
      inputSchema: {
        type: 'object',
        properties: {
          listingId: { type: 'string' },
          contentType: {
            type: 'string',
            enum: ['description', 'hashtags', 'social_post', 'ad_copy', 'email', 'video_script'],
          },
        },
      },
    },

    // ============================================
    // AGENT COORDINATION TOOLS (NEW)
    // ============================================
    {
      name: 'inmoai_delegate_task',
      description: `Delega una tarea compleja a los agentes especializados de InmoAI.
El Coordinator Agent interpretará la tarea y orquestará múltiples agentes.
Ejemplo: "Publica mi piso en redes, verifica el catastro y busca pintores cerca"
Este es el PUNTO DE ENTRADA recomendado para tareas complejas.`,
      inputSchema: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'Descripción natural de la tarea a realizar',
          },
          context: {
            type: 'object',
            description: 'Contexto adicional (listingId, preferencias, ubicación, etc.)',
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            default: 'normal',
            description: 'Prioridad de ejecución',
          },
          waitForResult: {
            type: 'boolean',
            default: true,
            description: 'Si esperar a que termine la tarea',
          },
        },
        required: ['task'],
      },
    },
    {
      name: 'inmoai_get_agent_capabilities',
      description: `Lista los agentes disponibles y sus capacidades.
Útil para entender qué puede hacer InmoAI.`,
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },

    // ============================================
    // WORKFLOW TOOLS (NEW)
    // ============================================
    {
      name: 'inmoai_create_workflow',
      description: `Crea un workflow automatizado de gestión inmobiliaria.
Los workflows se ejecutan automáticamente cuando se cumple el trigger.
Ejemplos:
- "Cuando publique propiedad → verificar catastro → publicar en redes"
- "Si baja precio → notificar → republicar en redes"
- "Semanalmente → enviar resumen de leads"`,
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nombre del workflow',
          },
          trigger: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['listing_created', 'price_changed', 'lead_received', 'scheduled', 'manual'],
                description: 'Evento que dispara el workflow',
              },
              conditions: {
                type: 'object',
                description: 'Condiciones adicionales (ej: solo pisos en Madrid)',
              },
            },
            required: ['type'],
          },
          actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                agent: {
                  type: 'string',
                  description: 'Agente a ejecutar (search, verify, social_media, content, etc.)',
                },
                params: {
                  type: 'object',
                  description: 'Parámetros para el agente',
                },
                onSuccess: {
                  type: 'string',
                  description: 'Siguiente acción si éxito',
                },
                onFailure: {
                  type: 'string',
                  description: 'Acción si falla (retry, skip, abort)',
                },
              },
              required: ['agent', 'params'],
            },
            description: 'Lista de acciones a ejecutar',
          },
        },
        required: ['name', 'trigger', 'actions'],
      },
    },
    {
      name: 'inmoai_list_workflows',
      description: `Lista los workflows del usuario.`,
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'inmoai_execute_workflow',
      description: `Ejecuta manualmente un workflow.`,
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'ID del workflow a ejecutar',
          },
        },
        required: ['workflowId'],
      },
    },
    {
      name: 'inmoai_get_workflow_history',
      description: `Obtiene el historial de ejecuciones de un workflow.`,
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'ID del workflow',
          },
        },
        required: ['workflowId'],
      },
    },
  ],
}));

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'inmoai_verify_property': {
        const result = await client.verifyProperty(args as Parameters<typeof client.verifyProperty>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_market_stats': {
        const result = await client.getMarketStats(args as Parameters<typeof client.getMarketStats>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_price_history': {
        const { cadastralRef } = args as { cadastralRef: string };
        const result = await client.getPriceHistory(cadastralRef);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_initiate_escrow': {
        const result = await client.initiateEscrow(args as Parameters<typeof client.initiateEscrow>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_schedule_visit': {
        const result = await client.scheduleVisit(args as Parameters<typeof client.scheduleVisit>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_search_providers': {
        const result = await client.searchProviders(args as Parameters<typeof client.searchProviders>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_book_provider': {
        const result = await client.bookProvider(args as Parameters<typeof client.bookProvider>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // ============================================
      // SOCIAL MEDIA TOOLS
      // ============================================

      case 'inmoai_publish_social': {
        const result = await client.publishToSocial(args as Parameters<typeof client.publishToSocial>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_get_social_connections': {
        const result = await client.getSocialConnections();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_get_social_analytics': {
        const result = await client.getSocialAnalytics(args as Parameters<typeof client.getSocialAnalytics>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // ============================================
      // CONTENT GENERATION TOOLS
      // ============================================

      case 'inmoai_generate_content': {
        const result = await client.generateContent(args as Parameters<typeof client.generateContent>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_get_generated_content': {
        const result = await client.getGeneratedContent(args as Parameters<typeof client.getGeneratedContent>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // ============================================
      // AGENT COORDINATION TOOLS
      // ============================================

      case 'inmoai_delegate_task': {
        const result = await client.delegateTask(args as Parameters<typeof client.delegateTask>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_get_agent_capabilities': {
        const result = await client.getAgentCapabilities();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // ============================================
      // WORKFLOW TOOLS
      // ============================================

      case 'inmoai_create_workflow': {
        const result = await client.createWorkflow(args as Parameters<typeof client.createWorkflow>[0]);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_list_workflows': {
        const result = await client.listWorkflows();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_execute_workflow': {
        const { workflowId } = args as { workflowId: string };
        const result = await client.executeWorkflow(workflowId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'inmoai_get_workflow_history': {
        const { workflowId } = args as { workflowId: string };
        const result = await client.getWorkflowExecutions(workflowId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ============================================
// RESOURCES
// ============================================

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'inmoai://listings/verified',
      name: 'Verified Listings',
      description: 'Propiedades con verificación catastral completada',
      mimeType: 'application/json',
    },
    {
      uri: 'inmoai://providers/certified',
      name: 'Certified Service Providers',
      description: 'Proveedores de servicios verificados por InmoAI',
      mimeType: 'application/json',
    },
    {
      uri: 'inmoai://market/spain',
      name: 'Spain Market Overview',
      description: 'Resumen del mercado inmobiliario español',
      mimeType: 'application/json',
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    switch (uri) {
      case 'inmoai://listings/verified': {
        const listings = await client.getRecentListings(50);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(listings, null, 2),
            },
          ],
        };
      }

      case 'inmoai://providers/certified': {
        const providers = await client.getVerifiedProviders();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(providers, null, 2),
            },
          ],
        };
      }

      case 'inmoai://market/spain': {
        // Return cached market overview
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                lastUpdated: new Date().toISOString(),
                overview: {
                  avgPricePerSqm: 2150,
                  yoyChange: 0.045,
                  transactionsLastMonth: 45000,
                  topCities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga'],
                },
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    }
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// ============================================
// START SERVER
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('InmoAI MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
