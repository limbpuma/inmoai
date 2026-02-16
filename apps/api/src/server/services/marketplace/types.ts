import type { ServiceCategory, ProviderTier } from '@/server/infrastructure/database/schema';

// ============================================
// PROXIMITY SEARCH TYPES
// ============================================

export interface ProximitySearchParams {
  listingId?: string;

  // Direct location (alternative to listingId)
  latitude?: number;
  longitude?: number;
  city?: string;
  neighborhood?: string;

  // Filters
  categoryIds?: string[];
  improvementCategories?: ServiceCategory[];

  // Search options
  maxDistanceKm?: number;
  minRating?: number;
  verifiedOnly?: boolean;
  availableOnly?: boolean;

  // Pagination
  limit?: number;
  offset?: number;

  // Auto-expansion
  autoExpand?: boolean;
  minResults?: number;
}

export interface ProviderScore {
  proximity: number; // 0-1, weight: 0.35
  subscription: number; // 0-1, weight: 0.25
  quality: number; // 0-1, weight: 0.20
  availability: number; // 0-1, weight: 0.10
  match: number; // 0-1, weight: 0.10
  total: number; // Combined score
}

export interface ProviderServiceInfo {
  id: string;
  category: ServiceCategory;
  title: string;
  priceMin: number | null;
  priceMax: number | null;
  priceUnit: string;
  description: string | null;
}

export interface RankedProvider {
  provider: {
    id: string;
    businessName: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    city: string;
    tier: ProviderTier;
    averageRating: number;
    totalReviews: number;
    totalLeads: number;
    responseTimeMinutes: number | null;
    isVerified: boolean;
    coverageRadiusKm: number;
    contactPhone: string | null;
  };
  services: ProviderServiceInfo[];
  scores: ProviderScore;
  distanceKm: number | null;
  isWithinCoverage: boolean;
}

export interface SearchLocation {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  neighborhood: string | null;
  source: 'exact' | 'centroid' | 'none';
}

export interface ProximitySearchResult {
  providers: RankedProvider[];
  total: number;
  hasMore: boolean;
  searchLocation: SearchLocation;
  radiusUsedKm: number;
}

// ============================================
// CONSTANTS
// ============================================

export const RANKING_WEIGHTS = {
  proximity: 0.35,
  subscription: 0.25,
  quality: 0.2,
  availability: 0.1,
  match: 0.1,
} as const;

export const SUBSCRIPTION_SCORES: Record<ProviderTier, number> = {
  free: 0.25,
  premium: 0.75,
  enterprise: 1.0,
};

export const DEFAULT_SEARCH_RADIUS_KM = 25;
export const MAX_SEARCH_RADIUS_KM = 100;
export const RADIUS_EXPANSION_FACTOR = 1.5;

// Mapping improvement.category to service categories
export const IMPROVEMENT_TO_SERVICE_MAPPING: Record<string, ServiceCategory[]> = {
  painting: ['painting'],
  renovation: ['renovation', 'general'],
  electrical: ['electrical'],
  plumbing: ['plumbing'],
  garden: ['garden'],
  general: ['general'],
};
