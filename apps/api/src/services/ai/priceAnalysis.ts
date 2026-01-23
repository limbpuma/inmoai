/**
 * Price Analysis Service
 * Analyzes listing prices and provides market insights
 */

import {
  ListingForAnalysis,
  PriceAnalysisResult,
  PriceFactor,
} from "./types";
import { aiOrchestrator } from "./orchestrator";

interface MarketData {
  avgPricePerSqm: number;
  medianPricePerSqm: number;
  minPricePerSqm: number;
  maxPricePerSqm: number;
  totalListings: number;
  priceHistory: Array<{ date: Date; avgPrice: number }>;
}

interface PriceAnalysisConfig {
  // Price factors impact (percentage)
  factors: {
    hasParking: number;
    hasPool: number;
    hasGarden: number;
    hasTerrace: number;
    isNewConstruction: number;
    hasElevator: number;
    hasAC: number;
    isTopFloor: number;
    isGroundFloor: number;
  };
  // Area adjustment
  sqmPriceReductionPerSqm: number; // larger units have lower price per sqm
  sqmThreshold: number;
}

const DEFAULT_CONFIG: PriceAnalysisConfig = {
  factors: {
    hasParking: 8,
    hasPool: 12,
    hasGarden: 10,
    hasTerrace: 6,
    isNewConstruction: 15,
    hasElevator: 5,
    hasAC: 3,
    isTopFloor: 4,
    isGroundFloor: -3,
  },
  sqmPriceReductionPerSqm: 0.05, // 0.05% reduction per sqm above threshold
  sqmThreshold: 80,
};

class PriceAnalysisService {
  private config: PriceAnalysisConfig;
  private marketDataCache: Map<string, MarketData> = new Map();

  // Base prices per city (per sqm in EUR)
  private basePrices: Map<string, Record<string, number>> = new Map([
    ["Madrid", { apartment: 4500, house: 3800, studio: 5200, penthouse: 5500 }],
    ["Barcelona", { apartment: 4800, house: 4000, studio: 5500, penthouse: 6000 }],
    ["Valencia", { apartment: 2500, house: 2200, studio: 2800, penthouse: 3200 }],
    ["Sevilla", { apartment: 2200, house: 1900, studio: 2500, penthouse: 2800 }],
    ["Malaga", { apartment: 3200, house: 2800, studio: 3500, penthouse: 4000 }],
  ]);

  constructor(config?: Partial<PriceAnalysisConfig>) {
    this.config = {
      factors: { ...DEFAULT_CONFIG.factors, ...config?.factors },
      sqmPriceReductionPerSqm: config?.sqmPriceReductionPerSqm ?? DEFAULT_CONFIG.sqmPriceReductionPerSqm,
      sqmThreshold: config?.sqmThreshold ?? DEFAULT_CONFIG.sqmThreshold,
    };
  }

  /**
   * Analyze a single listing's price
   */
  async analyzeListing(listing: ListingForAnalysis): Promise<PriceAnalysisResult> {
    const area = listing.features.area || 80;
    const cityPrices = this.basePrices.get(listing.location.city);
    const basePricePerSqm = cityPrices?.[listing.propertyType] || 3000;

    // Calculate factors
    const factors = this.calculatePriceFactors(listing);
    const totalFactorImpact = factors.reduce((sum, f) => sum + f.impact, 0);

    // Apply area adjustment
    const areaAdjustment = area > this.config.sqmThreshold
      ? (area - this.config.sqmThreshold) * this.config.sqmPriceReductionPerSqm
      : 0;

    // Calculate estimated price per sqm
    const adjustedPricePerSqm = basePricePerSqm * (1 + totalFactorImpact / 100 - areaAdjustment / 100);
    const estimatedPrice = Math.round(adjustedPricePerSqm * area);

    // Calculate price range (±15%)
    const priceRange = {
      min: Math.round(estimatedPrice * 0.85),
      max: Math.round(estimatedPrice * 1.15),
    };

    // Calculate deviation from actual price
    const deviation = ((listing.price - estimatedPrice) / estimatedPrice) * 100;

    // Determine market comparison
    const marketComparison: "below" | "average" | "above" =
      deviation < -10 ? "below" : deviation > 10 ? "above" : "average";

    // Estimate confidence based on data quality
    const confidence = this.calculateConfidence(listing);

    return {
      listingId: listing.id,
      estimatedPrice,
      priceRange,
      deviation: Math.round(deviation),
      pricePerSqm: Math.round(adjustedPricePerSqm),
      marketComparison,
      similarListings: this.getSimilarListingsCount(listing),
      confidence,
      factors,
    };
  }

  /**
   * Batch analyze multiple listings
   */
  async analyzeListings(listings: ListingForAnalysis[]): Promise<PriceAnalysisResult[]> {
    const results: PriceAnalysisResult[] = [];

    for (const listing of listings) {
      const result = await this.analyzeListing(listing);
      results.push(result);
    }

    return results;
  }

