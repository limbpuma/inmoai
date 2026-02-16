/**
 * Content Generation Agent
 * Generates marketing content for real estate listings using AI
 */

import { eq } from 'drizzle-orm';
import { BaseAgent } from '../base.agent';
import type {
  AgentContext,
  AgentOutcome,
  AgentResponse,
  AgentTool,
} from '../types';
import { db } from '@/server/infrastructure/database';
import {
  listings,
  aiGeneratedContent,
  type ContentType,
  type SocialPlatform,
} from '@/server/infrastructure/database/schema';

// ============================================
// CONTENT TEMPLATES
// ============================================

const PLATFORM_CONFIGS: Record<
  SocialPlatform | 'email' | 'generic',
  {
    maxLength: number;
    hashtagCount: number;
    tone: string;
    emoji: boolean;
    linkSupport: boolean;
  }
> = {
  facebook: {
    maxLength: 2000,
    hashtagCount: 5,
    tone: 'informative and engaging',
    emoji: true,
    linkSupport: true,
  },
  instagram: {
    maxLength: 2200,
    hashtagCount: 30,
    tone: 'visual and inspiring',
    emoji: true,
    linkSupport: false,
  },
  linkedin: {
    maxLength: 3000,
    hashtagCount: 5,
    tone: 'professional and authoritative',
    emoji: false,
    linkSupport: true,
  },
  tiktok: {
    maxLength: 150,
    hashtagCount: 10,
    tone: 'fun and trendy',
    emoji: true,
    linkSupport: false,
  },
  twitter: {
    maxLength: 280,
    hashtagCount: 3,
    tone: 'concise and punchy',
    emoji: true,
    linkSupport: true,
  },
  email: {
    maxLength: 5000,
    hashtagCount: 0,
    tone: 'professional and persuasive',
    emoji: false,
    linkSupport: true,
  },
  generic: {
    maxLength: 2000,
    hashtagCount: 5,
    tone: 'professional and clear',
    emoji: true,
    linkSupport: true,
  },
};

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: 'Formal, data-driven, focused on investment value and specifications',
  casual: 'Friendly, conversational, approachable, like chatting with a neighbor',
  luxury: 'Sophisticated, exclusive, emphasizing premium features and lifestyle',
  friendly: 'Warm, welcoming, emphasizing community and home comfort',
  urgent: 'Creates sense of scarcity, time-limited opportunity, must-see',
};

// ============================================
// TOOLS
// ============================================

const generateDescriptionTool: AgentTool = {
  name: 'generate_description',
  description: 'Genera una descripción optimizada para un listado inmobiliario',
  parameters: {
    listingId: { type: 'string', description: 'ID del listado', required: true },
    platform: { type: 'string', description: 'Plataforma destino' },
    tone: { type: 'string', description: 'Tono del contenido' },
    language: { type: 'string', description: 'Idioma (es, en, ca)' },
    maxLength: { type: 'number', description: 'Longitud máxima' },
  },
  execute: async (params, context) => {
    const {
      listingId,
      platform = 'generic',
      tone = 'professional',
      language = 'es',
      maxLength,
    } = params as {
      listingId: string;
      platform?: SocialPlatform | 'email' | 'generic';
      tone?: string;
      language?: string;
      maxLength?: number;
    };

    // Get listing
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    const platformConfig = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.generic;
    const toneDescription = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.professional;
    const targetLength = maxLength || platformConfig.maxLength;

    // Build the prompt
    const prompt = buildDescriptionPrompt(listing, {
      platform,
      tone: toneDescription,
      language,
      maxLength: targetLength,
      useEmoji: platformConfig.emoji,
    });

    // Generate using Gemini
    const generatedContent = await generateWithAI(prompt);

    // Save to database
    const [saved] = await db
      .insert(aiGeneratedContent)
      .values({
        listingId,
        userId: context.userId!,
        contentType: 'description',
        platform: platform === 'email' || platform === 'generic' ? null : platform,
        language,
        tone,
        content: generatedContent,
        metadata: {
          model: 'gemini-2.0-flash',
          generationTimeMs: Date.now(),
        },
      })
      .returning();

    return {
      success: true,
      data: {
        content: generatedContent,
        contentId: saved.id,
        platform,
        tone,
        language,
        characterCount: generatedContent.length,
      },
      isBillable: true,
      billableType: 'content_generated',
      billableAmount: 0.25,
    };
  },
};

