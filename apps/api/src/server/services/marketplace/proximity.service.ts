import { db } from '@/server/infrastructure/database';
import {
  serviceProviders,
  providerServices,
  areaCentroids,
  listings,
  type ServiceCategory,
} from '@/server/infrastructure/database/schema';
import { sql, eq, and, gte, inArray, desc, or, isNull, isNotNull } from 'drizzle-orm';
import {
  type ProximitySearchParams,
  type ProximitySearchResult,
  type RankedProvider,
  type SearchLocation,
  type ProviderServiceInfo,
  RANKING_WEIGHTS,
  SUBSCRIPTION_SCORES,
  DEFAULT_SEARCH_RADIUS_KM,
  MAX_SEARCH_RADIUS_KM,
  RADIUS_EXPANSION_FACTOR,
  IMPROVEMENT_TO_SERVICE_MAPPING,
} from './types';

// ============================================
// HAVERSINE DISTANCE CALCULATION
// ============================================

/**
 * Calculate distance in kilometers using Haversine formula
 * Returns a SQL expression for use in queries
 */
function haversineDistanceSQL(lat: number, lon: number) {
  const R = 6371; // Earth's radius in km
  return sql<number>`
    (${R} * acos(
      LEAST(1, GREATEST(-1,
        cos(radians(${lat})) *
        cos(radians(${serviceProviders.latitude}::float)) *
        cos(radians(${serviceProviders.longitude}::float) - radians(${lon})) +
        sin(radians(${lat})) *
        sin(radians(${serviceProviders.latitude}::float))
      ))
    ))
  `;
}

// ============================================
// PROXIMITY SERVICE
// ============================================

class ProximityService {
  /**
   * Main provider search by proximity
   */
  async searchProviders(params: ProximitySearchParams): Promise<ProximitySearchResult> {
    const {
      listingId,
      latitude: directLat,
      longitude: directLon,
      city: directCity,
      neighborhood: directNeighborhood,
      categoryIds,
      improvementCategories,
      maxDistanceKm = DEFAULT_SEARCH_RADIUS_KM,
      minRating = 0,
      verifiedOnly = false,
      availableOnly = true,
      limit = 20,
      offset = 0,
      autoExpand = true,
      minResults = 5,
    } = params;

    // 1. Resolve search location
    const location = await this.resolveSearchLocation({
      listingId,
      latitude: directLat,
      longitude: directLon,
      city: directCity,
      neighborhood: directNeighborhood,
    });

    // 2. Resolve categories to search
    const serviceCategories = await this.resolveCategoryIds({
      categoryIds,
      improvementCategories,
      listingId,
    });

    // 3. Execute search with possible radius expansion
    let currentRadius = maxDistanceKm;
    let result: RankedProvider[] = [];
    let totalCount = 0;

    do {
      const searchResult = await this.executeSearch({
        location,
        categories: serviceCategories,
        maxDistanceKm: currentRadius,
        minRating,
        verifiedOnly,
        availableOnly,
        limit: limit + offset,
      });

      result = searchResult.providers;
      totalCount = searchResult.total;

      // If not enough results and can expand
      if (autoExpand && result.length < minResults && currentRadius < MAX_SEARCH_RADIUS_KM) {
        currentRadius = Math.min(currentRadius * RADIUS_EXPANSION_FACTOR, MAX_SEARCH_RADIUS_KM);
      } else {
        break;
      }
    } while (result.length < minResults);

    // Apply final pagination
    const paginatedResults = result.slice(offset, offset + limit);

    return {
      providers: paginatedResults,
      total: totalCount,
      hasMore: offset + paginatedResults.length < totalCount,
      searchLocation: location,
      radiusUsedKm: currentRadius,
    };
  }

  /**
   * Get recommended providers for a listing based on its improvements
   */
  async getRecommendedForListing(
    listingId: string,
    options?: {
      limit?: number;
      verifiedOnly?: boolean;
    }
  ): Promise<ProximitySearchResult> {
    return this.searchProviders({
      listingId,
      autoExpand: true,
      minResults: 3,
      limit: options?.limit ?? 10,
      verifiedOnly: options?.verifiedOnly ?? false,
    });
  }