  /**
   * Calculate price factors for a listing
   */
  private calculatePriceFactors(listing: ListingForAnalysis): PriceFactor[] {
    const factors: PriceFactor[] = [];

    if (listing.features.hasParking) {
      factors.push({
        name: "Plaza de parking",
        impact: this.config.factors.hasParking,
        description: "Incluye plaza de garaje",
      });
    }

    if (listing.features.hasPool) {
      factors.push({
        name: "Piscina",
        impact: this.config.factors.hasPool,
        description: "Dispone de piscina comunitaria o privada",
      });
    }

    if (listing.features.hasGarden) {
      factors.push({
        name: "Jardin",
        impact: this.config.factors.hasGarden,
        description: "Cuenta con jardin",
      });
    }

    // Location premium (simplified - would use more detailed data)
    const premiumNeighborhoods = ["Salamanca", "Chamberí", "Eixample", "Sarrià"];
    if (
      listing.location.neighborhood &&
      premiumNeighborhoods.some((n) =>
        listing.location.neighborhood?.toLowerCase().includes(n.toLowerCase())
      )
    ) {
      factors.push({
        name: "Zona premium",
        impact: 15,
        description: `Barrio de alta demanda: ${listing.location.neighborhood}`,
      });
    }

    // Bedroom factor
    if (listing.features.bedrooms) {
      if (listing.features.bedrooms >= 4) {
        factors.push({
          name: "Vivienda amplia",
          impact: 5,
          description: `${listing.features.bedrooms} habitaciones`,
        });
      } else if (listing.features.bedrooms === 1) {
        factors.push({
          name: "Estudio/1 habitacion",
          impact: -2,
          description: "Menor demanda familiar",
        });
      }
    }

    // Floor factor
    if (listing.features.floor !== undefined) {
      if (listing.features.floor >= 5) {
        factors.push({
          name: "Planta alta",
          impact: this.config.factors.isTopFloor,
          description: `Piso ${listing.features.floor} - mejores vistas`,
        });
      } else if (listing.features.floor === 0) {
        factors.push({
          name: "Planta baja",
          impact: this.config.factors.isGroundFloor,
          description: "Planta baja - menor privacidad",
        });
      }
    }

    return factors;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(listing: ListingForAnalysis): number {
    let confidence = 60; // Base confidence

    // Increase confidence with more data
    if (listing.features.area) confidence += 15;
    if (listing.features.bedrooms) confidence += 5;
    if (listing.features.bathrooms) confidence += 5;
    if (listing.location.neighborhood) confidence += 10;
    if (listing.images.length >= 5) confidence += 5;

    return Math.min(95, confidence);
  }

  /**
   * Get count of similar listings (simplified)
   */
  private getSimilarListingsCount(listing: ListingForAnalysis): number {
    // In real implementation, would query database
    return Math.floor(Math.random() * 50) + 10;
  }

  /**
   * Get market statistics for a location
   */
  async getMarketStats(
    city: string,
    propertyType: string
  ): Promise<{
    avgPricePerSqm: number;
    trend: "up" | "down" | "stable";
    percentageChange: number;
  }> {
    const cityPrices = this.basePrices.get(city);
    const avgPricePerSqm = cityPrices?.[propertyType] || 3000;

    // Simulated trend data
    const trends = ["up", "down", "stable"] as const;
    const trend = trends[Math.floor(Math.random() * 3)];
    const percentageChange = trend === "stable" ? 0 : (Math.random() * 10 - 5);

    return {
      avgPricePerSqm,
      trend,
      percentageChange: Math.round(percentageChange * 10) / 10,
    };
  }

  /**
   * Detect price anomalies in a set of listings
   */
  async detectAnomalies(
    listings: ListingForAnalysis[]
  ): Promise<Array<{ listingId: string; deviation: number; type: "too_low" | "too_high" }>> {
    const anomalies: Array<{ listingId: string; deviation: number; type: "too_low" | "too_high" }> = [];

    for (const listing of listings) {
      const analysis = await this.analyzeListing(listing);

      if (Math.abs(analysis.deviation) > 25) {
        anomalies.push({
          listingId: listing.id,
          deviation: analysis.deviation,
          type: analysis.deviation < 0 ? "too_low" : "too_high",
        });
      }
    }

    return anomalies;
  }

  /**
   * Update base prices (admin function)
   */
  updateBasePrices(city: string, prices: Record<string, number>): void {
    this.basePrices.set(city, prices);
  }
}

// Create singleton instance
export const priceAnalysisService = new PriceAnalysisService();

// Register with orchestrator
aiOrchestrator.registerHandler("price_analysis", async (context) => {
  const startTime = Date.now();
  const { params } = context;

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
    const results = await priceAnalysisService.analyzeListings(listings);
    const anomalies = results.filter((r) => Math.abs(r.deviation) > 20).length;

    return {
      success: true,
      itemsProcessed: listings.length,
      itemsAffected: anomalies,
      duration: Date.now() - startTime,
      details: `Analizados ${listings.length} listings, ${anomalies} con precios anomalos`,
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

export { PriceAnalysisService };
