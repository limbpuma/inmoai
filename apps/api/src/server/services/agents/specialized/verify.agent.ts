/**
 * Verify Agent - Property Verification Specialist
 * Analyzes listings for authenticity, fraud detection, and quality
 */

import { BaseAgent } from '../base.agent';
import { agentRegistry, DEFAULT_AGENT_CONFIGS } from '../registry';
import type {
  AgentConfig,
  AgentContext,
  AgentResponse,
  AgentTool,
  ToolResult,
  VerificationResult,
  VerificationCheck,
  AgentOutcome,
} from '../types';
import { db } from '@/server/infrastructure/database';
import { listings, listingImages, priceHistory } from '@/server/infrastructure/database/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { aiEngine } from '@/server/services/ai';

// Verify listing tool
const verifyListingTool: AgentTool = {
  name: 'verify_listing',
  description: 'Realiza una verificación completa de una propiedad',
  parameters: {
    listingId: { type: 'string', description: 'ID de la propiedad', required: true },
    includeImageAnalysis: { type: 'boolean', description: 'Incluir análisis de imágenes', required: false },
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const listing = await db.query.listings.findFirst({
        where: eq(listings.id, params.listingId as string),
        with: {
          images: {
            orderBy: (img, { asc }) => [asc(img.position)],
            limit: 10,
          },
          priceHistory: {
            orderBy: (ph, { desc }) => [desc(ph.recordedAt)],
            limit: 20,
          },
        },
      });

      if (!listing) {
        return {
          success: false,
          error: 'Propiedad no encontrada',
        };
      }

      const checks: VerificationCheck[] = [];
      let overallScore = 100;
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // 1. Price Analysis
      const priceCheck = analyzePricing(listing);
      checks.push(priceCheck);
      if (priceCheck.status === 'warning') {
        overallScore -= 15;
        warnings.push(priceCheck.details);
      } else if (priceCheck.status === 'failed') {
        overallScore -= 30;
        warnings.push(priceCheck.details);
      }

      // 2. Completeness Check
      const completenessCheck = analyzeCompleteness(listing);
      checks.push(completenessCheck);
      if (completenessCheck.status === 'warning') {
        overallScore -= 10;
        recommendations.push('Añadir información faltante mejorará la confianza del comprador');
      } else if (completenessCheck.status === 'failed') {
        overallScore -= 20;
        warnings.push('Información crítica faltante');
      }

      // 3. Image Analysis (if existing scores available)
      if (listing.images && listing.images.length > 0) {
        const imageCheck = analyzeImages(listing.images);
        checks.push(imageCheck);
        if (imageCheck.status === 'warning') {
          overallScore -= 10;
          warnings.push(imageCheck.details);
        } else if (imageCheck.status === 'failed') {
          overallScore -= 25;
          warnings.push(imageCheck.details);
        }
      } else {
        checks.push({
          name: 'Imágenes',
          status: 'failed',
          score: 0,
          details: 'No hay imágenes disponibles',
        });
        overallScore -= 20;
        warnings.push('Sin imágenes');
      }

      // 4. Price History Analysis
      if (listing.priceHistory && listing.priceHistory.length > 1) {
        const priceHistoryCheck = analyzePriceHistory(listing.priceHistory);
        checks.push(priceHistoryCheck);
        if (priceHistoryCheck.status === 'warning') {
          overallScore -= 10;
          warnings.push(priceHistoryCheck.details);
        }
      }

      // 5. Location Verification
      const locationCheck = analyzeLocation(listing);
      checks.push(locationCheck);
      if (locationCheck.status === 'warning') {
        overallScore -= 10;
      } else if (locationCheck.status === 'failed') {
        overallScore -= 20;
        warnings.push('Ubicación no verificable');
      }

      // 6. Existing AI Analysis Check
      if (listing.authenticityScore !== null) {
        const aiCheck: VerificationCheck = {
          name: 'Análisis IA Previo',
          status: listing.authenticityScore > 70 ? 'passed' :
                  listing.authenticityScore > 40 ? 'warning' : 'failed',
          score: listing.authenticityScore,
          details: `Puntuación de autenticidad previa: ${listing.authenticityScore}/100`,
        };
        checks.push(aiCheck);
      }

      // Generate recommendations
      if (overallScore < 70) {
        recommendations.push('Solicitar documentación adicional al vendedor');
        recommendations.push('Realizar visita presencial antes de cualquier compromiso');
      }
      if (warnings.some(w => w.includes('precio'))) {
        recommendations.push('Comparar con propiedades similares en la zona');
      }

      // Ensure score is within bounds
      overallScore = Math.max(0, Math.min(100, overallScore));

      const result: VerificationResult = {
        listingId: listing.id,
        overallScore,
        isVerified: overallScore >= 70,
        checks,
        warnings,
        recommendations,
      };

      return {
        success: true,
        data: result,
        isBillable: true,
        billableType: 'verification',
        billableAmount: 1.0, // 1 EUR per verification
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  },
};

// Compare with similar listings tool
const compareListingsTool: AgentTool = {
  name: 'compare_similar',
  description: 'Compara una propiedad con otras similares en la zona',
  parameters: {
    listingId: { type: 'string', description: 'ID de la propiedad', required: true },
    radiusKm: { type: 'number', description: 'Radio de búsqueda en km', required: false },
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const listing = await db.query.listings.findFirst({
        where: eq(listings.id, params.listingId as string),
      });

      if (!listing) {
        return { success: false, error: 'Propiedad no encontrada' };
      }

      // Find similar listings (same city, similar size, same type)
      const sizeTolerance = (listing.sizeSqm ?? 100) * 0.3;
      const similar = await db
        .select({
          id: listings.id,
          title: listings.title,
          price: listings.price,
          sizeSqm: listings.sizeSqm,
          bedrooms: listings.bedrooms,
          neighborhood: listings.neighborhood,
          pricePerSqm: listings.pricePerSqm,
        })
        .from(listings)
        .where(
          sql`${listings.city} = ${listing.city}
              AND ${listings.propertyType} = ${listing.propertyType}
              AND ${listings.operationType} = ${listing.operationType}
              AND ${listings.status} = 'active'
              AND ${listings.id} != ${listing.id}
              AND ABS(${listings.sizeSqm} - ${listing.sizeSqm ?? 100}) < ${sizeTolerance}`
        )
        .orderBy(sql`ABS(${listings.sizeSqm} - ${listing.sizeSqm ?? 100})`)
        .limit(5);

      const currentPricePerSqm = listing.pricePerSqm ? parseFloat(listing.pricePerSqm) :
                                  (listing.price && listing.sizeSqm) ?
                                  parseFloat(listing.price) / listing.sizeSqm : 0;

      const comparisons = similar.map(s => {
        const sPricePerSqm = s.pricePerSqm ? parseFloat(s.pricePerSqm) :
                             (s.price && s.sizeSqm) ? parseFloat(s.price) / s.sizeSqm : 0;
        const priceDiff = currentPricePerSqm > 0 ?
                         ((sPricePerSqm - currentPricePerSqm) / currentPricePerSqm * 100) : 0;

        return {
          id: s.id,
          title: s.title,
          price: parseFloat(s.price ?? '0'),
          sizeSqm: s.sizeSqm,
          bedrooms: s.bedrooms,
          pricePerSqm: sPricePerSqm,
          priceDifferencePercent: priceDiff,
          neighborhood: s.neighborhood,
        };
      });

      const avgPricePerSqm = comparisons.length > 0 ?
        comparisons.reduce((sum, c) => sum + c.pricePerSqm, 0) / comparisons.length : 0;

      const marketPosition = currentPricePerSqm > 0 && avgPricePerSqm > 0 ?
        ((currentPricePerSqm - avgPricePerSqm) / avgPricePerSqm * 100) : 0;

      return {
        success: true,
        data: {
          currentListing: {
            id: listing.id,
            pricePerSqm: currentPricePerSqm,
          },
          comparables: comparisons,
          analysis: {
            averagePricePerSqm: avgPricePerSqm,
            marketPosition: marketPosition,
            assessment: marketPosition < -20 ? 'Precio significativamente por debajo del mercado' :
                        marketPosition < -10 ? 'Precio ligeramente por debajo del mercado' :
                        marketPosition > 20 ? 'Precio significativamente por encima del mercado' :
                        marketPosition > 10 ? 'Precio ligeramente por encima del mercado' :
                        'Precio acorde al mercado',
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Comparison failed',
      };
    }
  },
};

// Helper functions for verification checks
function analyzePricing(listing: typeof listings.$inferSelect): VerificationCheck {
  const price = listing.price ? parseFloat(listing.price) : 0;
  const sizeSqm = listing.sizeSqm ?? 0;

  if (price === 0 || sizeSqm === 0) {
    return {
      name: 'Análisis de Precio',
      status: 'warning',
      score: 50,
      details: 'Información de precio o tamaño incompleta',
    };
  }

  const pricePerSqm = price / sizeSqm;

  // Very simplified market analysis - would need real market data
  const isSpain = listing.country === 'España' || !listing.country;

  if (isSpain) {
    if (pricePerSqm < 500) {
      return {
        name: 'Análisis de Precio',
        status: 'failed',
        score: 20,
        details: `Precio/m² sospechosamente bajo (${Math.round(pricePerSqm)}€/m²). Riesgo de fraude.`,
      };
    } else if (pricePerSqm < 1000) {
      return {
        name: 'Análisis de Precio',
        status: 'warning',
        score: 60,
        details: `Precio/m² por debajo de la media (${Math.round(pricePerSqm)}€/m²). Verificar detalles.`,
      };
    } else if (pricePerSqm > 15000) {
      return {
        name: 'Análisis de Precio',
        status: 'warning',
        score: 70,
        details: `Precio/m² muy alto (${Math.round(pricePerSqm)}€/m²). Puede ser zona premium.`,
      };
    }
  }

  return {
    name: 'Análisis de Precio',
    status: 'passed',
    score: 90,
    details: `Precio/m² dentro de rangos normales (${Math.round(pricePerSqm)}€/m²)`,
  };
}

function analyzeCompleteness(listing: typeof listings.$inferSelect): VerificationCheck {
  const criticalFields = ['title', 'price', 'city'];
  const importantFields = ['description', 'bedrooms', 'sizeSqm', 'address'];
  const optionalFields = ['floor', 'yearBuilt', 'energyRating'];

  const missingCritical = criticalFields.filter(f => !listing[f as keyof typeof listing]);
  const missingImportant = importantFields.filter(f => !listing[f as keyof typeof listing]);
  const missingOptional = optionalFields.filter(f => !listing[f as keyof typeof listing]);

  if (missingCritical.length > 0) {
    return {
      name: 'Completitud de Datos',
      status: 'failed',
      score: 20,
      details: `Campos críticos faltantes: ${missingCritical.join(', ')}`,
    };
  }

  if (missingImportant.length > 2) {
    return {
      name: 'Completitud de Datos',
      status: 'warning',
      score: 60,
      details: `Varios campos importantes sin completar: ${missingImportant.join(', ')}`,
    };
  }

  const totalFields = criticalFields.length + importantFields.length + optionalFields.length;
  const completedFields = totalFields - missingImportant.length - missingOptional.length;
  const score = Math.round((completedFields / totalFields) * 100);

  return {
    name: 'Completitud de Datos',
    status: score >= 80 ? 'passed' : 'warning',
    score,
    details: `${score}% de información completada`,
  };
}

function analyzeImages(images: typeof listingImages.$inferSelect[]): VerificationCheck {
  const totalImages = images.length;

  if (totalImages === 0) {
    return {
      name: 'Calidad de Imágenes',
      status: 'failed',
      score: 0,
      details: 'Sin imágenes',
    };
  }

  if (totalImages < 3) {
    return {
      name: 'Calidad de Imágenes',
      status: 'warning',
      score: 50,
      details: 'Pocas imágenes disponibles (menos de 3)',
    };
  }

  // Check for AI-generated or edited images
  const aiGeneratedCount = images.filter(img => img.isAiGenerated).length;
  const editedCount = images.filter(img => img.isEdited).length;
  const avgQuality = images.reduce((sum, img) => sum + (img.qualityScore ?? 70), 0) / totalImages;

  if (aiGeneratedCount > totalImages / 2) {
    return {
      name: 'Calidad de Imágenes',
      status: 'failed',
      score: 30,
      details: 'Mayoría de imágenes generadas por IA',
    };
  }

  if (editedCount > totalImages / 2) {
    return {
      name: 'Calidad de Imágenes',
      status: 'warning',
      score: 60,
      details: 'Varias imágenes con edición significativa',
    };
  }

  return {
    name: 'Calidad de Imágenes',
    status: avgQuality >= 70 ? 'passed' : 'warning',
    score: Math.round(avgQuality),
    details: `${totalImages} imágenes, calidad media: ${Math.round(avgQuality)}/100`,
  };
}

function analyzePriceHistory(history: typeof priceHistory.$inferSelect[]): VerificationCheck {
  if (history.length < 2) {
    return {
      name: 'Historial de Precios',
      status: 'passed',
      score: 80,
      details: 'Sin cambios de precio significativos',
    };
  }

  const currentPrice = parseFloat(history[0].price);
  const oldestPrice = parseFloat(history[history.length - 1].price);
  const priceChange = ((currentPrice - oldestPrice) / oldestPrice) * 100;
  const daysBetween = Math.round(
    (new Date(history[0].recordedAt).getTime() - new Date(history[history.length - 1].recordedAt).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  // Rapid price changes are suspicious
  if (Math.abs(priceChange) > 30 && daysBetween < 30) {
    return {
      name: 'Historial de Precios',
      status: 'warning',
      score: 50,
      details: `Cambio de precio significativo (${priceChange > 0 ? '+' : ''}${Math.round(priceChange)}%) en poco tiempo`,
    };
  }

  if (priceChange < -20) {
    return {
      name: 'Historial de Precios',
      status: 'warning',
      score: 70,
      details: `Reducción de precio del ${Math.round(Math.abs(priceChange))}% - podría indicar urgencia de venta`,
    };
  }

  return {
    name: 'Historial de Precios',
    status: 'passed',
    score: 90,
    details: `${history.length} registros de precio, variación del ${priceChange > 0 ? '+' : ''}${Math.round(priceChange)}%`,
  };
}

function analyzeLocation(listing: typeof listings.$inferSelect): VerificationCheck {
  const hasCoordinates = listing.latitude && listing.longitude;
  const hasAddress = !!listing.address;
  const hasCity = !!listing.city;

  if (hasCoordinates && hasAddress && hasCity) {
    return {
      name: 'Verificación de Ubicación',
      status: 'passed',
      score: 95,
      details: 'Ubicación completa con coordenadas verificables',
    };
  }

  if (hasCity && (hasAddress || hasCoordinates)) {
    return {
      name: 'Verificación de Ubicación',
      status: 'passed',
      score: 80,
      details: 'Ubicación parcialmente verificable',
    };
  }

  if (hasCity) {
    return {
      name: 'Verificación de Ubicación',
      status: 'warning',
      score: 60,
      details: 'Solo ciudad disponible, sin dirección exacta',
    };
  }

  return {
    name: 'Verificación de Ubicación',
    status: 'failed',
    score: 20,
    details: 'Información de ubicación insuficiente',
  };
}

// System prompt
const VERIFY_AGENT_SYSTEM_PROMPT = `Eres un agente de verificación inmobiliaria experto. Tu objetivo es analizar propiedades para detectar posibles fraudes, inconsistencias y evaluar la confiabilidad del anuncio.

CAPACIDADES:
- Verificar autenticidad de anuncios
- Detectar precios sospechosos
- Analizar calidad de imágenes
- Comparar con propiedades similares
- Evaluar completitud de información

INSTRUCCIONES:
1. Cuando el usuario proporcione una propiedad, realiza una verificación completa
2. Explica cada check de forma clara
3. Da recomendaciones específicas según los resultados
4. Sé objetivo y honesto sobre los riesgos

FORMATO DE RESPUESTA:
- Usa emojis para indicar estado: ✅ OK, ⚠️ Advertencia, ❌ Problema
- Proporciona una puntuación clara (0-100)
- Lista las recomendaciones de forma accionable`;

export class VerifyAgent extends BaseAgent {
  constructor() {
    const baseConfig = DEFAULT_AGENT_CONFIGS.verify;

    const config: AgentConfig = {
      type: 'verify',
      name: baseConfig.name!,
      description: baseConfig.description!,
      capabilities: baseConfig.capabilities!,
      pricing: baseConfig.pricing!,
      limits: baseConfig.limits!,
      systemPrompt: VERIFY_AGENT_SYSTEM_PROMPT,
      tools: [verifyListingTool, compareListingsTool],
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

    // Check if user provided a listing ID or wants to verify from context
    const listingIdMatch = userMessage.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    const listingId = listingIdMatch?.[0] || context.initialContext.listingId;

    if (!listingId) {
      return {
        response: 'Por favor, proporciona el ID de la propiedad que quieres verificar, o selecciona una propiedad desde los resultados de búsqueda.',
        toolCalls: [],
        outcomes: [],
      };
    }

    // Execute verification
    const verifyResult = await this.executeTool('verify_listing', {
      listingId,
      includeImageAnalysis: true,
    }, context);

    toolCalls.push({
      name: 'verify_listing',
      args: { listingId },
      result: verifyResult.success ? 'OK' : verifyResult.error,
    });

    if (!verifyResult.success) {
      return {
        response: `No pude verificar la propiedad: ${verifyResult.error}`,
        toolCalls,
        outcomes,
      };
    }

    const verification = verifyResult.data as VerificationResult;

    // Create billable outcome
    if (verifyResult.isBillable) {
      outcomes.push(this.createOutcome(
        'verification',
        `Verificación completada: ${verification.overallScore}/100`,
        { listingId, score: verification.overallScore },
        verifyResult.billableAmount
      ));
    }

    // Also get comparables if score is concerning
    let comparablesText = '';
    if (verification.overallScore < 70) {
      const compareResult = await this.executeTool('compare_similar', { listingId }, context);
      if (compareResult.success && compareResult.data) {
        const compareData = compareResult.data as Record<string, unknown>;
        const analysis = compareData.analysis as Record<string, unknown>;
        comparablesText = `\n\n📊 **Comparación de Mercado:**\n${analysis.assessment}`;
      }
    }

    // Build response
    const statusEmoji = verification.isVerified ? '✅' : verification.overallScore >= 50 ? '⚠️' : '❌';
    const checksText = verification.checks
      .map(c => {
        const emoji = c.status === 'passed' ? '✅' : c.status === 'warning' ? '⚠️' : '❌';
        return `${emoji} **${c.name}**: ${c.score}/100 - ${c.details}`;
      })
      .join('\n');

    const warningsText = verification.warnings.length > 0 ?
      `\n\n⚠️ **Advertencias:**\n${verification.warnings.map(w => `- ${w}`).join('\n')}` : '';

    const recommendationsText = verification.recommendations.length > 0 ?
      `\n\n💡 **Recomendaciones:**\n${verification.recommendations.map(r => `- ${r}`).join('\n')}` : '';

    const response = `${statusEmoji} **Resultado de Verificación: ${verification.overallScore}/100**

${verification.isVerified ? '✅ Propiedad verificada - Sin problemas críticos detectados' : '⚠️ Se detectaron aspectos que requieren atención'}

**Análisis detallado:**
${checksText}${warningsText}${recommendationsText}${comparablesText}

¿Te gustaría que profundice en algún aspecto de la verificación?`;

    return {
      response,
      toolCalls,
      outcomes,
      data: { verification },
    };
  }
}

// Create and register
const verifyAgent = new VerifyAgent();
agentRegistry.register(verifyAgent);

export { verifyAgent };
