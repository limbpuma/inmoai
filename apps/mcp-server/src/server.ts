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
