/**
 * Search Agent - Property Search Specialist
 * Finds properties based on natural language queries
 */

import { BaseAgent } from '../base.agent';
import { agentRegistry, DEFAULT_AGENT_CONFIGS } from '../registry';
import type {
  AgentConfig,
  AgentContext,
  AgentResponse,
  AgentTool,
  ToolResult,
  SearchResultItem,
  AgentOutcome,
} from '../types';
import { searchService } from '@/server/services/search';
import { db } from '@/server/infrastructure/database';
import { listings } from '@/server/infrastructure/database/schema';
import { eq, and, gte, lte, ilike, or, desc, asc, sql } from 'drizzle-orm';

// Search tool implementation
const searchListingsTool: AgentTool = {
  name: 'search_listings',
  description: 'Busca propiedades en la base de datos según criterios específicos',
  parameters: {
    query: { type: 'string', description: 'Búsqueda en texto libre', required: false },
    city: { type: 'string', description: 'Ciudad', required: false },
    neighborhood: { type: 'string', description: 'Barrio', required: false },
    propertyType: { type: 'string', description: 'Tipo de propiedad', required: false },
    operationType: { type: 'string', description: 'sale o rent', required: false },
    priceMin: { type: 'number', description: 'Precio mínimo', required: false },
    priceMax: { type: 'number', description: 'Precio máximo', required: false },
    bedroomsMin: { type: 'number', description: 'Dormitorios mínimos', required: false },
    sizeMin: { type: 'number', description: 'Tamaño mínimo en m²', required: false },
    limit: { type: 'number', description: 'Número máximo de resultados', required: false },
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const conditions = [];

      if (params.city) {
        conditions.push(ilike(listings.city, `%${params.city}%`));
      }
      if (params.neighborhood) {
        conditions.push(ilike(listings.neighborhood, `%${params.neighborhood}%`));
      }
      if (params.propertyType) {
        conditions.push(sql`${listings.propertyType} = ${params.propertyType}`);
      }
      if (params.operationType) {
        conditions.push(sql`${listings.operationType} = ${params.operationType}`);
      }
      if (params.priceMin) {
        conditions.push(gte(listings.price, String(params.priceMin)));
      }
      if (params.priceMax) {
        conditions.push(lte(listings.price, String(params.priceMax)));
      }
      if (params.bedroomsMin) {
        conditions.push(gte(listings.bedrooms, params.bedroomsMin as number));
      }
      if (params.sizeMin) {
        conditions.push(gte(listings.sizeSqm, params.sizeMin as number));
      }

      // Always filter active listings
      conditions.push(eq(listings.status, 'active'));

      const results = await db
        .select({
          id: listings.id,
          title: listings.title,
          price: listings.price,
          city: listings.city,
          neighborhood: listings.neighborhood,
          address: listings.address,
          bedrooms: listings.bedrooms,
          bathrooms: listings.bathrooms,
          sizeSqm: listings.sizeSqm,
          propertyType: listings.propertyType,
          operationType: listings.operationType,
          aiHighlights: listings.aiHighlights,
          qualityScore: listings.qualityScore,
        })
        .from(listings)
        .where(and(...conditions))
        .orderBy(desc(listings.qualityScore), desc(listings.createdAt))
        .limit((params.limit as number) || 10);

      const searchResults: SearchResultItem[] = results.map((r, index) => ({
        id: r.id,
        title: r.title,
        price: parseFloat(r.price ?? '0'),
        priceFormatted: new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(parseFloat(r.price ?? '0')),
        location: {
          city: r.city ?? '',
          neighborhood: r.neighborhood ?? undefined,
          address: r.address ?? undefined,
        },
        features: {
          bedrooms: r.bedrooms ?? undefined,
          bathrooms: r.bathrooms ?? undefined,
          sizeSqm: r.sizeSqm ?? undefined,
          propertyType: r.propertyType,
        },
        matchScore: 100 - index * 5, // Simple ranking
        highlights: (r.aiHighlights as string[]) ?? [],
      }));

      return {
        success: true,
        data: searchResults,
        isBillable: searchResults.length > 0,
        billableType: 'search_result',
        billableAmount: searchResults.length * 0.05, // 5 cents per result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  },
};

// Get listing details tool
const getListingDetailsTool: AgentTool = {
  name: 'get_listing_details',
  description: 'Obtiene detalles completos de una propiedad específica',
  parameters: {
    listingId: { type: 'string', description: 'ID de la propiedad', required: true },
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const listing = await db.query.listings.findFirst({
        where: eq(listings.id, params.listingId as string),
        with: {
          images: true,
          priceHistory: {
            orderBy: (ph, { desc }) => [desc(ph.recordedAt)],
            limit: 10,
          },
        },
      });

      if (!listing) {
        return {
          success: false,
          error: 'Propiedad no encontrada',
        };
      }

      return {
        success: true,
        data: {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          aiDescription: listing.aiDescription,
          price: parseFloat(listing.price ?? '0'),
          pricePerSqm: parseFloat(listing.pricePerSqm ?? '0'),
          location: {
            city: listing.city,
            neighborhood: listing.neighborhood,
            address: listing.address,
            latitude: listing.latitude ? parseFloat(listing.latitude) : null,
            longitude: listing.longitude ? parseFloat(listing.longitude) : null,
          },
          features: {
            propertyType: listing.propertyType,
            operationType: listing.operationType,
            rooms: listing.rooms,
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            sizeSqm: listing.sizeSqm,
            usableSizeSqm: listing.usableSizeSqm,
            floor: listing.floor,
            totalFloors: listing.totalFloors,
            yearBuilt: listing.yearBuilt,
            energyRating: listing.energyRating,
          },
          amenities: {
            hasElevator: listing.hasElevator,
            hasParking: listing.hasParking,
            hasTerrace: listing.hasTerrace,
            hasBalcony: listing.hasBalcony,
            hasGarden: listing.hasGarden,
            hasPool: listing.hasPool,
            hasAirConditioning: listing.hasAirConditioning,
            hasHeating: listing.hasHeating,
          },
          analysis: {
            qualityScore: listing.qualityScore,
            authenticityScore: listing.authenticityScore,
            highlights: listing.aiHighlights,
            issues: listing.aiIssues,
            improvements: listing.improvements,
            valuationEstimate: listing.valuationEstimate ? parseFloat(listing.valuationEstimate) : null,
          },
          images: listing.images?.slice(0, 10).map((img) => ({
            url: img.cdnUrl || img.originalUrl,
            roomType: img.roomType,
          })),
          priceHistory: listing.priceHistory?.map((ph) => ({
            price: parseFloat(ph.price),
            date: ph.recordedAt,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get listing details',
      };
    }
  },
};

// System prompt for search agent
const SEARCH_AGENT_SYSTEM_PROMPT = `Eres un agente de búsqueda inmobiliaria experto. Tu objetivo es ayudar a los usuarios a encontrar propiedades que se ajusten a sus necesidades.

CAPACIDADES:
- Interpretar búsquedas en lenguaje natural
- Filtrar por ubicación, precio, características
- Proporcionar resultados relevantes y bien ordenados
- Dar detalles de propiedades específicas

INSTRUCCIONES:
1. Analiza la solicitud del usuario para extraer criterios de búsqueda
2. Usa la herramienta search_listings para buscar propiedades
3. Presenta los resultados de forma clara y concisa
4. Ofrece ver detalles de propiedades específicas
5. Sugiere refinamientos de búsqueda si los resultados no son satisfactorios

FORMATO DE RESPUESTA:
- Sé conciso y directo
- Usa emojis con moderación para mejorar legibilidad
- Destaca las características más relevantes
- Proporciona enlaces o IDs para ver detalles

EJEMPLO:
Usuario: "Busco piso en Madrid centro, máximo 300k, 2 habitaciones"
Respuesta: Buscaré pisos en Madrid centro con esas características...
[Ejecuta búsqueda]
He encontrado X propiedades que coinciden:
1. **Piso en Malasaña** - 280.000€ - 2 hab, 75m²
2. **Apartamento en Chueca** - 295.000€ - 2 hab, 68m²
...
¿Te gustaría ver detalles de alguna?`;

export class SearchAgent extends BaseAgent {
  constructor() {
    const baseConfig = DEFAULT_AGENT_CONFIGS.search;

    const config: AgentConfig = {
      type: 'search',
      name: baseConfig.name!,
      description: baseConfig.description!,
      capabilities: baseConfig.capabilities!,
      pricing: baseConfig.pricing!,
      limits: baseConfig.limits!,
      systemPrompt: SEARCH_AGENT_SYSTEM_PROMPT,
      tools: [searchListingsTool, getListingDetailsTool],
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

    // First, ask the model to interpret the user's request
    const interpretPrompt = `
${conversationContext}

--- NUEVA SOLICITUD DEL USUARIO ---
${userMessage}

--- INSTRUCCIONES ---
Analiza la solicitud y decide qué hacer:
1. Si el usuario quiere buscar propiedades, extrae los criterios y responde con JSON:
{
  "action": "search",
  "criteria": {
    "city": "...",
    "neighborhood": "...",
    "propertyType": "apartment|house|...",
    "operationType": "sale|rent",
    "priceMin": number,
    "priceMax": number,
    "bedroomsMin": number,
    "sizeMin": number
  }
}

2. Si el usuario quiere ver detalles de una propiedad específica:
{
  "action": "details",
  "listingId": "..."
}

3. Si el usuario hace una pregunta general o necesita clarificación:
{
  "action": "clarify",
  "response": "..."
}

Responde SOLO con el JSON, sin explicación adicional.
`;

    const interpretation = await this.generateModelResponse(interpretPrompt);
    const parsed = this.parseModelResponse(interpretation);

    if (!parsed) {
      return {
        response: 'Disculpa, no he podido entender tu solicitud. ¿Podrías reformularla? Por ejemplo: "Busco piso de 2 habitaciones en Madrid por menos de 300.000€"',
        toolCalls: [],
        outcomes: [],
      };
    }

    const action = parsed.action as string;

    if (action === 'search') {
      // Execute search
      const criteria = parsed.criteria as Record<string, unknown>;
      const result = await this.executeTool('search_listings', {
        ...criteria,
        limit: 10,
      }, context);

      toolCalls.push({
        name: 'search_listings',
        args: criteria,
        result: result.success ? 'OK' : result.error,
      });

      if (result.success && result.data) {
        const searchResults = result.data as SearchResultItem[];
        responseData.listings = searchResults;

        // Create outcome if results found
        if (result.isBillable && searchResults.length > 0) {
          outcomes.push(this.createOutcome(
            'search_result',
            `Búsqueda con ${searchResults.length} resultados`,
            { query: criteria, resultCount: searchResults.length },
            result.billableAmount
          ));
        }

        // Generate response with results
        if (searchResults.length === 0) {
          return {
            response: 'No he encontrado propiedades con esos criterios. ¿Te gustaría ampliar la búsqueda? Puedo buscar en otras zonas cercanas o ajustar el rango de precio.',
            toolCalls,
            outcomes,
            data: responseData,
          };
        }

        const resultsText = searchResults
          .slice(0, 5)
          .map((r, i) => `${i + 1}. **${r.title}** - ${r.priceFormatted} - ${r.features.bedrooms ?? '?'} hab, ${r.features.sizeSqm ?? '?'}m² (${r.location.neighborhood || r.location.city})`)
          .join('\n');

        return {
          response: `He encontrado **${searchResults.length} propiedades** que coinciden:\n\n${resultsText}\n\n${searchResults.length > 5 ? `...y ${searchResults.length - 5} más.\n\n` : ''}¿Te gustaría ver los detalles de alguna? Puedes decirme el número o el nombre.`,
          toolCalls,
          outcomes,
          data: responseData,
        };
      } else {
        return {
          response: `Hubo un error al buscar: ${result.error}. Por favor, intenta de nuevo.`,
          toolCalls,
          outcomes,
        };
      }
    } else if (action === 'details') {
      const listingId = parsed.listingId as string;
      const result = await this.executeTool('get_listing_details', { listingId }, context);

      toolCalls.push({
        name: 'get_listing_details',
        args: { listingId },
        result: result.success ? 'OK' : result.error,
      });

      if (result.success && result.data) {
        const listing = result.data as Record<string, unknown>;
        const features = listing.features as Record<string, unknown>;
        const location = listing.location as Record<string, unknown>;
        const amenities = listing.amenities as Record<string, boolean>;
        const analysis = listing.analysis as Record<string, unknown>;

        // Build amenities list
        const amenitiesList = Object.entries(amenities)
          .filter(([_, v]) => v)
          .map(([k]) => {
            const labels: Record<string, string> = {
              hasElevator: 'Ascensor',
              hasParking: 'Parking',
              hasTerrace: 'Terraza',
              hasBalcony: 'Balcón',
              hasGarden: 'Jardín',
              hasPool: 'Piscina',
              hasAirConditioning: 'A/C',
              hasHeating: 'Calefacción',
            };
            return labels[k] || k;
          });

        const response = `
**${listing.title}**

💰 **${this.formatCurrency(listing.price as number)}** (${this.formatCurrency(features.pricePerSqm as number || 0)}/m²)

📍 ${location.neighborhood ? `${location.neighborhood}, ` : ''}${location.city}

🏠 **Características:**
- ${features.bedrooms} dormitorios, ${features.bathrooms} baños
- ${features.sizeSqm}m² construidos
${features.floor ? `- Planta ${features.floor}${features.totalFloors ? ` de ${features.totalFloors}` : ''}` : ''}
${features.yearBuilt ? `- Construido en ${features.yearBuilt}` : ''}

${amenitiesList.length > 0 ? `✨ **Extras:** ${amenitiesList.join(', ')}` : ''}

${analysis.qualityScore ? `\n📊 **Puntuación de calidad:** ${analysis.qualityScore}/100` : ''}

${(analysis.highlights as string[])?.length > 0 ? `\n🌟 **Destacados:**\n${(analysis.highlights as string[]).map(h => `- ${h}`).join('\n')}` : ''}

¿Te gustaría que te ayude con algo más sobre esta propiedad? Por ejemplo:
- Verificar su autenticidad
- Obtener una valoración
- Encontrar servicios de reforma cercanos
`;

        return {
          response,
          toolCalls,
          outcomes,
          data: { listing: result.data },
        };
      } else {
        return {
          response: `No he podido encontrar esa propiedad. ${result.error}`,
          toolCalls,
          outcomes,
        };
      }
    } else if (action === 'clarify') {
      return {
        response: parsed.response as string,
        toolCalls: [],
        outcomes: [],
      };
    }

    return {
      response: 'No estoy seguro de cómo ayudarte con eso. ¿Podrías especificar qué tipo de propiedad buscas?',
      toolCalls: [],
      outcomes: [],
    };
  }
}

// Create and register the agent
const searchAgent = new SearchAgent();
agentRegistry.register(searchAgent);

export { searchAgent };