  /**
   * Resolve search location based on parameters
   */
  private async resolveSearchLocation(params: {
    listingId?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    neighborhood?: string;
  }): Promise<SearchLocation> {
    // Case 1: Direct coordinates provided
    if (params.latitude && params.longitude) {
      return {
        latitude: params.latitude,
        longitude: params.longitude,
        city: params.city ?? null,
        neighborhood: params.neighborhood ?? null,
        source: 'exact',
      };
    }

    // Case 2: Search from listing
    if (params.listingId) {
      const listing = await db.query.listings.findFirst({
        where: eq(listings.id, params.listingId),
        columns: {
          latitude: true,
          longitude: true,
          city: true,
          neighborhood: true,
        },
      });

      if (listing) {
        // If listing has exact coordinates
        if (listing.latitude && listing.longitude) {
          return {
            latitude: Number(listing.latitude),
            longitude: Number(listing.longitude),
            city: listing.city,
            neighborhood: listing.neighborhood,
            source: 'exact',
          };
        }

        // Fallback to area centroid
        if (listing.city) {
          const centroid = await this.getAreaCentroid(listing.city, listing.neighborhood);

          if (centroid) {
            return {
              latitude: centroid.latitude,
              longitude: centroid.longitude,
              city: listing.city,
              neighborhood: listing.neighborhood,
              source: 'centroid',
            };
          }
        }
      }
    }

    // Case 3: Direct city/neighborhood without coordinates
    if (params.city) {
      const centroid = await this.getAreaCentroid(params.city, params.neighborhood);

      if (centroid) {
        return {
          latitude: centroid.latitude,
          longitude: centroid.longitude,
          city: params.city,
          neighborhood: params.neighborhood ?? null,
          source: 'centroid',
        };
      }
    }

    // Case 4: No location available
    return {
      latitude: null,
      longitude: null,
      city: params.city ?? null,
      neighborhood: params.neighborhood ?? null,
      source: 'none',
    };
  }

  /**
   * Get centroid of an area (city/neighborhood)
   */
  private async getAreaCentroid(
    city: string,
    neighborhood?: string | null
  ): Promise<{ latitude: number; longitude: number } | null> {
    // First search with specific neighborhood
    if (neighborhood) {
      const exactMatch = await db.query.areaCentroids.findFirst({
        where: and(eq(areaCentroids.city, city), eq(areaCentroids.neighborhood, neighborhood)),
      });

      if (exactMatch) {
        return {
          latitude: Number(exactMatch.latitude),
          longitude: Number(exactMatch.longitude),
        };
      }
    }

    // Fallback to city centroid (neighborhood is null)
    const cityMatch = await db.query.areaCentroids.findFirst({
      where: and(eq(areaCentroids.city, city), isNull(areaCentroids.neighborhood)),
    });

    if (cityMatch) {
      return {
        latitude: Number(cityMatch.latitude),
        longitude: Number(cityMatch.longitude),
      };
    }

    return null;
  }

  /**
   * Resolve category IDs based on parameters
   */
  private async resolveCategoryIds(params: {
    categoryIds?: string[];
    improvementCategories?: ServiceCategory[];
    listingId?: string;
  }): Promise<ServiceCategory[] | null> {
    // If direct category IDs provided, ignore them for now (we use categories directly)
    let improvementCats = params.improvementCategories ?? [];

    // Get from listing if not provided
    if (improvementCats.length === 0 && params.listingId) {
      const listing = await db.query.listings.findFirst({
        where: eq(listings.id, params.listingId),
        columns: { improvements: true },
      });

      if (listing?.improvements) {
        improvementCats = [
          ...new Set(listing.improvements.map((imp) => imp.category as ServiceCategory)),
        ];
      }
    }

    // Map to service categories
    if (improvementCats.length > 0) {
      const serviceCategories = improvementCats.flatMap(
        (cat) => IMPROVEMENT_TO_SERVICE_MAPPING[cat] ?? []
      );
      return [...new Set(serviceCategories)];
    }

    // No category filter
    return null;
  }

