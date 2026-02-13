/**
 * Shared types for Portal Autoposting System
 */

import type { Listing, Portal, PortalPost } from '../../infrastructure/database/schema';

// ============================================
// OAUTH & AUTHENTICATION
// ============================================

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export interface AuthResult {
  success: boolean;
  tokens?: OAuthTokens;
  accountInfo?: {
    id: string;
    email?: string;
    name?: string;
  };
  error?: string;
  errorCode?: string;
}

// ============================================
// PORTAL CAPABILITIES
// ============================================

export interface PortalCapabilities {
  supportsOAuth: boolean;
  supportsApiKey: boolean;
  supportsBulkPublish: boolean;
  supportsAnalytics: boolean;
  supportsLeadSync: boolean;
  supportsAutoUpdate: boolean;
  maxImagesPerListing: number;
  supportedPropertyTypes: string[];
  supportedOperationTypes: ('sale' | 'rent')[];
  requiredFields: string[];
  optionalFields: string[];
}

export interface PortalInfo {
  id: Portal;
  name: string;
  displayName: string;
  logoUrl: string;
  websiteUrl: string;
  capabilities: PortalCapabilities;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

// ============================================
// LISTING OPERATIONS
// ============================================

export interface PortalListingData {
  title: string;
  description: string;
  price: number;
  operationType: 'sale' | 'rent';
  propertyType: string;
  address?: string;
  city: string;
  province?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  sizeSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasTerrace?: boolean;
  hasPool?: boolean;
  hasGarden?: boolean;
  energyRating?: string;
  yearBuilt?: number;
  images: PortalImageData[];
  features?: string[];
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface PortalImageData {
  url: string;
  caption?: string;
  isMain?: boolean;
  order?: number;
}

export interface PublishOptions {
  featured?: boolean;
  highlighted?: boolean;
  urgent?: boolean;
  duration?: number; // days
  autoRenew?: boolean;
}

export interface PublishResult {
  success: boolean;
  portalListingId?: string;
  portalUrl?: string;
  expiresAt?: Date;
  error?: string;
  errorCode?: string;
  rawResponse?: unknown;
}

export interface UpdateResult {
  success: boolean;
  portalUrl?: string;
  error?: string;
  errorCode?: string;
  rawResponse?: unknown;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
  errorCode?: string;
}

// ============================================
// LEADS & ANALYTICS
// ============================================

export interface PortalLeadData {
  portalLeadId: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  subject?: string;
  message?: string;
  receivedAt: Date;
  rawData?: Record<string, unknown>;
}

export interface PortalAnalyticsData {
  date: Date;
  views: number;
  uniqueViews?: number;
  clicks?: number;
  phoneClicks?: number;
  emailClicks?: number;
  favorites?: number;
  shares?: number;
  searchPosition?: number;
  categoryPosition?: number;
}

// ============================================
// ADAPTER CONTEXT
// ============================================

export interface AdapterContext {
  connectionId: string;
  userId: string;
  portal: Portal;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  portalAccountId?: string;
}

// ============================================
// CONVERSION UTILITIES
// ============================================

export function listingToPortalData(listing: Partial<Listing>): PortalListingData {
  return {
    title: listing.title || '',
    description: listing.description || listing.aiDescription || '',
    price: listing.price ? Number(listing.price) : 0,
    operationType: listing.operationType as 'sale' | 'rent',
    propertyType: listing.propertyType || 'apartment',
    address: listing.address || undefined,
    city: listing.city || '',
    province: listing.province || undefined,
    postalCode: listing.postalCode || undefined,
    latitude: listing.latitude ? Number(listing.latitude) : undefined,
    longitude: listing.longitude ? Number(listing.longitude) : undefined,
    sizeSqm: listing.sizeSqm || undefined,
    bedrooms: listing.bedrooms || undefined,
    bathrooms: listing.bathrooms || undefined,
    floor: listing.floor || undefined,
    hasElevator: listing.hasElevator || undefined,
    hasParking: listing.hasParking || undefined,
    hasTerrace: listing.hasTerrace || undefined,
    hasPool: listing.hasPool || undefined,
    hasGarden: listing.hasGarden || undefined,
    energyRating: listing.energyRating || undefined,
    yearBuilt: listing.yearBuilt || undefined,
    images: [], // Must be populated separately from listingImages
    features: listing.features as string[] | undefined,
  };
}

// ============================================
// ERROR TYPES
// ============================================

export class PortalError extends Error {
  constructor(
    message: string,
    public code: string,
    public portal: Portal,
    public isRetryable: boolean = false,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'PortalError';
  }
}

export class PortalAuthError extends PortalError {
  constructor(message: string, portal: Portal) {
    super(message, 'AUTH_ERROR', portal, false);
    this.name = 'PortalAuthError';
  }
}

export class PortalRateLimitError extends PortalError {
  constructor(portal: Portal, retryAfter: number) {
    super('Rate limit exceeded', 'RATE_LIMIT', portal, true, retryAfter);
    this.name = 'PortalRateLimitError';
  }
}

export class PortalValidationError extends PortalError {
  constructor(message: string, portal: Portal, public validationErrors: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', portal, false);
    this.name = 'PortalValidationError';
  }
}
