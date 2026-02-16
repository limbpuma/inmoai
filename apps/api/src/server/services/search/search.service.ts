import { db } from '@/server/infrastructure/database';
import { listings, listingImages, sources } from '@/server/infrastructure/database/schema';
import { eq, and, gte, lte, inArray, like, desc, asc, sql, count } from 'drizzle-orm';
import type {
  SearchService,
  Suggestion,
  ParsedQuery,
  VectorSearchResult,
} from './search.types';
import type { SearchFilters, SearchResult, ListingSummary } from '@/shared/types';
import { aiEngine } from '@/server/services/ai';

class SearchServiceImpl implements SearchService {
  async semanticSearch(
    query: string,
    filters?: Partial<SearchFilters>
  ): Promise<SearchResult> {
    let parsedFilters: Partial<SearchFilters> = {};

    try {
      // 1. Try to parse the natural language query with AI
      const parsed = await this.parseNaturalLanguageQuery(query);
      parsedFilters = parsed.filters;
    } catch (error) {
      // AI parsing failed - use basic text extraction as fallback
      console.warn('AI query parsing failed, using basic extraction:', error);
      parsedFilters = this.extractBasicFilters(query);
    }

    // 2. Merge parsed filters with explicit filters
    const mergedFilters: SearchFilters = {
      ...parsedFilters,
      ...filters,
      limit: filters?.limit ?? 20,
      offset: filters?.offset ?? 0,
    };

    // 3. Skip embedding generation - vector search will be implemented later
    // For now, fall back to filter search

    // 4. Filter search with merged filters
    return this.filterSearch(mergedFilters);
  }

  /**
   * Basic filter extraction from query text (fallback when AI is unavailable)
   */
  private extractBasicFilters(query: string): Partial<SearchFilters> {
    const filters: Partial<SearchFilters> = {};
    const queryLower = query.toLowerCase();

    // Extract city names (Spanish cities)
    const cities = ['madrid', 'barcelona', 'valencia', 'sevilla', 'malaga', 'bilbao', 'zaragoza'];
    for (const city of cities) {
      if (queryLower.includes(city)) {
        filters.city = city.charAt(0).toUpperCase() + city.slice(1);
        break;
      }
    }

    // Extract operation type
    if (queryLower.includes('alquil') || queryLower.includes('rent')) {
      filters.operationType = 'rent';
    } else if (queryLower.includes('compr') || queryLower.includes('venta') || queryLower.includes('buy')) {
      filters.operationType = 'sale';
    }

    // Extract property type
    if (queryLower.includes('piso') || queryLower.includes('apartamento')) {
      filters.propertyType = ['apartment'];
    } else if (queryLower.includes('casa') || queryLower.includes('chalet')) {
      filters.propertyType = ['house', 'villa'];
    } else if (queryLower.includes('local') || queryLower.includes('oficina')) {
      filters.propertyType = ['commercial'];
    }

    // Extract price range (e.g., "menos de 300k", "por debajo de 500000")
    const priceMatch = queryLower.match(/(?:menos de|por debajo de|hasta|max(?:imo)?)\s*(\d+)k?/);
    if (priceMatch) {
      let price = parseInt(priceMatch[1], 10);
      if (queryLower.includes('k')) price *= 1000;
      else if (price < 10000) price *= 1000; // Assume "300" means "300k"
      filters.priceMax = price;
    }

    // Extract features
    if (queryLower.includes('terraza')) filters.hasTerrace = true;
    if (queryLower.includes('parking') || queryLower.includes('garaje')) filters.hasParking = true;
    if (queryLower.includes('ascensor')) filters.hasElevator = true;
    if (queryLower.includes('jardin') || queryLower.includes('jardín')) filters.hasGarden = true;
    if (queryLower.includes('piscina')) filters.hasPool = true;

    // Extract bedrooms
    const bedroomMatch = queryLower.match(/(\d+)\s*(?:habitacion|dormitorio|bedroom)/);
    if (bedroomMatch) {
      filters.bedroomsMin = parseInt(bedroomMatch[1], 10);
    }

    return filters;
  }