  /**
   * Execute the main search
   */
  private async executeSearch(params: {
    location: SearchLocation;
    categories: ServiceCategory[] | null;
    maxDistanceKm: number;
    minRating: number;
    verifiedOnly: boolean;
    availableOnly: boolean;
    limit: number;
  }): Promise<{ providers: RankedProvider[]; total: number }> {
    const { location, categories, maxDistanceKm, minRating, verifiedOnly, availableOnly, limit } =
      params;

    // Build base conditions
    const conditions = [eq(serviceProviders.status, 'active')];

    if (minRating > 0) {
      conditions.push(gte(serviceProviders.averageRating, minRating.toString()));
    }

    if (verifiedOnly) {
      conditions.push(eq(serviceProviders.isVerified, true));
    }

    // Special case: no location, order by subscription and rating only
    if (location.source === 'none' || !location.latitude || !location.longitude) {
      return this.searchWithoutLocation({
        conditions,
        categories,
        limit,
        cityFilter: location.city,
      });
    }

    // Search with distance
    const distanceExpr = haversineDistanceSQL(location.latitude, location.longitude);

    // Get providers within radius
    const providers = await db
      .select({
        id: serviceProviders.id,
        businessName: serviceProviders.businessName,
        slug: serviceProviders.slug,
        description: serviceProviders.description,
        logoUrl: serviceProviders.logoUrl,
        city: serviceProviders.city,
        tier: serviceProviders.tier,
        averageRating: serviceProviders.averageRating,
        totalReviews: serviceProviders.totalReviews,
        totalLeads: serviceProviders.totalLeads,
        responseTimeMinutes: serviceProviders.responseTimeMinutes,
        isVerified: serviceProviders.isVerified,
        coverageRadiusKm: serviceProviders.coverageRadiusKm,
        latitude: serviceProviders.latitude,
        longitude: serviceProviders.longitude,
        distance: distanceExpr,
      })
      .from(serviceProviders)
      .where(
        and(
          ...conditions,
          isNotNull(serviceProviders.latitude),
          isNotNull(serviceProviders.longitude),
          sql`${distanceExpr} <= ${maxDistanceKm}`
        )
      )
      .orderBy(distanceExpr)
      .limit(limit * 2); // Get more to filter by category

    if (providers.length === 0) {
      return { providers: [], total: 0 };
    }

    // Get services for these providers
    const providerIds = providers.map((p) => p.id);
    const services = await this.getProviderServices(providerIds, categories);

    // Filter providers that have matching services if categories are specified
    let filteredProviders = providers;
    if (categories && categories.length > 0) {
      filteredProviders = providers.filter((p) => {
        const providerServices = services.get(p.id);
        return providerServices && providerServices.length > 0;
      });
    }

    // Calculate scores and build results
    const rankedProviders: RankedProvider[] = filteredProviders.map((row) => {
      const distance = row.distance !== null ? Number(row.distance) : null;
      const isWithinCoverage = distance !== null && distance <= row.coverageRadiusKm;

      // Calculate individual scores
      const proximityScore =
        distance !== null
          ? distance <= 0
            ? 1.0
            : Math.max(0, 1 - distance / maxDistanceKm)
          : 0;

      const subscriptionScore = SUBSCRIPTION_SCORES[row.tier] ?? 0.25;

      const qualityScore =
        (Number(row.averageRating ?? 0) / 5.0) * 0.7 +
        Math.min(1.0, (row.totalReviews ?? 0) / 50.0) * 0.3;

      const availabilityScore = isWithinCoverage ? 1.0 : 0.7;

      const matchScore = categories ? 1.0 : 0.5;

      // Calculate total score
      const totalScore =
        proximityScore * RANKING_WEIGHTS.proximity +
        subscriptionScore * RANKING_WEIGHTS.subscription +
        qualityScore * RANKING_WEIGHTS.quality +
        availabilityScore * RANKING_WEIGHTS.availability +
        matchScore * RANKING_WEIGHTS.match;

      return {
        provider: {
          id: row.id,
          businessName: row.businessName,
          slug: row.slug,
          description: row.description,
          logoUrl: row.logoUrl,
          city: row.city,
          tier: row.tier,
          averageRating: Number(row.averageRating ?? 0),
          totalReviews: row.totalReviews ?? 0,
          totalLeads: row.totalLeads ?? 0,
          responseTimeMinutes: row.responseTimeMinutes,
          isVerified: row.isVerified ?? false,
          coverageRadiusKm: row.coverageRadiusKm,
        },
        services: services.get(row.id) ?? [],
        scores: {
          proximity: proximityScore,
          subscription: subscriptionScore,
          quality: qualityScore,
          availability: availabilityScore,
          match: matchScore,
          total: totalScore,
        },
        distanceKm: distance,
        isWithinCoverage,
      };
    });

    // Sort by total score
    rankedProviders.sort((a, b) => b.scores.total - a.scores.total);

    return {
      providers: rankedProviders.slice(0, limit),
      total: rankedProviders.length,
    };
  }

