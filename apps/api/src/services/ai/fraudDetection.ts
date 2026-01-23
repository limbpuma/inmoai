/**
 * Fraud Detection Service
 * Analyzes listings for suspicious patterns and potential fraud
 */

import {
  ListingForAnalysis,
  FraudDetectionResult,
  FraudFlag,
} from "./types";
import { aiOrchestrator, TaskResult } from "./orchestrator";

interface FraudDetectionConfig {
  priceDeviationThreshold: number; // percentage
  minImagesRequired: number;
  suspiciousKeywords: string[];
  maxPriceForFreeListings: number;
}

const DEFAULT_CONFIG: FraudDetectionConfig = {
  priceDeviationThreshold: 40,
  minImagesRequired: 2,
  suspiciousKeywords: [
    "urgente",
    "oportunidad unica",
    "negociable",
    "contactar whatsapp",
    "solo hoy",
    "regalo",
    "ganga",
  ],
  maxPriceForFreeListings: 50000,
};

class FraudDetectionService {
  private config: FraudDetectionConfig;
  private priceCache: Map<string, { avg: number; std: number }> = new Map();

  constructor(config?: Partial<FraudDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze a single listing for fraud indicators
   */
  async analyzeListing(listing: ListingForAnalysis): Promise<FraudDetectionResult> {
    const flags: FraudFlag[] = [];

    // Check price anomalies
    const priceFlags = await this.checkPriceAnomalies(listing);
    flags.push(...priceFlags);

    // Check description patterns
    const descriptionFlags = this.checkDescriptionPatterns(listing);
    flags.push(...descriptionFlags);

    // Check image requirements
    const imageFlags = this.checkImageRequirements(listing);
    flags.push(...imageFlags);

    // Check for incomplete data
    const dataFlags = this.checkDataCompleteness(listing);
    flags.push(...dataFlags);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(flags);

    // Determine recommendation
    const recommendation = this.determineRecommendation(riskScore, flags);

    return {
      listingId: listing.id,
      isSuspicious: riskScore >= 50,
      riskScore,
      flags,
      recommendation,
      details: this.generateDetails(flags, riskScore),
    };
  }

  /**
   * Batch analyze multiple listings
   */
  async analyzeListings(listings: ListingForAnalysis[]): Promise<FraudDetectionResult[]> {
    const results: FraudDetectionResult[] = [];

    for (const listing of listings) {
      const result = await this.analyzeListing(listing);
      results.push(result);
    }

    return results;
  }

  /**
   * Check for price anomalies
   */
  private async checkPriceAnomalies(listing: ListingForAnalysis): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];

    // Get market stats for this area
    const marketKey = `${listing.location.city}-${listing.propertyType}`;
    const marketStats = this.priceCache.get(marketKey);

    if (marketStats && listing.features.area) {
      const pricePerSqm = listing.price / listing.features.area;
      const avgPricePerSqm = marketStats.avg;
      const deviation = ((pricePerSqm - avgPricePerSqm) / avgPricePerSqm) * 100;

      if (Math.abs(deviation) > this.config.priceDeviationThreshold) {
        flags.push({
          type: "price_anomaly",
          severity: Math.abs(deviation) > 60 ? "high" : "medium",
          description: deviation < 0
            ? `Precio ${Math.abs(deviation).toFixed(0)}% por debajo del mercado`
            : `Precio ${Math.abs(deviation).toFixed(0)}% por encima del mercado`,
          confidence: Math.min(95, 70 + Math.abs(deviation) / 3),
        });
      }
    }

    // Check for suspiciously low prices
    if (listing.price < this.config.maxPriceForFreeListings && listing.propertyType !== "parking") {
      flags.push({
        type: "price_anomaly",
        severity: "high",
        description: "Precio sospechosamente bajo para el tipo de propiedad",
        confidence: 90,
      });
    }