const generateHashtagsTool: AgentTool = {
  name: 'generate_hashtags',
  description: 'Genera hashtags optimizados para una plataforma',
  parameters: {
    listingId: { type: 'string', description: 'ID del listado', required: true },
    platform: { type: 'string', description: 'Plataforma destino', required: true },
    count: { type: 'number', description: 'Número de hashtags' },
  },
  execute: async (params, context) => {
    const { listingId, platform, count } = params as {
      listingId: string;
      platform: SocialPlatform;
      count?: number;
    };

    // Get listing
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    const platformConfig = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.generic;
    const hashtagCount = count || platformConfig.hashtagCount;

    const prompt = buildHashtagPrompt(listing, platform, hashtagCount);
    const generatedContent = await generateWithAI(prompt);

    // Parse hashtags from response
    const hashtags = parseHashtags(generatedContent, hashtagCount);

    // Save to database
    const [saved] = await db
      .insert(aiGeneratedContent)
      .values({
        listingId,
        userId: context.userId!,
        contentType: 'hashtags',
        platform,
        content: hashtags.join(' '),
        metadata: {
          model: 'gemini-2.0-flash',
        },
      })
      .returning();

    return {
      success: true,
      data: {
        hashtags,
        contentId: saved.id,
        platform,
        count: hashtags.length,
      },
      isBillable: true,
      billableType: 'content_generated',
      billableAmount: 0.1,
    };
  },
};

const generateSocialPostTool: AgentTool = {
  name: 'generate_social_post',
  description: 'Genera un post completo optimizado para una red social',
  parameters: {
    listingId: { type: 'string', description: 'ID del listado', required: true },
    platform: { type: 'string', description: 'Plataforma destino', required: true },
    tone: { type: 'string', description: 'Tono del contenido' },
    includeHashtags: { type: 'boolean', description: 'Incluir hashtags' },
  },
  execute: async (params, context) => {
    const {
      listingId,
      platform,
      tone = 'professional',
      includeHashtags = true,
    } = params as {
      listingId: string;
      platform: SocialPlatform;
      tone?: string;
      includeHashtags?: boolean;
    };

    // Get listing
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    const platformConfig = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.generic;
    const toneDescription = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.professional;

    const prompt = buildSocialPostPrompt(listing, {
      platform,
      tone: toneDescription,
      maxLength: platformConfig.maxLength,
      useEmoji: platformConfig.emoji,
      includeHashtags,
      hashtagCount: platformConfig.hashtagCount,
    });

    const generatedContent = await generateWithAI(prompt);

    // Save to database
    const [saved] = await db
      .insert(aiGeneratedContent)
      .values({
        listingId,
        userId: context.userId!,
        contentType: 'social_post',
        platform,
        tone,
        content: generatedContent,
        metadata: {
          model: 'gemini-2.0-flash',
        },
      })
      .returning();

    return {
      success: true,
      data: {
        content: generatedContent,
        contentId: saved.id,
        platform,
        tone,
        characterCount: generatedContent.length,
      },
      isBillable: true,
      billableType: 'content_generated',
      billableAmount: 0.25,
    };
  },
};

const generateAdCopyTool: AgentTool = {
  name: 'generate_ad_copy',
  description: 'Genera copy para anuncios pagados (Facebook Ads, Google Ads)',
  parameters: {
    listingId: { type: 'string', description: 'ID del listado', required: true },
    adType: { type: 'string', description: 'Tipo de anuncio (facebook, google, instagram)' },
    objective: { type: 'string', description: 'Objetivo (awareness, leads, traffic)' },
  },
  execute: async (params, context) => {
    const { listingId, adType = 'facebook', objective = 'leads' } = params as {
      listingId: string;
      adType?: string;
      objective?: string;
    };

    // Get listing
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    const prompt = buildAdCopyPrompt(listing, adType, objective);
    const generatedContent = await generateWithAI(prompt);

    // Parse ad components
    const adComponents = parseAdCopy(generatedContent);

    // Save to database
    const [saved] = await db
      .insert(aiGeneratedContent)
      .values({
        listingId,
        userId: context.userId!,
        contentType: 'ad_copy',
        content: generatedContent,
        metadata: {
          model: 'gemini-2.0-flash',
        },
      })
      .returning();

    return {
      success: true,
      data: {
        ...adComponents,
        raw: generatedContent,
        contentId: saved.id,
        adType,
        objective,
      },
      isBillable: true,
      billableType: 'content_generated',
      billableAmount: 0.25,
    };
  },
};

