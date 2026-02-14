/**
 * Base Portal Adapter
 * Abstract class that all portal adapters must extend
 */

import crypto from 'crypto';
import type { Portal } from '../../infrastructure/database/schema';
import type {
  AdapterContext,
  AuthResult,
  DeleteResult,
  OAuthConfig,
  PortalAnalyticsData,
  PortalCapabilities,
  PortalInfo,
  PortalLeadData,
  PortalListingData,
  PublishOptions,
  PublishResult,
  UpdateResult,
} from './types';
import { PortalValidationError } from './types';

export abstract class BasePortalAdapter {
  abstract readonly portal: Portal;
  abstract readonly info: PortalInfo;

  // ============================================
  // OAUTH METHODS
  // ============================================

  /**
   * Get OAuth configuration for this portal
   */
  abstract getOAuthConfig(): OAuthConfig | null;

  /**
   * Generate the OAuth authorization URL
   * @param state - CSRF protection state parameter
   * @param redirectUri - Where to redirect after auth
   */
  abstract getAuthorizationUrl(state: string, redirectUri: string): string;

  /**
   * Exchange authorization code for tokens
   * @param code - Authorization code from OAuth callback
   * @param redirectUri - Must match the original redirect URI
   */
  abstract exchangeCodeForTokens(code: string, redirectUri: string): Promise<AuthResult>;

  /**
   * Refresh expired access token
   * @param refreshToken - The refresh token
   */
  abstract refreshAccessToken(refreshToken: string): Promise<AuthResult>;

  /**
   * Revoke tokens (logout from portal)
   * @param context - Adapter context with tokens
   */
  abstract revokeTokens(context: AdapterContext): Promise<void>;

  // ============================================
  // LISTING OPERATIONS
  // ============================================

  /**
   * Publish a new listing to the portal
   * @param context - Adapter context with connection info
   * @param listing - Listing data to publish
   * @param options - Optional publish options (featured, highlighted, etc.)
   */
  abstract publishListing(
    context: AdapterContext,
    listing: PortalListingData,
    options?: PublishOptions
  ): Promise<PublishResult>;

  /**
   * Update an existing listing on the portal
   * @param context - Adapter context
   * @param portalListingId - The ID of the listing on the portal
   * @param listing - Updated listing data
   */
  abstract updateListing(
    context: AdapterContext,
    portalListingId: string,
    listing: Partial<PortalListingData>
  ): Promise<UpdateResult>;

  /**
   * Delete/unpublish a listing from the portal
   * @param context - Adapter context
   * @param portalListingId - The ID of the listing on the portal
   */
  abstract deleteListing(
    context: AdapterContext,
    portalListingId: string
  ): Promise<DeleteResult>;

  /**
   * Check if a listing is still active on the portal
   * @param context - Adapter context
   * @param portalListingId - The ID of the listing on the portal
   */
  abstract checkListingStatus(
    context: AdapterContext,
    portalListingId: string
  ): Promise<{ isActive: boolean; expiresAt?: Date }>;

  // ============================================
  // LEAD SYNC
  // ============================================

  /**
   * Fetch leads/inquiries from the portal
   * @param context - Adapter context
   * @param since - Only fetch leads after this date
   * @param portalListingId - Optional: filter to specific listing
   */
  abstract fetchLeads(
    context: AdapterContext,
    since?: Date,
    portalListingId?: string
  ): Promise<PortalLeadData[]>;

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Fetch analytics/statistics for a listing
   * @param context - Adapter context
   * @param portalListingId - The ID of the listing on the portal
   * @param startDate - Start of date range
   * @param endDate - End of date range
   */
  abstract fetchAnalytics(
    context: AdapterContext,
    portalListingId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PortalAnalyticsData[]>;

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Validate listing data before publishing
   * Throws PortalValidationError if invalid
   */
  validateListingData(listing: PortalListingData): void {
    const errors: Record<string, string> = {};

    const requiredFields = this.info.capabilities.requiredFields;

    for (const field of requiredFields) {
      const value = listing[field as keyof PortalListingData];
      if (value === undefined || value === null || value === '') {
        errors[field] = `${field} is required`;
      }
    }

    // Validate images
    if (listing.images.length === 0) {
      errors['images'] = 'At least one image is required';
    }
    if (listing.images.length > this.info.capabilities.maxImagesPerListing) {
      errors['images'] = `Maximum ${this.info.capabilities.maxImagesPerListing} images allowed`;
    }

    // Validate property type
    if (!this.info.capabilities.supportedPropertyTypes.includes(listing.propertyType)) {
      errors['propertyType'] = `Property type ${listing.propertyType} not supported`;
    }

    // Validate operation type
    if (!this.info.capabilities.supportedOperationTypes.includes(listing.operationType)) {
      errors['operationType'] = `Operation type ${listing.operationType} not supported`;
    }

    if (Object.keys(errors).length > 0) {
      throw new PortalValidationError(
        'Listing validation failed',
        this.portal,
        errors
      );
    }
  }

  /**
   * Generate a content hash for change detection
   */
  generateContentHash(listing: PortalListingData): string {
    const normalized = JSON.stringify({
      title: listing.title,
      description: listing.description,
      price: listing.price,
      images: listing.images.map(i => i.url).sort(),
    });
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 64);
  }

  /**
   * Check if capabilities support a feature
   */
  supportsFeature(feature: keyof PortalCapabilities): boolean {
    const value = this.info.capabilities[feature];
    return typeof value === 'boolean' ? value : false;
  }
}
