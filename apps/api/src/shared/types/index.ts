import { z } from 'zod';

// ============================================
// COMMON TYPES
// ============================================

export type PropertyType =
  | 'apartment'
  | 'house'
  | 'studio'
  | 'penthouse'
  | 'duplex'
  | 'loft'
  | 'villa'
  | 'chalet'
  | 'townhouse'
  | 'land'
  | 'commercial'
  | 'office'
  | 'garage'
  | 'storage';

export type OperationType = 'sale' | 'rent';

export type ListingStatus = 'active' | 'inactive' | 'expired' | 'sold' | 'rented' | 'pending';

export type RoomType =
  | 'living_room'
  | 'bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'dining_room'
  | 'terrace'
  | 'balcony'
  | 'garden'
  | 'garage'
  | 'storage'
  | 'hallway'
  | 'office'
  | 'other';

// ============================================
// SEARCH TYPES
// ============================================

export const searchFiltersSchema = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  province: z.string().optional(),
  propertyType: z.array(z.string()).optional(),
  operationType: z.enum(['sale', 'rent']).optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  sizeMin: z.number().optional(),
  sizeMax: z.number().optional(),
  roomsMin: z.number().optional(),
  roomsMax: z.number().optional(),
  bedroomsMin: z.number().optional(),
  bathroomsMin: z.number().optional(),
  hasParking: z.boolean().optional(),
  hasElevator: z.boolean().optional(),
  hasTerrace: z.boolean().optional(),
  hasGarden: z.boolean().optional(),
  hasPool: z.boolean().optional(),
  authenticityScoreMin: z.number().min(0).max(100).optional(),
  sources: z.array(z.string()).optional(),
  sortBy: z.enum(['relevance', 'price_asc', 'price_desc', 'date', 'authenticity']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export interface SearchResult {
  listings: ListingSummary[];
  total: number;
  hasMore: boolean;
  facets?: {
    cities: { value: string; count: number }[];
    propertyTypes: { value: string; count: number }[];
    priceRanges: { min: number; max: number; count: number }[];
  };
}

// ============================================
// LISTING TYPES
// ============================================

export interface ListingSummary {
  id: string;
  title: string;
  price: number | null;
  pricePerSqm: number | null;
  city: string | null;
  neighborhood: string | null;
  propertyType: PropertyType;
  operationType: OperationType;
  sizeSqm: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  imageUrl: string | null;
  imageCount: number;
  authenticityScore: number | null;
  isAiGenerated: boolean | null;
  source: {
    id: string;
    name: string;
    slug: string;
  } | null;
  priceChange?: {
    amount: number;
    percentage: number;
    date: Date;
  };
  createdAt: Date;
}

export interface ListingDetail extends ListingSummary {
  description: string | null;
  aiDescription: string | null;
  aiHighlights: string[] | null;
  aiIssues: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    location?: string;
  }[] | null;
  address: string | null;
  postalCode: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  floor: number | null;
  totalFloors: number | null;
  hasElevator: boolean | null;
  hasParking: boolean | null;
  hasTerrace: boolean | null;
  hasBalcony: boolean | null;
  hasGarden: boolean | null;
  hasPool: boolean | null;
  hasAirConditioning: boolean | null;
  hasHeating: boolean | null;
  heatingType: string | null;
  orientation: string | null;
  yearBuilt: number | null;
  energyRating: string | null;
  qualityScore: number | null;
  valuationEstimate: number | null;
  valuationConfidence: number | null;
  externalUrl: string | null;
  images: ListingImage[];
  priceHistory: PriceHistoryPoint[];
}

export interface ListingImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  position: number;
  roomType: RoomType | null;
  authenticityScore: number | null;
  isAiGenerated: boolean | null;
  isEdited: boolean | null;
  qualityScore: number | null;
}

export interface PriceHistoryPoint {
  price: number;
  date: Date;
}

// ============================================
// AI ANALYSIS TYPES
// ============================================

export interface AIAnalysisResult {
  marketing: {
    title: string;
    description: string;
    highlights: string[];
  };
  authenticity: {
    isLikelyAIGenerated: boolean;
    isLikelyEdited: boolean;
    authenticityScore: number;
    confidence: number;
    indicators: {
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }[];
    summary: string;
  };
  visualAnalysis: {
    style: string;
    quality: string;
    lighting: string;
    condition: string;
    roomsDetected: string[];
  };
  issues: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    location?: string;
    recommendation?: string;
  }[];
  valuation?: {
    estimatedPrice: { min: number; max: number };
    confidence: number;
    comparables?: string[];
  };
}

// ============================================
// USER TYPES
// ============================================

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: 'user' | 'premium' | 'agency' | 'admin';
  agencyName?: string;
  agencyPhone?: string;
  preferences: {
    defaultCity?: string;
    priceRange?: { min?: number; max?: number };
    notifications?: {
      email?: boolean;
      push?: boolean;
    };
  } | null;
  createdAt: Date;
}

// ============================================
// LEAD TYPES
// ============================================

export const createLeadSchema = z.object({
  listingId: z.string().uuid(),
  name: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().max(1000).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

// ============================================
// API RESPONSE TYPES
// ============================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    processingTimeMs: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