const generateEmailTool: AgentTool = {
  name: 'generate_email',
  description: 'Genera un email de marketing o seguimiento',
  parameters: {
    listingId: { type: 'string', description: 'ID del listado', required: true },
    emailType: { type: 'string', description: 'Tipo de email (new_listing, follow_up, price_drop)' },
    recipientName: { type: 'string', description: 'Nombre del destinatario' },
  },
  execute: async (params, context) => {
    const { listingId, emailType = 'new_listing', recipientName } = params as {
      listingId: string;
      emailType?: string;
      recipientName?: string;
    };

    // Get listing
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    const prompt = buildEmailPrompt(listing, emailType, recipientName);
    const generatedContent = await generateWithAI(prompt);

    // Parse email components
    const emailComponents = parseEmail(generatedContent);

    // Save to database
    const [saved] = await db
      .insert(aiGeneratedContent)
      .values({
        listingId,
        userId: context.userId!,
        contentType: 'email_body',
        content: generatedContent,
        metadata: {
          model: 'gemini-2.0-flash',
        },
      })
      .returning();

    return {
      success: true,
      data: {
        ...emailComponents,
        raw: generatedContent,
        contentId: saved.id,
        emailType,
      },
      isBillable: true,
      billableType: 'content_generated',
      billableAmount: 0.25,
    };
  },
};

const getGeneratedContentTool: AgentTool = {
  name: 'get_generated_content',
  description: 'Recupera contenido generado previamente',
  parameters: {
    listingId: { type: 'string', description: 'ID del listado' },
    contentType: { type: 'string', description: 'Tipo de contenido' },
    platform: { type: 'string', description: 'Plataforma' },
  },
  execute: async (params, context) => {
    const { listingId, contentType, platform } = params as {
      listingId?: string;
      contentType?: ContentType;
      platform?: SocialPlatform;
    };

    let query = db
      .select()
      .from(aiGeneratedContent)
      .where(eq(aiGeneratedContent.userId, context.userId!));

    const content = await query;

    // Filter in memory
    const filtered = content.filter((item) => {
      if (listingId && item.listingId !== listingId) return false;
      if (contentType && item.contentType !== contentType) return false;
      if (platform && item.platform !== platform) return false;
      return true;
    });

    return {
      success: true,
      data: {
        items: filtered,
        count: filtered.length,
      },
    };
  },
};

// ============================================
// PROMPT BUILDERS
// ============================================

function buildDescriptionPrompt(
  listing: typeof listings.$inferSelect,
  options: {
    platform: string;
    tone: string;
    language: string;
    maxLength: number;
    useEmoji: boolean;
  }
): string {
  const price = listing.price
    ? new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(Number(listing.price))
    : 'Consultar';

  const features = [];
  if (listing.bedrooms) features.push(`${listing.bedrooms} habitaciones`);
  if (listing.bathrooms) features.push(`${listing.bathrooms} baños`);
  if (listing.sizeSqm) features.push(`${listing.sizeSqm}m² construidos`);
  if (listing.hasPool) features.push('piscina');
  if (listing.hasTerrace) features.push('terraza');
  if (listing.hasGarden) features.push('jardín');
  if (listing.hasParking) features.push('parking');
  if (listing.hasElevator) features.push('ascensor');

  return `Genera una descripción inmobiliaria atractiva para ${options.platform}.

PROPIEDAD:
- Título: ${listing.title}
- Tipo: ${listing.propertyType}
- Operación: ${listing.operationType === 'rent' ? 'Alquiler' : 'Venta'}
- Precio: ${price}
- Ubicación: ${listing.neighborhood || ''}, ${listing.city}, ${listing.province}
- Características: ${features.join(', ')}
- Año construcción: ${listing.yearBuilt || 'No especificado'}
- Certificación energética: ${listing.energyRating || 'No especificada'}

DESCRIPCIÓN ORIGINAL:
${listing.description || 'No disponible'}

REQUISITOS:
- Idioma: ${options.language === 'es' ? 'Español' : options.language === 'en' ? 'English' : 'Català'}
- Tono: ${options.tone}
- Longitud máxima: ${options.maxLength} caracteres
- Emojis: ${options.useEmoji ? 'Usar emojis apropiados' : 'No usar emojis'}
- Incluir llamada a la acción al final
- Destacar los puntos más atractivos
- NO inventar características que no estén listadas

Genera SOLO la descripción, sin comentarios adicionales.`;
}

