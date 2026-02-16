/**
 * Content Generation tRPC Router
 * Handles AI-powered content generation for listings
 */

import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/server/infrastructure/database';
import { listings, aiGeneratedContent } from '@/server/infrastructure/database/schema';
import { env } from '@/config/env';

// ============================================
// SCHEMAS
// ============================================

const contentTypeSchema = z.enum([
  'description',
  'short_description',
  'hashtags',
  'social_post',
  'ad_copy',
  'email_subject',
  'email_body',
  'video_script',
  'seo_title',
  'seo_description',
]);

const platformSchema = z.enum(['facebook', 'instagram', 'linkedin', 'tiktok', 'twitter']).optional();

const toneSchema = z.enum(['professional', 'casual', 'luxury', 'friendly', 'urgent']).optional();

const generateSchema = z.object({
  listingId: z.string().uuid(),
  contentType: contentTypeSchema,
  platform: platformSchema,
  tone: toneSchema,
  language: z.enum(['es', 'en', 'ca', 'eu', 'gl']).default('es'),
  maxLength: z.number().min(50).max(10000).optional(),
});

// ============================================
// AI HELPER
// ============================================

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

async function generateContent(prompt: string): Promise<string> {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ============================================
// ROUTER
// ============================================

export const contentRouter = router({
  /**
   * Generate content for a listing
   */
  generate: protectedProcedure.input(generateSchema).mutation(async ({ input, ctx }) => {
    const { listingId, contentType, platform, tone, language, maxLength } = input;

    // Get listing
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);

    if (!listing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
    }

    // Build prompt based on content type
    const prompt = buildPrompt(listing, contentType, {
      platform,
      tone: tone || 'professional',
      language,
      maxLength,
    });

    // Generate content
    const generatedText = await generateContent(prompt);

    // Save to database
    const [saved] = await db
      .insert(aiGeneratedContent)
      .values({
        listingId,
        userId: ctx.session.user.id,
        contentType,
        platform,
        language,
        tone,
        content: generatedText,
        metadata: {
          model: 'gemini-2.0-flash',
        },
      })
      .returning();

    return {
      success: true,
      content: generatedText,
      contentId: saved.id,
      contentType,
      platform,
      characterCount: generatedText.length,
    };
  }),

  /**
   * Get generated content for a listing
   */
  getGenerated: protectedProcedure
    .input(
      z.object({
        listingId: z.string().uuid().optional(),
        contentType: contentTypeSchema.optional(),
        platform: platformSchema,
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      let query = db
        .select()
        .from(aiGeneratedContent)
        .where(eq(aiGeneratedContent.userId, ctx.session.user.id))
        .orderBy(desc(aiGeneratedContent.createdAt))
        .limit(input.limit);

      const items = await query;

      // Filter in memory for optional fields
      const filtered = items.filter((item) => {
        if (input.listingId && item.listingId !== input.listingId) return false;
        if (input.contentType && item.contentType !== input.contentType) return false;
        if (input.platform && item.platform !== input.platform) return false;
        return true;
      });

      return { items: filtered, count: filtered.length };
    }),

  /**
   * Rate generated content (for improving quality)
   */
  rate: protectedProcedure
    .input(
      z.object({
        contentId: z.string().uuid(),
        rating: z.number().min(1).max(5),
        feedback: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [content] = await db
        .select()
        .from(aiGeneratedContent)
        .where(eq(aiGeneratedContent.id, input.contentId))
        .limit(1);

      if (!content || content.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Content not found' });
      }

      await db
        .update(aiGeneratedContent)
        .set({
          rating: input.rating,
          feedback: input.feedback,
        })
        .where(eq(aiGeneratedContent.id, input.contentId));

      return { success: true };
    }),

  /**
   * Mark content as used (for tracking)
   */
  markUsed: protectedProcedure
    .input(z.object({ contentId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [content] = await db
        .select()
        .from(aiGeneratedContent)
        .where(eq(aiGeneratedContent.id, input.contentId))
        .limit(1);

      if (!content || content.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Content not found' });
      }

      await db
        .update(aiGeneratedContent)
        .set({
          usedCount: (content.usedCount || 0) + 1,
          lastUsedAt: new Date(),
        })
        .where(eq(aiGeneratedContent.id, input.contentId));

      return { success: true };
    }),

  /**
   * Bulk generate content for multiple types
   */
  bulkGenerate: protectedProcedure
    .input(
      z.object({
        listingId: z.string().uuid(),
        contentTypes: z.array(contentTypeSchema).min(1).max(5),
        platform: platformSchema,
        tone: toneSchema,
        language: z.enum(['es', 'en']).default('es'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { listingId, contentTypes, platform, tone, language } = input;

      // Get listing
      const [listing] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, listingId))
        .limit(1);

      if (!listing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
      }

      const results: Record<string, { content: string; contentId: string }> = {};

      // Generate each type
      for (const contentType of contentTypes) {
        try {
          const prompt = buildPrompt(listing, contentType, {
            platform,
            tone: tone || 'professional',
            language,
          });

          const generatedText = await generateContent(prompt);

          const [saved] = await db
            .insert(aiGeneratedContent)
            .values({
              listingId,
              userId: ctx.session.user.id,
              contentType,
              platform,
              language,
              tone,
              content: generatedText,
              metadata: {
                model: 'gemini-2.0-flash',
              },
            })
            .returning();

          results[contentType] = {
            content: generatedText,
            contentId: saved.id,
          };
        } catch (error) {
          console.error(`Failed to generate ${contentType}:`, error);
        }
      }

      return {
        success: Object.keys(results).length > 0,
        results,
        generated: Object.keys(results).length,
        requested: contentTypes.length,
      };
    }),
});

// ============================================
// PROMPT BUILDER
// ============================================

function buildPrompt(
  listing: typeof listings.$inferSelect,
  contentType: string,
  options: {
    platform?: string | null;
    tone: string;
    language: string;
    maxLength?: number;
  }
): string {
  const price = listing.price
    ? new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(Number(listing.price))
    : 'Consultar';

  const baseInfo = `
PROPIEDAD:
- Título: ${listing.title}
- Tipo: ${listing.propertyType}
- Operación: ${listing.operationType === 'rent' ? 'Alquiler' : 'Venta'}
- Precio: ${price}
- Ubicación: ${listing.neighborhood || ''}, ${listing.city}, ${listing.province}
- Habitaciones: ${listing.bedrooms || 'No especificado'}
- Baños: ${listing.bathrooms || 'No especificado'}
- Tamaño: ${listing.sizeSqm ? `${listing.sizeSqm}m²` : 'No especificado'}
- Características: ${[
    listing.hasPool ? 'Piscina' : null,
    listing.hasTerrace ? 'Terraza' : null,
    listing.hasGarden ? 'Jardín' : null,
    listing.hasParking ? 'Parking' : null,
    listing.hasElevator ? 'Ascensor' : null,
  ]
    .filter(Boolean)
    .join(', ') || 'Estándar'}

DESCRIPCIÓN ORIGINAL:
${listing.description || 'No disponible'}
`;

  const languageName =
    options.language === 'es'
      ? 'español'
      : options.language === 'en'
        ? 'inglés'
        : options.language === 'ca'
          ? 'catalán'
          : 'español';

  switch (contentType) {
    case 'description':
      return `Genera una descripción inmobiliaria atractiva y profesional.
${baseInfo}
REQUISITOS:
- Idioma: ${languageName}
- Tono: ${options.tone}
- Longitud: ${options.maxLength || 500} caracteres aprox.
- Incluir llamada a la acción
- SEO-optimizada
- NO inventar características

Genera SOLO la descripción, sin comentarios.`;

    case 'short_description':
      return `Genera una descripción corta para preview/snippet.
${baseInfo}
REQUISITOS:
- Idioma: ${languageName}
- Máximo 150 caracteres
- Captar atención inmediatamente

Genera SOLO la descripción corta.`;

    case 'hashtags':
      const hashtagCount = options.platform === 'instagram' ? 25 : 5;
      return `Genera ${hashtagCount} hashtags para ${options.platform || 'redes sociales'}.
${baseInfo}
REQUISITOS:
- Mezcla hashtags populares y específicos
- Incluir ubicación
- Sin símbolo #
- Separados por espacios

Genera SOLO los hashtags.`;

    case 'social_post':
      return `Genera un post para ${options.platform || 'redes sociales'}.
${baseInfo}
REQUISITOS:
- Idioma: ${languageName}
- Tono: ${options.tone}
- Optimizado para ${options.platform || 'engagement'}
- Incluir emojis apropiados
- Incluir 5 hashtags al final
- Llamada a la acción

Genera SOLO el post listo para publicar.`;

    case 'ad_copy':
      return `Genera copy para anuncio de ${options.platform || 'Facebook'}.
${baseInfo}
FORMATO:
HEADLINE: [max 40 caracteres]
PRIMARY_TEXT: [max 125 caracteres]
DESCRIPTION: [max 30 caracteres]
CTA: [acción sugerida]

Genera copy persuasivo para conversión.`;

    case 'email_subject':
      return `Genera un asunto de email atractivo para esta propiedad.
${baseInfo}
REQUISITOS:
- Máximo 60 caracteres
- Crear curiosidad
- Idioma: ${languageName}

Genera SOLO el asunto.`;

    case 'email_body':
      return `Genera el cuerpo de un email de marketing inmobiliario.
${baseInfo}
REQUISITOS:
- Idioma: ${languageName}
- Tono: profesional pero cercano
- Incluir CTA claro
- Estructura: saludo, presentación, características, CTA, despedida

Genera SOLO el cuerpo del email.`;

    case 'seo_title':
      return `Genera un título SEO para esta propiedad.
${baseInfo}
REQUISITOS:
- Máximo 60 caracteres
- Incluir ubicación y tipo
- Idioma: ${languageName}
- Palabras clave relevantes

Genera SOLO el título SEO.`;

    case 'seo_description':
      return `Genera una meta description SEO.
${baseInfo}
REQUISITOS:
- Máximo 160 caracteres
- Incluir precio y ubicación
- Llamada a la acción
- Idioma: ${languageName}

Genera SOLO la meta description.`;

    default:
      return `Genera contenido de marketing para esta propiedad.
${baseInfo}
Tipo: ${contentType}
Idioma: ${languageName}
Tono: ${options.tone}`;
  }
}
