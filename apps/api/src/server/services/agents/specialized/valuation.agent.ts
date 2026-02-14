/**
 * Valuation Agent - Property Valuation Specialist
 * Estimates market value of properties using comparables and market analysis
 */

import { BaseAgent } from '../base.agent';
import { agentRegistry, DEFAULT_AGENT_CONFIGS } from '../registry';
import type {
  AgentConfig,
  AgentContext,
  AgentResponse,
  AgentTool,
  ToolResult,
  ValuationData,
  ComparableListing,
  ValuationFactor,
  AgentOutcome,
} from '../types';
import { db } from '@/server/infrastructure/database';
import { listings, priceHistory } from '@/server/infrastructure/database/schema';
import { eq, and, gte, lte, desc, sql, or } from 'drizzle-orm';

// Get valuation tool
const getValuationTool: AgentTool = {
  name: 'get_valuation',
  description: 'Obtiene una valoración estimada de una propiedad',
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

      // Find comparable listings
      const sizeTolerance = (listing.sizeSqm ?? 100) * 0.3;
      const comparables = await db
        .select({
          id: listings.id,
          title: listings.title,
          price: listings.price,
          sizeSqm: listings.sizeSqm,
          bedrooms: listings.bedrooms,
          neighborhood: listings.neighborhood,
          city: listings.city,
          propertyType: listings.propertyType,
          status: listings.status,
          createdAt: listings.createdAt,
        })
        .from(listings)
        .where(
          and(
            eq(listings.city, listing.city ?? ''),
            eq(listings.propertyType, listing.propertyType),
            eq(listings.operationType, listing.operationType),
            sql`${listings.id} != ${listing.id}`,
            sql`ABS(COALESCE(${listings.sizeSqm}, 0) - ${listing.sizeSqm ?? 0}) < ${sizeTolerance}`,
            or(
              eq(listings.status, 'active'),
              eq(listings.status, 'sold'),
              eq(listings.status, 'rented')
            )
          )
        )
        .orderBy(
          sql`ABS(COALESCE(${listings.sizeSqm}, 0) - ${listing.sizeSqm ?? 0})`,
          desc(listings.createdAt)
        )
        .limit(10);

      if (comparables.length === 0) {
        return {
          success: false,
          error: 'No se encontraron propiedades comparables para realizar la valoración',
        };
      }

      // Calculate price per sqm statistics
      const pricesPerSqm = comparables
        .filter(c => c.price && c.sizeSqm && c.sizeSqm > 0)
        .map(c => parseFloat(c.price!) / c.sizeSqm!);

      if (pricesPerSqm.length === 0) {
        return {
          success: false,
          error: 'Datos insuficientes para calcular valoración',
        };
      }

      // Sort for median
      pricesPerSqm.sort((a, b) => a - b);
      const medianPricePerSqm = pricesPerSqm[Math.floor(pricesPerSqm.length / 2)];
      const minPricePerSqm = pricesPerSqm[0];
      const maxPricePerSqm = pricesPerSqm[pricesPerSqm.length - 1];
      const avgPricePerSqm = pricesPerSqm.reduce((sum, p) => sum + p, 0) / pricesPerSqm.length;

      // Calculate base valuation
      const size = listing.sizeSqm ?? 100;
      const estimatedMin = Math.round(minPricePerSqm * size);
      const estimatedMax = Math.round(maxPricePerSqm * size);
      const estimatedMedian = Math.round(medianPricePerSqm * size);

      // Calculate confidence based on data quality
      let confidence = 0.5;
      if (comparables.length >= 5) confidence += 0.15;
      if (comparables.length >= 8) confidence += 0.1;
      if (listing.latitude && listing.longitude) confidence += 0.1;
      if (listing.yearBuilt) confidence += 0.05;
      if (listing.energyRating) confidence += 0.05;
      confidence = Math.min(confidence, 0.95);

      // Analyze factors
      const factors: ValuationFactor[] = [];

      // Size factor
      const avgSize = comparables.reduce((sum, c) => sum + (c.sizeSqm ?? 0), 0) / comparables.length;
      if (size > avgSize * 1.2) {
        factors.push({
          name: 'Tamaño por encima de la media',
          impact: 'positive',
          description: `${Math.round(((size / avgSize) - 1) * 100)}% más grande que la media de la zona`,
          valueImpact: 0.05,
        });
      } else if (size < avgSize * 0.8) {
        factors.push({
          name: 'Tamaño por debajo de la media',
          impact: 'negative',
          description: `${Math.round((1 - (size / avgSize)) * 100)}% más pequeño que la media`,
          valueImpact: -0.05,
        });
      }

      // Bedrooms factor
      if (listing.bedrooms) {
        const avgBedrooms = comparables.reduce((sum, c) => sum + (c.bedrooms ?? 0), 0) / comparables.length;
        if (listing.bedrooms > avgBedrooms) {
          factors.push({
            name: 'Más dormitorios',
            impact: 'positive',
            description: `${listing.bedrooms} dormitorios vs ${Math.round(avgBedrooms)} de media`,
            valueImpact: 0.03,
          });
        }
      }

      // Amenities factors
      if (listing.hasElevator) {
        factors.push({
          name: 'Con ascensor',
          impact: 'positive',
          description: 'Aumenta el valor especialmente en pisos altos',
          valueImpact: 0.02,
        });
      }

      if (listing.hasTerrace || listing.hasBalcony) {
        factors.push({
          name: 'Espacio exterior',
          impact: 'positive',
          description: listing.hasTerrace ? 'Terraza disponible' : 'Balcón disponible',
          valueImpact: 0.03,
        });
      }

      if (listing.hasParking) {
        factors.push({
          name: 'Plaza de parking',
          impact: 'positive',
          description: 'Parking incluido',
          valueImpact: 0.05,
        });
      }

      // Age factor
      if (listing.yearBuilt) {
        const age = new Date().getFullYear() - listing.yearBuilt;
        if (age < 5) {
          factors.push({
            name: 'Obra nueva',
            impact: 'positive',
            description: `Construido en ${listing.yearBuilt}`,
            valueImpact: 0.1,
          });
        } else if (age > 50) {
          factors.push({
            name: 'Edificio antiguo',
            impact: 'negative',
            description: `Construido en ${listing.yearBuilt}`,
            valueImpact: -0.05,
          });
        }
      }

      // Energy rating
      if (listing.energyRating) {
        if (['A', 'B'].includes(listing.energyRating)) {
          factors.push({
            name: 'Alta eficiencia energética',
            impact: 'positive',
            description: `Certificado ${listing.energyRating}`,
            valueImpact: 0.03,
          });
        } else if (['F', 'G'].includes(listing.energyRating)) {
          factors.push({
            name: 'Baja eficiencia energética',
            impact: 'negative',
            description: `Certificado ${listing.energyRating}`,
            valueImpact: -0.02,
          });
        }
      }

      // Apply factor adjustments
      let totalAdjustment = factors.reduce((sum, f) => sum + (f.valueImpact ?? 0), 0);
      totalAdjustment = Math.max(-0.2, Math.min(0.2, totalAdjustment)); // Cap at ±20%

      const adjustedMin = Math.round(estimatedMin * (1 + totalAdjustment));
      const adjustedMax = Math.round(estimatedMax * (1 + totalAdjustment));
      const adjustedMedian = Math.round(estimatedMedian * (1 + totalAdjustment));

      // Format comparables
      const formattedComparables: ComparableListing[] = comparables.slice(0, 5).map(c => ({
        id: c.id,
        title: c.title,
        price: parseFloat(c.price ?? '0'),
        sizeSqm: c.sizeSqm ?? 0,
        location: c.neighborhood || c.city || '',
        soldDate: c.status === 'sold' || c.status === 'rented' ? c.createdAt?.toISOString() : undefined,
        similarity: 1 - Math.abs((c.sizeSqm ?? 0) - size) / size,
      }));

      const result: ValuationData = {
        listingId: listing.id,
        estimatedValue: {
          min: adjustedMin,
          max: adjustedMax,
          median: adjustedMedian,
        },
        pricePerSqm: {
          min: Math.round(minPricePerSqm),
          max: Math.round(maxPricePerSqm),
        },
        confidence,
        comparables: formattedComparables,
        factors,
      };

      return {
        success: true,
        data: result,
        isBillable: true,
        billableType: 'valuation',
        billableAmount: 2.5, // 2.50 EUR per valuation
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Valuation failed',
      };
    }
  },
};