function buildHashtagPrompt(
  listing: typeof listings.$inferSelect,
  platform: SocialPlatform,
  count: number
): string {
  return `Genera ${count} hashtags optimizados para ${platform} para esta propiedad inmobiliaria.

PROPIEDAD:
- Tipo: ${listing.propertyType}
- Operación: ${listing.operationType}
- Ciudad: ${listing.city}
- Barrio: ${listing.neighborhood || 'No especificado'}
- Características destacadas: ${[
    listing.hasPool ? 'piscina' : null,
    listing.hasTerrace ? 'terraza' : null,
    listing.hasGarden ? 'jardín' : null,
  ]
    .filter(Boolean)
    .join(', ') || 'estándar'}

REQUISITOS:
- Exactamente ${count} hashtags
- Mezcla de hashtags populares y específicos
- Incluir hashtags de ubicación
- Optimizados para ${platform}
- En español
- Sin el símbolo # al inicio (lo añadiré después)

Responde SOLO con los hashtags separados por espacios.`;
}

function buildSocialPostPrompt(
  listing: typeof listings.$inferSelect,
  options: {
    platform: SocialPlatform;
    tone: string;
    maxLength: number;
    useEmoji: boolean;
    includeHashtags: boolean;
    hashtagCount: number;
  }
): string {
  const price = listing.price
    ? new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(Number(listing.price))
    : 'Consultar';

  return `Genera un post para ${options.platform} sobre esta propiedad.

PROPIEDAD:
- Título: ${listing.title}
- Tipo: ${listing.propertyType}
- Operación: ${listing.operationType === 'rent' ? 'Alquiler' : 'Venta'}
- Precio: ${price}
- Ubicación: ${listing.city}
- Habitaciones: ${listing.bedrooms || 'No especificado'}
- Baños: ${listing.bathrooms || 'No especificado'}
- Tamaño: ${listing.sizeSqm ? `${listing.sizeSqm}m²` : 'No especificado'}

REQUISITOS PARA ${options.platform.toUpperCase()}:
- Tono: ${options.tone}
- Longitud máxima: ${options.maxLength} caracteres
- Emojis: ${options.useEmoji ? 'Sí, apropiados' : 'No'}
- Hashtags: ${options.includeHashtags ? `Sí, ${options.hashtagCount} al final` : 'No'}
- Llamada a la acción clara
- Optimizado para engagement

Genera SOLO el post completo, listo para publicar.`;
}

function buildAdCopyPrompt(
  listing: typeof listings.$inferSelect,
  adType: string,
  objective: string
): string {
  const price = listing.price
    ? new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(Number(listing.price))
    : 'Consultar';

  return `Genera copy para un anuncio de ${adType} con objetivo de ${objective}.

PROPIEDAD:
- Título: ${listing.title}
- Tipo: ${listing.propertyType}
- Operación: ${listing.operationType === 'rent' ? 'Alquiler' : 'Venta'}
- Precio: ${price}
- Ubicación: ${listing.city}, ${listing.neighborhood || ''}
- Características principales: ${listing.bedrooms || 0} hab, ${listing.bathrooms || 0} baños, ${listing.sizeSqm || 0}m²

FORMATO DE RESPUESTA:
HEADLINE: [Titular principal - max 40 caracteres]
PRIMARY_TEXT: [Texto principal del anuncio - max 125 caracteres]
DESCRIPTION: [Descripción adicional - max 30 caracteres]
CTA: [Llamada a la acción sugerida]

Genera copy persuasivo y optimizado para conversión.`;
}

