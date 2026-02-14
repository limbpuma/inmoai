/**
 * Service Match Agent - Provider Matching Specialist
 * Connects property owners with local service providers based on proximity and needs
 */

import { BaseAgent } from '../base.agent';
import { agentRegistry, DEFAULT_AGENT_CONFIGS } from '../registry';
import type {
  AgentConfig,
  AgentContext,
  AgentResponse,
  AgentTool,
  ToolResult,
  ProviderMatch,
  BookingConfirmation,
  AgentOutcome,
} from '../types';
import { db } from '@/server/infrastructure/database';
import {
  serviceProviders,
  providerServices,
  serviceLeads,
  listings,
  type ServiceCategory,
} from '@/server/infrastructure/database/schema';
import type { RankedProvider } from '@/server/services/marketplace/types';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { proximityService } from '@/server/services/marketplace';

// Search providers tool
const searchProvidersTool: AgentTool = {
  name: 'search_providers',
  description: 'Busca proveedores de servicios por categoría y ubicación',
  parameters: {
    category: {
      type: 'string',
      description: 'Categoría del servicio',
      enum: ['painting', 'renovation', 'electrical', 'plumbing', 'garden', 'general'],
      required: true,
    },
    city: { type: 'string', description: 'Ciudad', required: false },
    latitude: { type: 'number', description: 'Latitud', required: false },
    longitude: { type: 'number', description: 'Longitud', required: false },
    maxDistanceKm: { type: 'number', description: 'Distancia máxima en km', required: false },
    limit: { type: 'number', description: 'Número máximo de resultados', required: false },
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const category = params.category as string;
      const city = params.city as string || undefined;
      const lat = params.latitude as number || undefined;
      const lng = params.longitude as number || undefined;
      const maxDistance = params.maxDistanceKm as number || 50;
      const limit = params.limit as number || 10;

      // Use proximity service if available
      if (lat && lng) {
        const searchResult = await proximityService.searchProviders({
          latitude: lat,
          longitude: lng,
          categoryIds: [category as ServiceCategory],
          maxDistanceKm: maxDistance,
          limit,
        });

        const providers: ProviderMatch[] = searchResult.providers.map((r: RankedProvider, index: number) => ({
          id: r.provider.id,
          businessName: r.provider.businessName,
          slug: r.provider.slug,
          category,
          rating: r.provider.averageRating ?? 0,
          reviewCount: r.provider.totalReviews ?? 0,
          distanceKm: r.distanceKm ?? 0,
          priceRange: {
            min: r.services[0]?.priceMin ?? 0,
            max: r.services[0]?.priceMax ?? 0,
          },
          matchScore: 100 - index * 5,
          highlights: [
            r.provider.isVerified ? 'Verificado' : '',
            r.provider.tier === 'premium' ? 'Premium' : r.provider.tier === 'enterprise' ? 'Destacado' : '',
            r.provider.responseTimeMinutes ? `Responde en ${r.provider.responseTimeMinutes < 60 ? `${r.provider.responseTimeMinutes}min` : `${Math.round(r.provider.responseTimeMinutes / 60)}h`}` : '',
          ].filter(Boolean),
          isVerified: r.provider.isVerified ?? false,
          tier: r.provider.tier,
        }));

        return {
          success: true,
          data: providers,
        };
      }

      // Fallback to city-based search
      const conditions = [
        eq(serviceProviders.status, 'active'),
      ];

      if (city) {
        conditions.push(sql`LOWER(${serviceProviders.city}) LIKE LOWER(${`%${city}%`})`);
      }

      const providersData = await db
        .select({
          provider: serviceProviders,
          service: providerServices,
        })
        .from(serviceProviders)
        .leftJoin(
          providerServices,
          and(
            eq(providerServices.providerId, serviceProviders.id),
            eq(providerServices.category, category as ServiceCategory)
          )
        )
        .where(and(...conditions))
        .orderBy(
          desc(serviceProviders.tier),
          desc(serviceProviders.averageRating),
          desc(serviceProviders.totalReviews)
        )
        .limit(limit);

      const providers: ProviderMatch[] = providersData
        .filter(p => p.service) // Only include providers with the requested service
        .map((p, index) => ({
          id: p.provider.id,
          businessName: p.provider.businessName,
          slug: p.provider.slug,
          category,
          rating: parseFloat(p.provider.averageRating ?? '0'),
          reviewCount: p.provider.totalReviews ?? 0,
          distanceKm: 0, // Unknown without coordinates
          priceRange: {
            min: p.service?.priceMin ? parseFloat(p.service.priceMin) : 0,
            max: p.service?.priceMax ? parseFloat(p.service.priceMax) : 0,
          },
          matchScore: 100 - index * 5,
          highlights: [
            p.provider.isVerified ? 'Verificado' : '',
            p.provider.tier === 'premium' ? 'Premium' : p.provider.tier === 'enterprise' ? 'Destacado' : '',
          ].filter(Boolean),
          isVerified: p.provider.isVerified ?? false,
          tier: p.provider.tier,
        }));

      return {
        success: true,
        data: providers,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  },
};

// Request quote tool
const requestQuoteTool: AgentTool = {
  name: 'request_quote',
  description: 'Solicita un presupuesto a un proveedor',
  parameters: {
    providerId: { type: 'string', description: 'ID del proveedor', required: true },
    category: { type: 'string', description: 'Categoría del servicio', required: true },
    title: { type: 'string', description: 'Título del trabajo', required: true },
    description: { type: 'string', description: 'Descripción del trabajo', required: true },
    clientName: { type: 'string', description: 'Nombre del cliente', required: true },
    clientEmail: { type: 'string', description: 'Email del cliente', required: true },
    clientPhone: { type: 'string', description: 'Teléfono del cliente', required: false },
    workAddress: { type: 'string', description: 'Dirección del trabajo', required: false },
    workCity: { type: 'string', description: 'Ciudad del trabajo', required: false },
    budget: { type: 'number', description: 'Presupuesto estimado', required: false },
    urgency: { type: 'string', description: 'Urgencia: normal, urgent, flexible', required: false },
    listingId: { type: 'string', description: 'ID de la propiedad relacionada', required: false },
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      // Verify provider exists
      const provider = await db.query.serviceProviders.findFirst({
        where: eq(serviceProviders.id, params.providerId as string),
      });

      if (!provider) {
        return { success: false, error: 'Proveedor no encontrado' };
      }

      // Create lead
      const [lead] = await db
        .insert(serviceLeads)
        .values({
          providerId: params.providerId as string,
          listingId: params.listingId as string || context.initialContext.listingId || null,
          category: params.category as 'painting' | 'renovation' | 'electrical' | 'plumbing' | 'garden' | 'general',
          title: params.title as string,
          description: params.description as string,
          clientName: params.clientName as string,
          clientEmail: params.clientEmail as string,
          clientPhone: params.clientPhone as string || null,
          workAddress: params.workAddress as string || null,
          workCity: params.workCity as string || provider.city,
          budget: params.budget ? String(params.budget) : null,
          urgency: (params.urgency as string) || 'normal',
          status: 'new',
          source: 'agent_service_match',
        })
        .returning();

      // Update provider lead counts
      await db
        .update(serviceProviders)
        .set({
          totalLeads: sql`${serviceProviders.totalLeads} + 1`,
          leadsThisMonth: sql`${serviceProviders.leadsThisMonth} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(serviceProviders.id, params.providerId as string));

      const confirmation: BookingConfirmation = {
        leadId: lead.id,
        providerId: params.providerId as string,
        status: 'pending',
        estimatedCost: params.budget ? {
          min: (params.budget as number) * 0.8,
          max: (params.budget as number) * 1.2,
        } : undefined,
        nextSteps: [
          `${provider.businessName} recibirá tu solicitud`,
          'Te contactarán en las próximas 24-48h',
          'Recibirás un presupuesto detallado',
          'Podrás comparar con otros proveedores',
        ],
      };

      return {
        success: true,
        data: confirmation,
        isBillable: true,
        billableType: 'service_booking',
        billableAmount: 0, // Fee will be percentage of final transaction
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  },
};

// Get provider details tool
const getProviderDetailsTool: AgentTool = {
  name: 'get_provider_details',
  description: 'Obtiene detalles completos de un proveedor',
  parameters: {
    providerId: { type: 'string', description: 'ID del proveedor', required: true },
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const provider = await db.query.serviceProviders.findFirst({
        where: eq(serviceProviders.id, params.providerId as string),
        with: {
          services: true,
          reviews: {
            where: (review) => eq(review.isPublished, true),
            orderBy: (review, { desc }) => [desc(review.createdAt)],
            limit: 5,
          },
          portfolio: {
            where: (item) => eq(item.isPublished, true),
            orderBy: (item, { asc }) => [asc(item.position)],
            limit: 6,
          },
        },
      });

      if (!provider) {
        return { success: false, error: 'Proveedor no encontrado' };
      }

      return {
        success: true,
        data: {
          id: provider.id,
          businessName: provider.businessName,
          description: provider.description,
          contact: {
            name: provider.contactName,
            email: provider.contactEmail,
            phone: provider.contactPhone,
            website: provider.website,
          },
          location: {
            city: provider.city,
            province: provider.province,
            address: provider.address,
          },
          stats: {
            rating: parseFloat(provider.averageRating ?? '0'),
            reviewCount: provider.totalReviews,
            responseTimeMinutes: provider.responseTimeMinutes,
          },
          verification: {
            isVerified: provider.isVerified,
            tier: provider.tier,
          },
          services: provider.services.map(s => ({
            category: s.category,
            title: s.title,
            description: s.description,
            priceMin: s.priceMin ? parseFloat(s.priceMin) : null,
            priceMax: s.priceMax ? parseFloat(s.priceMax) : null,
            priceUnit: s.priceUnit,
          })),
          recentReviews: provider.reviews.map(r => ({
            rating: r.rating,
            title: r.title,
            content: r.content,
            authorName: r.authorName,
            createdAt: r.createdAt,
          })),
          portfolio: provider.portfolio.map(p => ({
            title: p.title,
            category: p.category,
            imageUrl: p.imageUrl,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get details',
      };
    }
  },
};

// Detect needed services from listing
const detectServicesTool: AgentTool = {
  name: 'detect_services_needed',
  description: 'Detecta servicios necesarios basándose en el análisis de una propiedad',
  parameters: {
    listingId: { type: 'string', description: 'ID de la propiedad', required: true },
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const listing = await db.query.listings.findFirst({
        where: eq(listings.id, params.listingId as string),
      });

      if (!listing) {
        return { success: false, error: 'Propiedad no encontrada' };
      }

      const improvements = listing.improvements as {
        id: string;
        category: string;
        title: string;
        description: string;
        estimatedCost: { min: number; max: number };
        priority: string;
      }[] ?? [];

      const issues = listing.aiIssues as {
        type: string;
        description: string;
        severity: string;
      }[] ?? [];

      // Map improvements to service categories
      const neededServices = improvements.map(imp => ({
        category: imp.category,
        title: imp.title,
        description: imp.description,
        estimatedBudget: imp.estimatedCost,
        priority: imp.priority,
        source: 'improvement_detected',
      }));

      // Add services based on issues
      const issueServices = issues
        .filter(issue => issue.severity === 'high' || issue.severity === 'medium')
        .map(issue => {
          // Map issue types to service categories
          const categoryMap: Record<string, string> = {
            'humidity': 'plumbing',
            'electrical': 'electrical',
            'paint': 'painting',
            'structure': 'renovation',
          };
          const category = Object.entries(categoryMap).find(([key]) =>
            issue.type.toLowerCase().includes(key)
          )?.[1] ?? 'general';

          return {
            category,
            title: `Reparación: ${issue.type}`,
            description: issue.description,
            priority: issue.severity,
            source: 'issue_detected',
          };
        });

      return {
        success: true,
        data: {
          listingId: listing.id,
          services: [...neededServices, ...issueServices],
          location: {
            city: listing.city,
            latitude: listing.latitude ? parseFloat(listing.latitude) : null,
            longitude: listing.longitude ? parseFloat(listing.longitude) : null,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Detection failed',
      };
    }
  },
};

// System prompt
const SERVICE_MATCH_SYSTEM_PROMPT = `Eres un agente de matching de servicios profesionales. Tu objetivo es conectar propietarios con los mejores proveedores locales para sus necesidades.

CAPACIDADES:
- Detectar servicios necesarios en propiedades
- Buscar proveedores por proximidad y categoría
- Comparar precios y valoraciones
- Solicitar presupuestos

CATEGORÍAS DE SERVICIO:
- painting: Pintura
- renovation: Reformas generales
- electrical: Electricidad
- plumbing: Fontanería
- garden: Jardinería
- general: Mantenimiento general

INSTRUCCIONES:
1. Si el usuario menciona una propiedad, detecta los servicios necesarios
2. Busca proveedores cercanos y con buenas valoraciones
3. Presenta opciones claras con precios y reviews
4. Facilita la solicitud de presupuestos

FORMATO:
- Muestra top 3-5 proveedores
- Indica distancia, rating y rango de precios
- Destaca verificados y premium`;

export class ServiceMatchAgent extends BaseAgent {
  constructor() {
    const baseConfig = DEFAULT_AGENT_CONFIGS.service_match;

    const config: AgentConfig = {
      type: 'service_match',
      name: baseConfig.name!,
      description: baseConfig.description!,
      capabilities: baseConfig.capabilities!,
      pricing: baseConfig.pricing!,
      limits: baseConfig.limits!,
      systemPrompt: SERVICE_MATCH_SYSTEM_PROMPT,
      tools: [searchProvidersTool, requestQuoteTool, getProviderDetailsTool, detectServicesTool],
    };

    super(config);
  }

  protected async executeAgentLogic(
    userMessage: string,
    context: AgentContext,
    conversationContext: string
  ): Promise<{
    response: string;
    toolCalls: AgentResponse['toolCalls'];
    outcomes: AgentOutcome[];
    data?: AgentResponse['data'];
  }> {
    const toolCalls: AgentResponse['toolCalls'] = [];
    const outcomes: AgentOutcome[] = [];
    let responseData: AgentResponse['data'] = {};

    // Parse user intent
    const prompt = `
${conversationContext}

--- NUEVA SOLICITUD ---
${userMessage}

--- INSTRUCCIONES ---
Analiza qué necesita el usuario:

1. Si quiere buscar proveedores de un servicio:
{
  "action": "search_providers",
  "category": "painting|renovation|electrical|plumbing|garden|general",
  "city": "...",
  "description": "breve descripción de lo que busca"
}

2. Si quiere detectar qué servicios necesita una propiedad:
{
  "action": "detect_services",
  "listingId": "..."
}

3. Si quiere detalles de un proveedor específico:
{
  "action": "provider_details",
  "providerId": "..."
}

4. Si quiere solicitar un presupuesto:
{
  "action": "request_quote",
  "providerId": "...",
  "category": "...",
  "title": "...",
  "description": "..."
}

5. Si necesita clarificación:
{
  "action": "clarify",
  "response": "..."
}

Responde SOLO con el JSON.`;

    const interpretation = await this.generateModelResponse(prompt);
    const parsed = this.parseModelResponse(interpretation);

    if (!parsed) {
      return {
        response: '¿Qué tipo de servicio necesitas? Por ejemplo: pintura, fontanería, electricidad, reformas...',
        toolCalls: [],
        outcomes: [],
      };
    }

    const action = parsed.action as string;

    if (action === 'search_providers') {
      const category = parsed.category as string;
      const city = parsed.city as string;

      const result = await this.executeTool('search_providers', {
        category,
        city,
        latitude: context.initialContext.searchCriteria?.latitude,
        longitude: context.initialContext.searchCriteria?.longitude,
        limit: 5,
      }, context);

      toolCalls.push({ name: 'search_providers', args: { category, city }, result: result.success ? 'OK' : result.error });

      if (result.success && result.data) {
        const providers = result.data as ProviderMatch[];
        responseData.providers = providers;

        if (providers.length === 0) {
          return {
            response: `No encontré proveedores de ${this.getCategoryLabel(category)} en ${city}. ¿Quieres ampliar la búsqueda a otra zona?`,
            toolCalls,
            outcomes,
          };
        }

        const providersText = providers.slice(0, 5).map((p, i) => {
          const badges = p.highlights.filter(Boolean).join(' • ');
          const priceText = p.priceRange.min > 0 ?
            `${this.formatCurrency(p.priceRange.min)} - ${this.formatCurrency(p.priceRange.max)}` : 'Consultar';

          return `${i + 1}. **${p.businessName}** ${badges ? `(${badges})` : ''}
   ⭐ ${p.rating.toFixed(1)} (${p.reviewCount} opiniones) ${p.distanceKm > 0 ? `| 📍 ${p.distanceKm < 1 ? `${Math.round(p.distanceKm * 1000)}m` : `${p.distanceKm.toFixed(1)}km`}` : ''}
   💰 ${priceText}`;
        }).join('\n\n');

        return {
          response: `He encontrado **${providers.length} profesionales de ${this.getCategoryLabel(category)}**:\n\n${providersText}\n\n¿Te gustaría ver más detalles de alguno o solicitar un presupuesto?`,
          toolCalls,
          outcomes,
          data: responseData,
        };
      }

      return {
        response: `Hubo un error al buscar proveedores: ${result.error}`,
        toolCalls,
        outcomes,
      };

    } else if (action === 'detect_services') {
      const listingId = parsed.listingId as string || context.initialContext.listingId;

      if (!listingId) {
        return {
          response: 'No tengo información de la propiedad. Por favor, proporciona el ID de la propiedad o cuéntame qué tipo de trabajo necesitas.',
          toolCalls: [],
          outcomes: [],
        };
      }

      const result = await this.executeTool('detect_services_needed', { listingId }, context);
      toolCalls.push({ name: 'detect_services_needed', args: { listingId }, result: result.success ? 'OK' : result.error });

      if (result.success && result.data) {
        const data = result.data as {
          services: Array<{ category: string; title: string; description: string; priority?: string; estimatedBudget?: { min: number; max: number } }>;
          location: { city: string };
        };

        if (data.services.length === 0) {
          return {
            response: 'No se detectaron necesidades de servicio en esta propiedad. ¿Hay algo específico que quieras mejorar?',
            toolCalls,
            outcomes,
          };
        }

        const servicesText = data.services.map((s, i) =>
          `${i + 1}. **${s.title}** (${this.getCategoryLabel(s.category)})${s.priority === 'high' ? ' ⚡ Prioritario' : ''}
   ${s.description}${s.estimatedBudget ? `\n   💰 Estimado: ${this.formatCurrency(s.estimatedBudget.min)} - ${this.formatCurrency(s.estimatedBudget.max)}` : ''}`
        ).join('\n\n');

        return {
          response: `He detectado las siguientes necesidades de servicio:\n\n${servicesText}\n\n¿Quieres que busque proveedores para alguno de estos servicios?`,
          toolCalls,
          outcomes,
          data: { detectedServices: data.services },
        };
      }

      return {
        response: `No pude analizar la propiedad: ${result.error}`,
        toolCalls,
        outcomes,
      };

    } else if (action === 'provider_details') {
      const providerId = parsed.providerId as string;
      const result = await this.executeTool('get_provider_details', { providerId }, context);
      toolCalls.push({ name: 'get_provider_details', args: { providerId }, result: result.success ? 'OK' : result.error });

      if (result.success && result.data) {
        const provider = result.data as Record<string, unknown>;
        const stats = provider.stats as Record<string, unknown>;
        const contact = provider.contact as Record<string, string>;
        const services = provider.services as Array<{ title: string; priceMin: number; priceMax: number; priceUnit: string }>;
        const reviews = provider.recentReviews as Array<{ rating: number; content: string; authorName: string }>;

        const servicesText = services.map(s =>
          `- ${s.title}: ${s.priceMin > 0 ? `${this.formatCurrency(s.priceMin)} - ${this.formatCurrency(s.priceMax)} / ${s.priceUnit}` : 'Consultar'}`
        ).join('\n');

        const reviewsText = reviews.slice(0, 2).map(r =>
          `⭐ ${r.rating}/5 - "${r.content?.substring(0, 100)}..." - ${r.authorName}`
        ).join('\n');

        return {
          response: `**${provider.businessName}**

📊 ⭐ ${(stats.rating as number).toFixed(1)}/5 (${stats.reviewCount} opiniones)
⏱️ Tiempo de respuesta: ${(stats.responseTimeMinutes as number) < 60 ? `${stats.responseTimeMinutes}min` : `${Math.round((stats.responseTimeMinutes as number) / 60)}h`}

**Servicios:**
${servicesText}

**Opiniones recientes:**
${reviewsText}

**Contacto:**
📧 ${contact.email}
📞 ${contact.phone}
${contact.website ? `🌐 ${contact.website}` : ''}

¿Te gustaría solicitar un presupuesto?`,
          toolCalls,
          outcomes,
          data: { provider: result.data },
        };
      }

      return {
        response: `No encontré ese proveedor: ${result.error}`,
        toolCalls,
        outcomes,
      };

    } else if (action === 'clarify') {
      return {
        response: parsed.response as string,
        toolCalls: [],
        outcomes: [],
      };
    }

    return {
      response: '¿En qué tipo de servicio puedo ayudarte? Dime qué necesitas y te buscaré los mejores profesionales cercanos.',
      toolCalls: [],
      outcomes: [],
    };
  }

  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      painting: 'Pintura',
      renovation: 'Reformas',
      electrical: 'Electricidad',
      plumbing: 'Fontanería',
      garden: 'Jardinería',
      general: 'Mantenimiento',
    };
    return labels[category] || category;
  }
}

// Create and register
const serviceMatchAgent = new ServiceMatchAgent();
agentRegistry.register(serviceMatchAgent);

export { serviceMatchAgent };