// Compare valuations tool
const compareValuationTool: AgentTool = {
  name: 'compare_asking_price',
  description: 'Compara el precio de venta con la valoración estimada',
  parameters: {
    listingId: { type: 'string', description: 'ID de la propiedad', required: true },
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const listing = await db.query.listings.findFirst({
        where: eq(listings.id, params.listingId as string),
      });

      if (!listing || !listing.price) {
        return { success: false, error: 'Propiedad no encontrada o sin precio' };
      }

      const askingPrice = parseFloat(listing.price);

      // Get valuation using the same logic
      const valuationResult = await getValuationTool.execute(params, context);

      if (!valuationResult.success || !valuationResult.data) {
        return valuationResult;
      }

      const valuation = valuationResult.data as ValuationData;
      const medianEstimate = valuation.estimatedValue.median;

      const difference = askingPrice - medianEstimate;
      const differencePercent = (difference / medianEstimate) * 100;

      let assessment: string;
      let recommendation: string;

      if (differencePercent < -15) {
        assessment = 'Por debajo del mercado';
        recommendation = 'Oportunidad potencial. Verificar por qué el precio está tan bajo.';
      } else if (differencePercent < -5) {
        assessment = 'Ligeramente por debajo del mercado';
        recommendation = 'Buen precio. Posible margen de negociación limitado.';
      } else if (differencePercent <= 5) {
        assessment = 'Acorde al mercado';
        recommendation = 'Precio justo. Margen de negociación estándar (3-5%).';
      } else if (differencePercent <= 15) {
        assessment = 'Ligeramente por encima del mercado';
        recommendation = 'Hay margen para negociar. Intentar contraoferta 10% menor.';
      } else {
        assessment = 'Significativamente por encima del mercado';
        recommendation = 'Precio elevado. Considerar negociar fuertemente o buscar alternativas.';
      }

      return {
        success: true,
        data: {
          askingPrice,
          estimatedValue: valuation.estimatedValue,
          difference,
          differencePercent,
          assessment,
          recommendation,
          confidence: valuation.confidence,
          comparables: valuation.comparables,
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

// Market trends tool
const getMarketTrendsTool: AgentTool = {
  name: 'get_market_trends',
  description: 'Obtiene tendencias de mercado para una zona',
  parameters: {
    city: { type: 'string', description: 'Ciudad', required: true },
    neighborhood: { type: 'string', description: 'Barrio', required: false },
    propertyType: { type: 'string', description: 'Tipo de propiedad', required: false },
    months: { type: 'number', description: 'Meses de histórico', required: false },
  },
  execute: async (params, context): Promise<ToolResult> => {
    try {
      const city = params.city as string;
      const months = params.months as number || 6;

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Get price history for the area
      const areaListings = await db
        .select({
          id: listings.id,
          price: listings.price,
          sizeSqm: listings.sizeSqm,
          createdAt: listings.createdAt,
          status: listings.status,
        })
        .from(listings)
        .where(
          and(
            sql`LOWER(${listings.city}) = LOWER(${city})`,
            gte(listings.createdAt, startDate),
            params.propertyType ? sql`${listings.propertyType} = ${params.propertyType}` : sql`1=1`
          )
        )
        .orderBy(desc(listings.createdAt))
        .limit(500);

      if (areaListings.length < 10) {
        return {
          success: false,
          error: 'Datos insuficientes para analizar tendencias',
        };
      }

      // Group by month and calculate averages
      const byMonth: Record<string, { prices: number[]; count: number }> = {};

      for (const listing of areaListings) {
        if (!listing.price || !listing.sizeSqm) continue;

        const monthKey = listing.createdAt?.toISOString().substring(0, 7) ?? '';
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = { prices: [], count: 0 };
        }

        byMonth[monthKey].prices.push(parseFloat(listing.price) / listing.sizeSqm);
        byMonth[monthKey].count++;
      }

      const monthlyData = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          avgPricePerSqm: Math.round(data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length),
          listingCount: data.count,
        }));

      // Calculate trend
      if (monthlyData.length < 2) {
        return {
          success: true,
          data: {
            city,
            monthlyData,
            trend: 'insufficient_data',
            message: 'Datos insuficientes para determinar tendencia',
          },
        };
      }

      const firstMonth = monthlyData[0].avgPricePerSqm;
      const lastMonth = monthlyData[monthlyData.length - 1].avgPricePerSqm;
      const changePercent = ((lastMonth - firstMonth) / firstMonth) * 100;

      let trend: string;
      let trendDescription: string;

      if (changePercent > 10) {
        trend = 'strong_growth';
        trendDescription = `Fuerte crecimiento del ${changePercent.toFixed(1)}% en ${months} meses`;
      } else if (changePercent > 3) {
        trend = 'growth';
        trendDescription = `Crecimiento moderado del ${changePercent.toFixed(1)}%`;
      } else if (changePercent > -3) {
        trend = 'stable';
        trendDescription = `Mercado estable (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`;
      } else if (changePercent > -10) {
        trend = 'decline';
        trendDescription = `Leve descenso del ${Math.abs(changePercent).toFixed(1)}%`;
      } else {
        trend = 'strong_decline';
        trendDescription = `Descenso significativo del ${Math.abs(changePercent).toFixed(1)}%`;
      }

      return {
        success: true,
        data: {
          city,
          period: `${months} meses`,
          monthlyData,
          summary: {
            trend,
            trendDescription,
            currentAvgPricePerSqm: lastMonth,
            changePercent,
            totalListings: areaListings.length,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Trend analysis failed',
      };
    }
  },
};

// System prompt
const VALUATION_SYSTEM_PROMPT = `Eres un agente de valoración inmobiliaria experto. Tu objetivo es proporcionar estimaciones de valor de mercado precisas y análisis de factores de valoración.

CAPACIDADES:
- Valorar propiedades basándose en comparables
- Analizar factores que afectan el valor
- Comparar precio de venta vs valor estimado
- Identificar tendencias de mercado

METODOLOGÍA:
1. Buscar propiedades comparables (mismo tipo, zona, tamaño similar)
2. Calcular precio/m² medio, mediano, min/max
3. Ajustar por factores específicos de la propiedad
4. Proporcionar rango de confianza

FACTORES QUE CONSIDERO:
- Ubicación y zona
- Tamaño y distribución
- Antigüedad del edificio
- Estado de conservación
- Amenidades (ascensor, parking, terraza)
- Eficiencia energética
- Tendencias de mercado

FORMATO DE RESPUESTA:
- Presentar rango de valoración claro (min-max)
- Indicar nivel de confianza
- Listar factores positivos y negativos
- Mostrar propiedades comparables
- Dar recomendaciones si el precio de venta difiere`;

export class ValuationAgent extends BaseAgent {
  constructor() {
    const baseConfig = DEFAULT_AGENT_CONFIGS.valuation;

    const config: AgentConfig = {
      type: 'valuation',
      name: baseConfig.name!,
      description: baseConfig.description!,
      capabilities: baseConfig.capabilities!,
      pricing: baseConfig.pricing!,
      limits: baseConfig.limits!,
      systemPrompt: VALUATION_SYSTEM_PROMPT,
      tools: [getValuationTool, compareValuationTool, getMarketTrendsTool],
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

    // Check for listing ID in message or context
    const listingIdMatch = userMessage.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    const listingId = listingIdMatch?.[0] || context.initialContext.listingId;

    // Determine intent
    const wantsComparison = userMessage.toLowerCase().includes('comparar') ||
                           userMessage.toLowerCase().includes('precio') ||
                           userMessage.toLowerCase().includes('caro') ||
                           userMessage.toLowerCase().includes('barato');

    const wantsTrends = userMessage.toLowerCase().includes('tendencia') ||
                        userMessage.toLowerCase().includes('mercado') ||
                        userMessage.toLowerCase().includes('evolucion');

    // If asking for trends
    if (wantsTrends && !listingId) {
      const cityMatch = userMessage.match(/(?:en|de)\s+(\w+(?:\s+\w+)?)/i);
      const city = cityMatch?.[1] || 'Madrid';

      const result = await this.executeTool('get_market_trends', { city, months: 6 }, context);
      toolCalls.push({ name: 'get_market_trends', args: { city }, result: result.success ? 'OK' : result.error });

      if (result.success && result.data) {
        const trends = result.data as {
          city: string;
          period: string;
          summary: { trendDescription: string; currentAvgPricePerSqm: number; totalListings: number };
          monthlyData: Array<{ month: string; avgPricePerSqm: number }>;
        };

        const chartData = trends.monthlyData
          .map(m => `${m.month.substring(5)}: ${this.formatCurrency(m.avgPricePerSqm)}/m²`)
          .join('\n');

        return {
          response: `📊 **Tendencias de Mercado en ${trends.city}** (${trends.period})

${trends.summary.trendDescription}

**Precio actual medio:** ${this.formatCurrency(trends.summary.currentAvgPricePerSqm)}/m²
**Propiedades analizadas:** ${trends.summary.totalListings}

**Evolución mensual:**
${chartData}

¿Quieres que valore alguna propiedad específica?`,
          toolCalls,
          outcomes,
          data: { trends: result.data },
        };
      }
    }

    if (!listingId) {
      return {
        response: 'Por favor, proporciona el ID de la propiedad que quieres valorar, o selecciona una de tus búsquedas anteriores.',
        toolCalls: [],
        outcomes: [],
      };
    }

    // Get valuation
    const valuationResult = await this.executeTool('get_valuation', { listingId }, context);
    toolCalls.push({ name: 'get_valuation', args: { listingId }, result: valuationResult.success ? 'OK' : valuationResult.error });

    if (!valuationResult.success) {
      return {
        response: `No pude realizar la valoración: ${valuationResult.error}`,
        toolCalls,
        outcomes,
      };
    }

    const valuation = valuationResult.data as ValuationData;

    // Create billable outcome
    if (valuationResult.isBillable) {
      outcomes.push(this.createOutcome(
        'valuation',
        `Valoración completada: ${this.formatCurrency(valuation.estimatedValue.median)}`,
        { listingId, estimate: valuation.estimatedValue.median },
        valuationResult.billableAmount
      ));
    }

    // If user wants comparison, also compare
    let comparisonText = '';
    if (wantsComparison) {
      const comparisonResult = await this.executeTool('compare_asking_price', { listingId }, context);
      if (comparisonResult.success && comparisonResult.data) {
        const comparison = comparisonResult.data as {
          askingPrice: number;
          differencePercent: number;
          assessment: string;
          recommendation: string;
        };

        const emoji = comparison.differencePercent <= 5 ? '✅' :
                      comparison.differencePercent <= 15 ? '⚠️' : '❌';

        comparisonText = `
---

${emoji} **Comparación con Precio de Venta**

Precio de venta: ${this.formatCurrency(comparison.askingPrice)}
Diferencia: ${comparison.differencePercent > 0 ? '+' : ''}${comparison.differencePercent.toFixed(1)}%

**${comparison.assessment}**
${comparison.recommendation}`;
      }
    }

    // Build response
    const confidenceEmoji = valuation.confidence >= 0.8 ? '🟢' :
                           valuation.confidence >= 0.6 ? '🟡' : '🟠';

    const factorsText = valuation.factors
      .map(f => {
        const emoji = f.impact === 'positive' ? '➕' : f.impact === 'negative' ? '➖' : '•';
        return `${emoji} ${f.name}: ${f.description}`;
      })
      .join('\n');

    const comparablesText = valuation.comparables
      .slice(0, 3)
      .map(c => `• ${c.title} - ${this.formatCurrency(c.price)} (${c.sizeSqm}m²)`)
      .join('\n');

    return {
      response: `📊 **Valoración de la Propiedad**

**Valor Estimado:**
🏷️ **${this.formatCurrency(valuation.estimatedValue.median)}**
(Rango: ${this.formatCurrency(valuation.estimatedValue.min)} - ${this.formatCurrency(valuation.estimatedValue.max)})

${confidenceEmoji} **Confianza:** ${Math.round(valuation.confidence * 100)}%

**Precio por m²:** ${this.formatCurrency(valuation.pricePerSqm.min)} - ${this.formatCurrency(valuation.pricePerSqm.max)}/m²

**Factores que afectan el valor:**
${factorsText || 'Sin factores destacables'}

**Propiedades comparables:**
${comparablesText}${comparisonText}

¿Te gustaría ver tendencias de mercado en esta zona?`,
      toolCalls,
      outcomes,
      data: { valuation },
    };
  }
}

// Create and register
const valuationAgent = new ValuationAgent();
agentRegistry.register(valuationAgent);

export { valuationAgent };