  async filterSearch(filters: SearchFilters): Promise<SearchResult> {
    const conditions = this.buildWhereConditions(filters);

    // Build query
    const query = db
      .select({
        id: listings.id,
        title: listings.title,
        price: listings.price,
        pricePerSqm: listings.pricePerSqm,
        city: listings.city,
        neighborhood: listings.neighborhood,
        propertyType: listings.propertyType,
        operationType: listings.operationType,
        sizeSqm: listings.sizeSqm,
        rooms: listings.rooms,
        bedrooms: listings.bedrooms,
        bathrooms: listings.bathrooms,
        authenticityScore: listings.authenticityScore,
        isAiGenerated: listings.isAiGenerated,
        createdAt: listings.createdAt,
        sourceId: listings.sourceId,
        sourceName: sources.name,
        sourceSlug: sources.slug,
      })
      .from(listings)
      .leftJoin(sources, eq(listings.sourceId, sources.id))
      .where(and(...conditions));

    // Apply sorting
    const sortedQuery = this.applySorting(query, filters.sortBy);

    // Execute with pagination
    const [results, totalResult] = await Promise.all([
      sortedQuery.limit(filters.limit).offset(filters.offset),
      db
        .select({ count: count() })
        .from(listings)
        .where(and(...conditions)),
    ]);

    const total = totalResult[0]?.count ?? 0;

    // Get first image for each listing
    const listingIds = results.map((r: typeof results[number]) => r.id);
    const images = listingIds.length > 0
      ? await db
          .select({
            listingId: listingImages.listingId,
            url: listingImages.cdnUrl,
            originalUrl: listingImages.originalUrl,
          })
          .from(listingImages)
          .where(
            and(
              inArray(listingImages.listingId, listingIds),
              eq(listingImages.position, 0)
            )
          )
      : [];

    const imageMap = new Map(
      images.map((img) => [img.listingId, img.url ?? img.originalUrl])
    );

    // Get image counts
    const imageCounts = listingIds.length > 0
      ? await db
          .select({
            listingId: listingImages.listingId,
            count: count(),
          })
          .from(listingImages)
          .where(inArray(listingImages.listingId, listingIds))
          .groupBy(listingImages.listingId)
      : [];

    const imageCountMap = new Map(
      imageCounts.map((ic) => [ic.listingId, ic.count])
    );

    // Map to ListingSummary
    const listingSummaries: ListingSummary[] = results.map((r: typeof results[number]) => ({
      id: r.id,
      title: r.title,
      price: r.price ? Number(r.price) : null,
      pricePerSqm: r.pricePerSqm ? Number(r.pricePerSqm) : null,
      city: r.city,
      neighborhood: r.neighborhood,
      propertyType: r.propertyType,
      operationType: r.operationType,
      sizeSqm: r.sizeSqm,
      rooms: r.rooms,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      imageUrl: imageMap.get(r.id) ?? null,
      imageCount: imageCountMap.get(r.id) ?? 0,
      authenticityScore: r.authenticityScore,
      isAiGenerated: r.isAiGenerated,
      source: r.sourceId
        ? {
            id: r.sourceId,
            name: r.sourceName ?? '',
            slug: r.sourceSlug ?? '',
          }
        : null,
      createdAt: r.createdAt,
    }));

    return {
      listings: listingSummaries,
      total,
      hasMore: filters.offset + results.length < total,
    };
  }

  async hybridSearch(
    query: string,
    filters: SearchFilters
  ): Promise<SearchResult> {
    // Execute both searches in parallel
    const [semantic, filtered] = await Promise.all([
      this.semanticSearch(query, { ...filters, limit: 50 }),
      this.filterSearch({ ...filters, limit: 50 }),
    ]);

    // Merge using Reciprocal Rank Fusion
    const merged = this.reciprocalRankFusion(
      semantic.listings,
      filtered.listings,
      filters.limit
    );

    return {
      listings: merged,
      total: Math.max(semantic.total, filtered.total),
      hasMore: merged.length >= filters.limit,
    };
  }

  async autocomplete(partial: string, limit = 10): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const searchTerm = `%${partial.toLowerCase()}%`;

    // Search cities
    const cities = await db
      .selectDistinct({ city: listings.city })
      .from(listings)
      .where(
        and(
          sql`LOWER(${listings.city}) LIKE ${searchTerm}`,
          eq(listings.status, 'active')
        )
      )
      .limit(5);

    for (const { city } of cities) {
      if (city) {
        suggestions.push({
          type: 'city',
          value: city,
          label: city,
        });
      }
    }

    // Search neighborhoods
    const neighborhoods = await db
      .selectDistinct({
        neighborhood: listings.neighborhood,
        city: listings.city,
      })
      .from(listings)
      .where(
        and(
          sql`LOWER(${listings.neighborhood}) LIKE ${searchTerm}`,
          eq(listings.status, 'active')
        )
      )
      .limit(5);

    for (const { neighborhood, city } of neighborhoods) {
      if (neighborhood) {
        suggestions.push({
          type: 'neighborhood',
          value: neighborhood,
          label: `${neighborhood}, ${city}`,
        });
      }
    }