  /**
   * Search without location (fallback)
   */
  private async searchWithoutLocation(params: {
    conditions: ReturnType<typeof eq>[];
    categories: ServiceCategory[] | null;
    limit: number;
    cityFilter: string | null;
  }): Promise<{ providers: RankedProvider[]; total: number }> {
    const { conditions, categories, limit, cityFilter } = params;

    // Add city filter if available
    const finalConditions = [...conditions];
    if (cityFilter) {
      finalConditions.push(eq(serviceProviders.city, cityFilter));
    }

    // Basic query ordered by subscription and rating
    const providers = await db
      .select({
        id: serviceProviders.id,
        businessName: serviceProviders.businessName,
        slug: serviceProviders.slug,
        description: serviceProviders.description,
        logoUrl: serviceProviders.logoUrl,
        city: serviceProviders.city,
        tier: serviceProviders.tier,
        averageRating: serviceProviders.averageRating,
        totalReviews: serviceProviders.totalReviews,
        totalLeads: serviceProviders.totalLeads,
        responseTimeMinutes: serviceProviders.responseTimeMinutes,
        isVerified: serviceProviders.isVerified,
        coverageRadiusKm: serviceProviders.coverageRadiusKm,
      })
      .from(serviceProviders)
      .where(and(...finalConditions))
      .orderBy(desc(serviceProviders.tier), desc(serviceProviders.averageRating))
      .limit(limit * 2);

    if (providers.length === 0) {
      return { providers: [], total: 0 };
    }

    // Get services
    const providerIds = providers.map((p) => p.id);
    const services = await this.getProviderServices(providerIds, categories);

    // Filter by category if specified
    let filteredProviders = providers;
    if (categories && categories.length > 0) {
      filteredProviders = providers.filter((p) => {
        const providerServices = services.get(p.id);
        return providerServices && providerServices.length > 0;
      });
    }

    // Build results
    const rankedProviders: RankedProvider[] = filteredProviders.map((row) => {
      const subscriptionScore = SUBSCRIPTION_SCORES[row.tier] ?? 0.25;

      const qualityScore =
        (Number(row.averageRating ?? 0) / 5.0) * 0.7 +
        Math.min(1.0, (row.totalReviews ?? 0) / 50.0) * 0.3;

      const availabilityScore = 0.7; // No coverage check without location
      const matchScore = categories ? 1.0 : 0.5;

      const totalScore =
        0 * RANKING_WEIGHTS.proximity + // proximity = 0
        subscriptionScore * RANKING_WEIGHTS.subscription +
        qualityScore * RANKING_WEIGHTS.quality +
        availabilityScore * RANKING_WEIGHTS.availability +
        matchScore * RANKING_WEIGHTS.match;

      return {
        provider: {
          id: row.id,
          businessName: row.businessName,
          slug: row.slug,
          description: row.description,
          logoUrl: row.logoUrl,
          city: row.city,
          tier: row.tier,
          averageRating: Number(row.averageRating ?? 0),
          totalReviews: row.totalReviews ?? 0,
          totalLeads: row.totalLeads ?? 0,
          responseTimeMinutes: row.responseTimeMinutes,
          isVerified: row.isVerified ?? false,
          coverageRadiusKm: row.coverageRadiusKm,
        },
        services: services.get(row.id) ?? [],
        scores: {
          proximity: 0,
          subscription: subscriptionScore,
          quality: qualityScore,
          availability: availabilityScore,
          match: matchScore,
          total: totalScore,
        },
        distanceKm: null,
        isWithinCoverage: false,
      };
    });

    return {
      providers: rankedProviders.slice(0, limit),
      total: rankedProviders.length,
    };
  }

  /**
   * Get services for providers
   */
  private async getProviderServices(
    providerIds: string[],
    filterCategories: ServiceCategory[] | null
  ): Promise<Map<string, ProviderServiceInfo[]>> {
    if (providerIds.length === 0) {
      return new Map();
    }

    const conditions = [
      inArray(providerServices.providerId, providerIds),
      eq(providerServices.isActive, true),
    ];

    if (filterCategories && filterCategories.length > 0) {
      conditions.push(inArray(providerServices.category, filterCategories));
    }

    const services = await db
      .select({
        id: providerServices.id,
        providerId: providerServices.providerId,
        category: providerServices.category,
        title: providerServices.title,
        priceMin: providerServices.priceMin,
        priceMax: providerServices.priceMax,
        priceUnit: providerServices.priceUnit,
        description: providerServices.description,
      })
      .from(providerServices)
      .where(and(...conditions));

    const serviceMap = new Map<string, ProviderServiceInfo[]>();

    for (const service of services) {
      const existing = serviceMap.get(service.providerId) ?? [];
      existing.push({
        id: service.id,
        category: service.category,
        title: service.title,
        priceMin: service.priceMin ? Number(service.priceMin) : null,
        priceMax: service.priceMax ? Number(service.priceMax) : null,
        priceUnit: service.priceUnit ?? 'proyecto',
        description: service.description,
      });
      serviceMap.set(service.providerId, existing);
    }

    return serviceMap;
  }
}

// Singleton
export const proximityService = new ProximityService();
