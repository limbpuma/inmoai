import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { env } from '@/config/env';
import type {
  AIEngineService,
  ImageInput,
  ImageAnalysisResult,
  GeneratedContent,
  ValuationResult,
  FraudAnalysis,
  ListingInput,
} from './ai.types';
import type { ParsedQuery } from '@/server/services/search/search.types';
import {
  IMAGE_ANALYSIS_PROMPT,
  CONTENT_GENERATION_PROMPT,
  SEARCH_PARSER_PROMPT,
} from './prompts';

class AIEngineServiceImpl implements AIEngineService {
  private gemini: GoogleGenerativeAI;
  private openai: OpenAI | null = null;

  constructor() {
    this.gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY);

    if (env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }

  async analyzeImages(images: ImageInput[]): Promise<ImageAnalysisResult> {
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const imageParts = images
      .filter((img) => img.base64)
      .map((img) => ({
        inlineData: {
          data: img.base64!,
          mimeType: img.mimeType,
        },
      }));

    if (imageParts.length === 0) {
      throw new Error('No valid images provided for analysis');
    }

    const result = await model.generateContent([
      { text: IMAGE_ANALYSIS_PROMPT },
      ...imageParts,
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    return JSON.parse(jsonMatch[0]) as ImageAnalysisResult;
  }

  async generateContent(
    listing: ListingInput,
    imageAnalysis: ImageAnalysisResult
  ): Promise<GeneratedContent> {
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const context = `
Datos de la propiedad:
- Tipo: ${listing.propertyType || 'No especificado'}
- Operación: ${listing.operationType || 'No especificado'}
- Precio: ${listing.price ? `${listing.price}€` : 'No especificado'}
- Tamaño: ${listing.sizeSqm ? `${listing.sizeSqm}m²` : 'No especificado'}
- Habitaciones: ${listing.rooms || 'No especificado'}
- Dormitorios: ${listing.bedrooms || 'No especificado'}
- Baños: ${listing.bathrooms || 'No especificado'}
- Ciudad: ${listing.city || 'No especificado'}
- Barrio: ${listing.neighborhood || 'No especificado'}

Análisis visual:
- Habitaciones detectadas: ${imageAnalysis.images.map((i) => i.roomType).join(', ')}
- Calidad general: ${imageAnalysis.overall.qualityScore}/100
- Resumen: ${imageAnalysis.overall.summary}
`;

    const result = await model.generateContent([
      { text: CONTENT_GENERATION_PROMPT },
      { text: context },
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse content generation response');
    }

    return JSON.parse(jsonMatch[0]) as GeneratedContent;
  }

  async estimateValue(listing: ListingInput): Promise<ValuationResult> {
    // Basic implementation - would need market data integration
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const prompt = `
Actúa como un tasador inmobiliario profesional.

Basándote en estos datos, proporciona una estimación de valor de mercado:
- Tipo: ${listing.propertyType}
- Ciudad: ${listing.city}
- Barrio: ${listing.neighborhood}
- Tamaño: ${listing.sizeSqm}m²
- Habitaciones: ${listing.rooms}
- Dormitorios: ${listing.bedrooms}
- Baños: ${listing.bathrooms}

Responde en JSON con este formato:
{
  "estimatedPrice": { "min": number, "max": number, "median": number },
  "pricePerSqm": { "min": number, "max": number },
  "confidence": number (0-1),
  "factors": [
    { "factor": string, "impact": "positive"|"negative"|"neutral", "description": string }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse valuation response');
    }

    return JSON.parse(jsonMatch[0]) as ValuationResult;
  }

  async detectFraud(listing: ListingInput): Promise<FraudAnalysis> {
    // Fraud detection based on listing characteristics
    const indicators: FraudAnalysis['indicators'] = [];
    let riskScore = 0;

    // Check for suspiciously low price
    if (listing.price && listing.sizeSqm) {
      const pricePerSqm = listing.price / listing.sizeSqm;
      // This would need real market data
      if (pricePerSqm < 500) {
        indicators.push({
          type: 'suspicious_price',
          description: 'El precio por m² es significativamente inferior al mercado',
          severity: 'high',
          confidence: 0.8,
        });
        riskScore += 30;
      }
    }

    // Check for missing critical information
    if (!listing.address && !listing.neighborhood) {
      indicators.push({
        type: 'missing_location',
        description: 'Falta información detallada de ubicación',
        severity: 'medium',
        confidence: 0.9,
      });
      riskScore += 15;
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    return {
      riskScore,
      riskLevel,
      indicators,
      recommendations: indicators.length > 0
        ? ['Verificar la información de contacto', 'Solicitar visita presencial']
        : [],
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      // Fallback: return empty embedding
      console.warn('OpenAI not configured, returning empty embedding');
      return new Array(512).fill(0);
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 512,
    });

    return response.data[0].embedding;
  }

  async generateListingEmbedding(listing: ListingInput): Promise<number[]> {
    const text = [
      listing.title,
      listing.description,
      listing.propertyType,
      listing.city,
      listing.neighborhood,
      listing.features?.join(' '),
    ]
      .filter(Boolean)
      .join(' ');

    return this.generateEmbedding(text);
  }

  async parseSearchQuery(query: string): Promise<ParsedQuery> {
    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const result = await model.generateContent([
      { text: SEARCH_PARSER_PROMPT },
      { text: query },
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        originalQuery: query,
        filters: {},
        interpretation: query,
        confidence: 0.5,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      originalQuery: query,
      filters: parsed.filters || {},
      interpretation: parsed.interpretation || query,
      confidence: parsed.confidence || 0.7,
      suggestions: parsed.suggestions,
    };
  }
}

// Singleton instance
export const aiEngine = new AIEngineServiceImpl();