    return suggestions.slice(0, limit);
  }

  async findSimilar(listingId: string, limit = 6): Promise<ListingSummary[]> {
    // Get the reference listing
    const reference = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
    });

    if (!reference) {
      return [];
    }

    // Find similar by location and characteristics
    const similar = await this.filterSearch({
      city: reference.city ?? undefined,
      propertyType: reference.propertyType ? [reference.propertyType] : undefined,
      operationType: reference.operationType ?? undefined,
      priceMin: reference.price ? Number(reference.price) * 0.8 : undefined,
      priceMax: reference.price ? Number(reference.price) * 1.2 : undefined,
      limit: limit + 1, // +1 to exclude the reference
      offset: 0,
    });

    // Exclude the reference listing
    return similar.listings.filter((l) => l.id !== listingId).slice(0, limit);
  }

  async parseNaturalLanguageQuery(query: string): Promise<ParsedQuery> {
    try {
      const parsed = await aiEngine.parseSearchQuery(query);
      return parsed;
    } catch (error) {
      // Fallback: basic parsing
      return {
        originalQuery: query,
        filters: {},
        interpretation: query,
        confidence: 0.5,
      };
    }
  }

  // ============================================
  // Private methods
  // ============================================

  private buildWhereConditions(filters: SearchFilters) {
    const conditions = [eq(listings.status, 'active')];

    if (filters.city) {
      conditions.push(eq(listings.city, filters.city));
    }

    if (filters.neighborhood) {
      conditions.push(eq(listings.neighborhood, filters.neighborhood));
    }

    if (filters.province) {
      conditions.push(eq(listings.province, filters.province));
    }

    if (filters.propertyType && filters.propertyType.length > 0) {
      conditions.push(
        inArray(listings.propertyType, filters.propertyType as any)
      );
    }

    if (filters.operationType) {
      conditions.push(eq(listings.operationType, filters.operationType));
    }

    if (filters.priceMin != null) {
      conditions.push(gte(listings.price, filters.priceMin.toString()));
    }

    if (filters.priceMax != null) {
      conditions.push(lte(listings.price, filters.priceMax.toString()));
    }

    if (filters.sizeMin != null) {
      conditions.push(gte(listings.sizeSqm, filters.sizeMin));
    }

    if (filters.sizeMax != null) {
      conditions.push(lte(listings.sizeSqm, filters.sizeMax));
    }

    if (filters.roomsMin != null) {
      conditions.push(gte(listings.rooms, filters.roomsMin));
    }

    if (filters.bedroomsMin != null) {
      conditions.push(gte(listings.bedrooms, filters.bedroomsMin));
    }

    if (filters.bathroomsMin != null) {
      conditions.push(gte(listings.bathrooms, filters.bathroomsMin));
    }

    if (filters.hasParking != null) {
      conditions.push(eq(listings.hasParking, filters.hasParking));
    }

    if (filters.hasElevator != null) {
      conditions.push(eq(listings.hasElevator, filters.hasElevator));
    }

    if (filters.hasTerrace != null) {
      conditions.push(eq(listings.hasTerrace, filters.hasTerrace));
    }

    if (filters.hasGarden != null) {
      conditions.push(eq(listings.hasGarden, filters.hasGarden));
    }

    if (filters.hasPool != null) {
      conditions.push(eq(listings.hasPool, filters.hasPool));
    }

    if (filters.authenticityScoreMin != null) {
      conditions.push(gte(listings.authenticityScore, filters.authenticityScoreMin));
    }

    if (filters.sources && filters.sources.length > 0) {
      conditions.push(inArray(listings.sourceId, filters.sources));
    }

    return conditions;
  }

  private applySorting(query: any, sortBy?: string) {
    switch (sortBy) {
      case 'price_asc':
        return query.orderBy(asc(listings.price));
      case 'price_desc':
        return query.orderBy(desc(listings.price));
      case 'date':
        return query.orderBy(desc(listings.createdAt));
      case 'authenticity':
        return query.orderBy(desc(listings.authenticityScore));
      case 'relevance':
      default:
        return query.orderBy(desc(listings.createdAt));
    }
  }

  private reciprocalRankFusion(
    list1: ListingSummary[],
    list2: ListingSummary[],
    limit: number,
    k = 60
  ): ListingSummary[] {
    const scores = new Map<string, number>();
    const items = new Map<string, ListingSummary>();

    // Score from list1
    list1.forEach((item, rank) => {
      const score = 1 / (k + rank + 1);
      scores.set(item.id, (scores.get(item.id) ?? 0) + score);
      items.set(item.id, item);
    });

    // Score from list2
    list2.forEach((item, rank) => {
      const score = 1 / (k + rank + 1);
      scores.set(item.id, (scores.get(item.id) ?? 0) + score);
      items.set(item.id, item);
    });

    // Sort by combined score
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => items.get(id)!)
      .filter(Boolean);

    return sorted;
  }
}

// Singleton instance
export const searchService = new SearchServiceImpl();