function buildEmailPrompt(
  listing: typeof listings.$inferSelect,
  emailType: string,
  recipientName?: string
): string {
  const price = listing.price
    ? new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(Number(listing.price))
    : 'Consultar';

  const greeting = recipientName ? `Hola ${recipientName}` : 'Hola';

  const emailTypes: Record<string, string> = {
    new_listing: 'anunciar una nueva propiedad que podría interesarte',
    follow_up: 'hacer seguimiento de tu interés en esta propiedad',
    price_drop: 'informarte de una bajada de precio en esta propiedad',
  };

  return `Genera un email de marketing inmobiliario.

OBJETIVO: ${emailTypes[emailType] || emailType}

PROPIEDAD:
- Título: ${listing.title}
- Tipo: ${listing.propertyType}
- Operación: ${listing.operationType === 'rent' ? 'Alquiler' : 'Venta'}
- Precio: ${price}
- Ubicación: ${listing.city}
- Características: ${listing.bedrooms || 0} hab, ${listing.bathrooms || 0} baños

FORMATO DE RESPUESTA:
SUBJECT: [Asunto del email - max 60 caracteres, atractivo]
BODY:
${greeting},

[Cuerpo del email - profesional, persuasivo, con CTA claro]

Saludos,
[Espacio para firma]

Genera un email profesional y persuasivo en español.`;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function generateWithAI(prompt: string): Promise<string> {
  // Using the base agent's model
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const { env } = await import('@/config/env');

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

function parseHashtags(content: string, maxCount: number): string[] {
  const hashtags = content
    .split(/[\s,#]+/)
    .filter((tag) => tag.length > 0 && tag.length < 50)
    .map((tag) => tag.toLowerCase().replace(/[^a-záéíóúñü0-9]/gi, ''))
    .filter((tag) => tag.length > 0)
    .slice(0, maxCount);

  return [...new Set(hashtags)]; // Remove duplicates
}

function parseAdCopy(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  const patterns = {
    headline: /HEADLINE:\s*(.+?)(?:\n|$)/i,
    primaryText: /PRIMARY_TEXT:\s*(.+?)(?:\n|$)/i,
    description: /DESCRIPTION:\s*(.+?)(?:\n|$)/i,
    cta: /CTA:\s*(.+?)(?:\n|$)/i,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      result[key] = match[1].trim();
    }
  }

  return result;
}

function parseEmail(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  const subjectMatch = content.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
  if (subjectMatch) {
    result.subject = subjectMatch[1].trim();
  }

  const bodyMatch = content.match(/BODY:\s*([\s\S]+?)(?:$)/i);
  if (bodyMatch) {
    result.body = bodyMatch[1].trim();
  }

  return result;
}

// ============================================
// CONTENT AGENT CLASS
// ============================================

export class ContentAgent extends BaseAgent {
  constructor() {
    super({
      type: 'content',
      name: 'Content Generation Agent',
      description: 'Genera contenido de marketing inmobiliario con IA',
      capabilities: [
        'Descripciones optimizadas para cada plataforma',
        'Hashtags trending por red social',
        'Posts completos listos para publicar',
        'Copy para anuncios pagados',
        'Emails de marketing y seguimiento',
        'Múltiples tonos e idiomas',
      ],
      pricing: {
        sessionCost: 0,
        outcomeCost: 0.25, // 0.25€ por generación
        billableOutcomes: ['content_generated'],
      },
      limits: {
        maxTokensPerRequest: 8192,
        maxTurns: 20,
        sessionTimeoutMinutes: 30,
        maxConcurrentSessions: 10,
      },
      systemPrompt: `Eres un experto copywriter especializado en marketing inmobiliario para el mercado español.

CAPACIDADES:
- Generar descripciones atractivas y SEO-optimizadas
- Crear hashtags trending por plataforma
- Escribir posts de redes sociales
- Redactar copy para anuncios pagados
- Crear emails de marketing persuasivos

REGLAS:
1. Adapta el tono a cada plataforma
2. Usa datos reales de la propiedad, NO inventes
3. Incluye siempre llamadas a la acción
4. Optimiza para engagement y conversión
5. Mantén la longitud dentro de límites de plataforma

IDIOMAS SOPORTADOS: Español, Inglés, Catalán, Euskera, Gallego`,
      tools: [
        generateDescriptionTool,
        generateHashtagsTool,
        generateSocialPostTool,
        generateAdCopyTool,
        generateEmailTool,
        getGeneratedContentTool,
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

    const prompt = `${conversationContext}

Usuario: ${userMessage}

Analiza la solicitud y determina qué tipo de contenido generar.
Si mencionan "descripción", usa generate_description.
Si mencionan "hashtags", usa generate_hashtags.
Si mencionan "post" o red social específica, usa generate_social_post.
Si mencionan "anuncio" o "ad", usa generate_ad_copy.
Si mencionan "email", usa generate_email.

Responde en español de forma concisa indicando qué contenido has generado.`;

    const modelResponse = await this.generateModelResponse(prompt);

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
            `Contenido generado: ${parsed.tool}`,
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
      'Generar descripción profesional',
      'Crear post para Instagram',
      'Generar hashtags trending',
      'Escribir email de marketing',
      'Copy para Facebook Ads',
    ];
  }
}

// Export singleton
export const contentAgent = new ContentAgent();
