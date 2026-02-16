/**
 * Social Media Agent
 * Handles automated posting to social media platforms
 */

import { eq, and } from 'drizzle-orm';
import { BaseAgent } from '../base.agent';
import type {
  AgentContext,
  AgentOutcome,
  AgentResponse,
  AgentTool,
  ToolResult,
} from '../types';
import { db } from '@/server/infrastructure/database';
import {
  socialConnections,
  socialPosts,
  listings,
  type SocialPlatform,
} from '@/server/infrastructure/database/schema';
import {
  getAdapter,
  type PostData,
  type SocialPlatformAdapter,
} from '../../social/adapters';

// ============================================
// TOOLS
// ============================================

const publishToSocialTool: AgentTool = {
  name: 'publish_to_social',
  description: 'Publica una propiedad en una o más redes sociales',
  parameters: {
    listingId: { type: 'string', description: 'ID del listado', required: true },
    platforms: {
      type: 'array',
      description: 'Plataformas donde publicar',
      required: true,
      items: { type: 'string', description: 'Nombre de plataforma (facebook, instagram, etc.)' },
    },
    customMessage: { type: 'string', description: 'Mensaje personalizado' },
  },
  execute: async (params, context) => {
    const { listingId, platforms, customMessage } = params as {
      listingId: string;
      platforms: SocialPlatform[];
      customMessage?: string;
    };

    const results: Record<string, { success: boolean; postUrl?: string; error?: string }> = {};
    let successCount = 0;

    for (const platform of platforms) {
      try {
        // Get user's connection for this platform
        const [connection] = await db
          .select()
          .from(socialConnections)
          .where(
            and(
              eq(socialConnections.userId, context.userId!),
              eq(socialConnections.platform, platform),
              eq(socialConnections.status, 'active')
            )
          )
          .limit(1);

        if (!connection) {
          results[platform] = { success: false, error: `No ${platform} account connected` };
          continue;
        }

        // Get listing data
        const [listing] = await db
          .select()
          .from(listings)
          .where(eq(listings.id, listingId))
          .limit(1);

        if (!listing) {
          results[platform] = { success: false, error: 'Listing not found' };
          continue;
        }

        // Build post data (TODO: fetch images from listingImages table)
        const postData: PostData = {
          content: customMessage || buildDefaultContent(listing, platform),
          hashtags: generateHashtags(listing, platform),
          mediaUrls: undefined,
          mediaType: 'image',
          listing: listing as unknown as PostData['listing'],
        };

        // Get adapter and publish
        const adapter = getAdapter(platform);
        const result = await adapter.publishPost(connection, postData);

        if (result.success) {
          successCount++;

          // Save post record
          await db.insert(socialPosts).values({
            listingId,
            connectionId: connection.id,
            userId: context.userId!,
            platform,
            platformPostId: result.platformPostId,
            postUrl: result.postUrl,
            content: postData.content,
            hashtags: postData.hashtags,
            mediaUrls: postData.mediaUrls,
            status: 'published',
            publishedAt: new Date(),
          });

          results[platform] = { success: true, postUrl: result.postUrl };
        } else {
          results[platform] = { success: false, error: result.error };
        }
      } catch (error) {
        results[platform] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return {
      success: successCount > 0,
      data: { results, successCount, totalPlatforms: platforms.length },
      isBillable: successCount > 0,
      billableType: 'social_post',
      billableAmount: successCount * 0.5, // 0.50€ per post
    };
  },
};

const getSocialConnectionsTool: AgentTool = {
  name: 'get_social_connections',
  description: 'Obtiene las conexiones de redes sociales del usuario',
  parameters: {},
  execute: async (params, context) => {
    const connections = await db
      .select({
        id: socialConnections.id,
        platform: socialConnections.platform,
        username: socialConnections.platformUsername,
        pageName: socialConnections.pageName,
        status: socialConnections.status,
        lastUsedAt: socialConnections.lastUsedAt,
      })
      .from(socialConnections)
      .where(eq(socialConnections.userId, context.userId!));

    return {
      success: true,
      data: { connections },
    };
  },
};

const getSocialAnalyticsTool: AgentTool = {
  name: 'get_social_analytics',
  description: 'Obtiene analytics de los posts publicados',
  parameters: {
    listingId: { type: 'string', description: 'ID del listado (opcional)' },
    platform: { type: 'string', description: 'Plataforma específica (opcional)' },
  },
  execute: async (params, context) => {
    const { listingId, platform } = params as {
      listingId?: string;
      platform?: SocialPlatform;
    };

    let query = db
      .select({
        id: socialPosts.id,
        platform: socialPosts.platform,
        postUrl: socialPosts.postUrl,
        publishedAt: socialPosts.publishedAt,
        analytics: socialPosts.analytics,
      })
      .from(socialPosts)
      .where(eq(socialPosts.userId, context.userId!));

    const posts = await query;

    // Filter by listing or platform if specified
    const filteredPosts = posts.filter((post) => {
      if (listingId && post.id !== listingId) return false;
      if (platform && post.platform !== platform) return false;
      return true;
    });

    // Aggregate analytics
    const totalAnalytics = filteredPosts.reduce(
      (acc, post) => {
        const analytics = post.analytics as Record<string, number> | null;
        if (analytics) {
          acc.impressions += analytics.impressions || 0;
          acc.engagement += analytics.engagement || 0;
          acc.clicks += analytics.clicks || 0;
          acc.likes += analytics.likes || 0;
          acc.comments += analytics.comments || 0;
          acc.shares += analytics.shares || 0;
        }
        return acc;
      },
      { impressions: 0, engagement: 0, clicks: 0, likes: 0, comments: 0, shares: 0 }
    );

    return {
      success: true,
      data: {
        posts: filteredPosts,
        totalPosts: filteredPosts.length,
        aggregatedAnalytics: totalAnalytics,
      },
    };
  },
};

const schedulePostTool: AgentTool = {
  name: 'schedule_post',
  description: 'Programa un post para publicar más tarde',
  parameters: {
    listingId: { type: 'string', description: 'ID del listado', required: true },
    platforms: { type: 'array', description: 'Plataformas', required: true },
    scheduledAt: { type: 'string', description: 'Fecha/hora ISO', required: true },
    customMessage: { type: 'string', description: 'Mensaje personalizado' },
  },
  execute: async (params, context) => {
    const { listingId, platforms, scheduledAt, customMessage } = params as {
      listingId: string;
      platforms: SocialPlatform[];
      scheduledAt: string;
      customMessage?: string;
    };

    const scheduledDate = new Date(scheduledAt);

    // Get listing
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    const scheduledPosts: string[] = [];

    for (const platform of platforms) {
      // Get connection
      const [connection] = await db
        .select()
        .from(socialConnections)
        .where(
          and(
            eq(socialConnections.userId, context.userId!),
            eq(socialConnections.platform, platform),
            eq(socialConnections.status, 'active')
          )
        )
        .limit(1);

      if (!connection) continue;

      // Create scheduled post record
      const [post] = await db
        .insert(socialPosts)
        .values({
          listingId,
          connectionId: connection.id,
          userId: context.userId!,
          platform,
          content: customMessage || buildDefaultContent(listing, platform),
          hashtags: generateHashtags(listing, platform),
          mediaUrls: [],
          status: 'scheduled',
          scheduledAt: scheduledDate,
        })
        .returning();

      scheduledPosts.push(post.id);
    }

    return {
      success: scheduledPosts.length > 0,
      data: {
        scheduledPosts,
        scheduledAt: scheduledDate.toISOString(),
        platformsScheduled: scheduledPosts.length,
      },
    };
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildDefaultContent(
  listing: typeof listings.$inferSelect,
  platform: SocialPlatform
): string {
  const price = listing.price
    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(listing.price))
    : 'Consultar precio';

  const location = [listing.neighborhood, listing.city].filter(Boolean).join(', ');

  const features = [
    listing.bedrooms ? `${listing.bedrooms} hab.` : null,
    listing.bathrooms ? `${listing.bathrooms} baños` : null,
    listing.sizeSqm ? `${listing.sizeSqm}m²` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // Platform-specific formatting
  switch (platform) {
    case 'instagram':
      return `🏠 ${listing.title}\n\n📍 ${location}\n💰 ${price}\n📐 ${features}\n\n${listing.aiDescription || listing.description || ''}\n\n¡Contacta para más info! Link en bio 👆`;

    case 'linkedin':
      return `Nueva oportunidad inmobiliaria en ${location}\n\n${listing.title}\n\n✓ Precio: ${price}\n✓ Características: ${features}\n\n${listing.aiDescription || listing.description || ''}\n\nContacta conmigo para más información.`;

    case 'tiktok':
      return `🏡 ${listing.title} en ${location}\n💰 ${price}\n📐 ${features}`;

    case 'facebook':
    default:
      return `🏠 ${listing.title}\n\n📍 Ubicación: ${location}\n💰 Precio: ${price}\n📐 ${features}\n\n${listing.aiDescription || listing.description || ''}\n\n¿Interesado? ¡Contáctanos!`;
  }
}

function generateHashtags(
  listing: typeof listings.$inferSelect,
  platform: SocialPlatform
): string[] {
  const baseHashtags = [
    'inmobiliaria',
    'realestate',
    listing.operationType === 'rent' ? 'alquiler' : 'venta',
    listing.propertyType?.replace('_', ''),
  ].filter(Boolean) as string[];

  const locationHashtags = [
    listing.city?.toLowerCase().replace(/\s+/g, ''),
    listing.neighborhood?.toLowerCase().replace(/\s+/g, ''),
    listing.province?.toLowerCase().replace(/\s+/g, ''),
  ].filter(Boolean) as string[];

  const featureHashtags: string[] = [];
  if (listing.hasPool) featureHashtags.push('piscinaprivada');
  if (listing.hasTerrace) featureHashtags.push('terraza');
  if (listing.hasGarden) featureHashtags.push('jardin');
  if (listing.hasParking) featureHashtags.push('parking');

  const allHashtags = [...baseHashtags, ...locationHashtags, ...featureHashtags];

  // Platform-specific limits
  const maxHashtags = platform === 'instagram' ? 30 : platform === 'tiktok' ? 10 : 5;

  return allHashtags.slice(0, maxHashtags);
}

// ============================================
// SOCIAL MEDIA AGENT CLASS
// ============================================

export class SocialMediaAgent extends BaseAgent {
  constructor() {
    super({
      type: 'social_media',
      name: 'Social Media Agent',
      description: 'Publica propiedades en redes sociales automáticamente',
      capabilities: [
        'Publicación en Facebook, Instagram, LinkedIn, TikTok',
        'Generación automática de contenido optimizado',
        'Programación de posts',
        'Analytics de engagement',
        'Hashtags optimizados por plataforma',
      ],
      pricing: {
        sessionCost: 0,
        outcomeCost: 0.5, // 0.50€ por post
        billableOutcomes: ['social_post'],
      },
      limits: {
        maxTokensPerRequest: 4096,
        maxTurns: 15,
        sessionTimeoutMinutes: 30,
        maxConcurrentSessions: 5,
      },
      systemPrompt: `Eres un experto en marketing inmobiliario en redes sociales para el mercado español.

Tu objetivo es ayudar a los usuarios a publicar sus propiedades en redes sociales de manera efectiva.

CAPACIDADES:
- Publicar en Facebook, Instagram, LinkedIn y TikTok
- Generar contenido optimizado para cada plataforma
- Crear hashtags relevantes
- Programar publicaciones
- Analizar rendimiento de posts

INSTRUCCIONES:
1. Siempre verifica que el usuario tiene cuentas conectadas antes de publicar
2. Adapta el contenido al estilo de cada plataforma
3. Usa emojis apropiados para aumentar engagement
4. Incluye llamadas a la acción
5. Si no hay imágenes, sugiere al usuario que las agregue

FORMATO DE RESPUESTA:
- Sé conciso y directo
- Confirma las acciones realizadas
- Sugiere próximos pasos`,
      tools: [
        publishToSocialTool,
        getSocialConnectionsTool,
        getSocialAnalyticsTool,
        schedulePostTool,
      ],
    });
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
    const outcomes: AgentOutcome[] = [];
    const toolCalls: AgentResponse['toolCalls'] = [];

    // Generate response using the model
    const prompt = `${conversationContext}

Usuario: ${userMessage}

Analiza el mensaje del usuario y determina la acción a realizar.
Si el usuario quiere publicar, usa la herramienta publish_to_social.
Si quiere ver sus conexiones, usa get_social_connections.
Si quiere analytics, usa get_social_analytics.
Si quiere programar, usa schedule_post.

Responde en español de forma concisa.`;

    const modelResponse = await this.generateModelResponse(prompt);

    // Parse any tool calls from the response
    const parsed = this.parseModelResponse(modelResponse);

    if (parsed?.tool) {
      const toolName = parsed.tool as string;
      const toolParams = (parsed.params as Record<string, unknown>) || {};
      const toolResult = await this.executeTool(toolName, toolParams, context);

      toolCalls.push({
        name: toolName,
        args: toolParams,
        result: JSON.stringify(toolResult),
      });

      if (toolResult.isBillable && toolResult.billableType) {
        outcomes.push(
          this.createOutcome(
            toolResult.billableType,
            `Publicación en redes sociales`,
            toolResult.data as Record<string, unknown>,
            toolResult.billableAmount
          )
        );
      }
    }

    return {
      response: modelResponse,
      toolCalls,
      outcomes,
    };
  }

  protected async generateSuggestions(
    context: AgentContext,
    response: string
  ): Promise<string[]> {
    return [
      'Publicar en todas las redes',
      'Ver analytics de posts',
      'Programar publicación',
      'Conectar nueva red social',
    ];
  }
}

// Export singleton
export const socialMediaAgent = new SocialMediaAgent();