    return flags;
  }

  /**
   * Check description for suspicious patterns
   */
  private checkDescriptionPatterns(listing: ListingForAnalysis): FraudFlag[] {
    const flags: FraudFlag[] = [];
    const descLower = listing.description.toLowerCase();

    // Check for suspicious keywords
    const foundKeywords = this.config.suspiciousKeywords.filter((keyword) =>
      descLower.includes(keyword.toLowerCase())
    );

    if (foundKeywords.length > 0) {
      flags.push({
        type: "copy_paste_description",
        severity: foundKeywords.length >= 3 ? "high" : "medium",
        description: `Contiene palabras sospechosas: ${foundKeywords.join(", ")}`,
        confidence: 60 + foundKeywords.length * 10,
      });
    }

    // Check for contact info in description (against policies)
    const contactPatterns = [
      /\d{9,}/,
      /whatsapp/i,
      /telegram/i,
      /@\w+\.\w+/,
      /contacta.*direct/i,
    ];

    const hasContact = contactPatterns.some((pattern) => pattern.test(listing.description));
    if (hasContact) {
      flags.push({
        type: "suspicious_contact",
        severity: "medium",
        description: "Informacion de contacto en la descripcion",
        confidence: 85,
      });
    }

    // Check for very short descriptions
    if (listing.description.length < 50) {
      flags.push({
        type: "copy_paste_description",
        severity: "low",
        description: "Descripcion demasiado corta",
        confidence: 70,
      });
    }

    return flags;
  }

  /**
   * Check image requirements
   */
  private checkImageRequirements(listing: ListingForAnalysis): FraudFlag[] {
    const flags: FraudFlag[] = [];

    if (listing.images.length < this.config.minImagesRequired) {
      flags.push({
        type: "duplicate_images",
        severity: listing.images.length === 0 ? "high" : "medium",
        description: `Solo ${listing.images.length} imagenes (minimo ${this.config.minImagesRequired})`,
        confidence: 80,
      });
    }

    return flags;
  }

  /**
   * Check data completeness
   */
  private checkDataCompleteness(listing: ListingForAnalysis): FraudFlag[] {
    const flags: FraudFlag[] = [];
    const missingFields: string[] = [];

    if (!listing.features.bedrooms && listing.propertyType !== "parking") {
      missingFields.push("habitaciones");
    }
    if (!listing.features.area) {
      missingFields.push("superficie");
    }
    if (!listing.location.neighborhood) {
      missingFields.push("barrio");
    }

    if (missingFields.length >= 2) {
      flags.push({
        type: "copy_paste_description",
        severity: "low",
        description: `Datos incompletos: ${missingFields.join(", ")}`,
        confidence: 65,
      });
    }

    return flags;
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(flags: FraudFlag[]): number {
    if (flags.length === 0) return 0;

    const severityWeights = { low: 15, medium: 30, high: 50 };
    let totalScore = 0;

    for (const flag of flags) {
      const weight = severityWeights[flag.severity];
      totalScore += (weight * flag.confidence) / 100;
    }

    return Math.min(100, Math.round(totalScore));
  }

  /**
   * Determine recommendation based on analysis
   */
  private determineRecommendation(
    riskScore: number,
    flags: FraudFlag[]
  ): "approve" | "review" | "reject" {
    if (riskScore >= 70 || flags.some((f) => f.type === "fake_location" && f.severity === "high")) {
      return "reject";
    }
    if (riskScore >= 40) {
      return "review";
    }
    return "approve";
  }

  /**
   * Generate human-readable details
   */
  private generateDetails(flags: FraudFlag[], riskScore: number): string {
    if (flags.length === 0) {
      return "No se detectaron indicadores de fraude.";
    }

    const highFlags = flags.filter((f) => f.severity === "high");
    const mediumFlags = flags.filter((f) => f.severity === "medium");

    let details = `Puntuacion de riesgo: ${riskScore}/100. `;

    if (highFlags.length > 0) {
      details += `${highFlags.length} alerta(s) alta(s). `;
    }
    if (mediumFlags.length > 0) {
      details += `${mediumFlags.length} alerta(s) media(s). `;
    }

    return details;
  }

  /**
   * Update market price cache (should be called periodically)
   */
  updatePriceCache(city: string, propertyType: string, avgPricePerSqm: number, stdDev: number): void {
    this.priceCache.set(`${city}-${propertyType}`, {
      avg: avgPricePerSqm,
      std: stdDev,
    });
  }
}

// Create singleton instance
export const fraudDetectionService = new FraudDetectionService();

// Register with orchestrator
aiOrchestrator.registerHandler("fraud_detection", async (context) => {
  const startTime = Date.now();
  const { params } = context;

  // Get listings to analyze (would come from database in real implementation)
  const listings: ListingForAnalysis[] = params?.listings || [];

  if (listings.length === 0) {
    return {
      success: true,
      itemsProcessed: 0,
      itemsAffected: 0,
      duration: Date.now() - startTime,
      details: "No hay listings para analizar",
    };
  }

  try {
    const results = await fraudDetectionService.analyzeListings(listings);
    const suspiciousCount = results.filter((r) => r.isSuspicious).length;

    return {
      success: true,
      itemsProcessed: listings.length,
      itemsAffected: suspiciousCount,
      duration: Date.now() - startTime,
      details: `Analizados ${listings.length} listings, ${suspiciousCount} sospechosos`,
      data: results,
    };
  } catch (error) {
    return {
      success: false,
      itemsProcessed: 0,
      itemsAffected: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
});

export { FraudDetectionService };
