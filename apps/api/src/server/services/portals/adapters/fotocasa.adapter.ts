/**
 * Fotocasa Portal Adapter
 * Placeholder - To be implemented with Fotocasa API documentation
 */

import { BasePortalAdapter } from '../base.adapter';
import type { Portal } from '../../../infrastructure/database/schema';
import type {
  AdapterContext,
  AuthResult,
  DeleteResult,
  OAuthConfig,
  PortalAnalyticsData,
  PortalInfo,
  PortalLeadData,
  PortalListingData,
  PublishOptions,
  PublishResult,
  UpdateResult,
} from '../types';

export default class FotocasaAdapter extends BasePortalAdapter {
  readonly portal: Portal = 'fotocasa';

  readonly info: PortalInfo = {
    id: 'fotocasa',
    name: 'fotocasa',
    displayName: 'Fotocasa',
    logoUrl: 'https://www.fotocasa.es/favicon.ico',
    websiteUrl: 'https://www.fotocasa.es',
    capabilities: {
      supportsOAuth: true,
      supportsApiKey: false,
      supportsBulkPublish: true,
      supportsAnalytics: true,
      supportsLeadSync: true,
      supportsAutoUpdate: true,
      maxImagesPerListing: 30,
      supportedPropertyTypes: [
        'apartment', 'house', 'studio', 'penthouse', 'duplex',
        'villa', 'chalet', 'townhouse', 'land', 'commercial', 'garage',
      ],
      supportedOperationTypes: ['sale', 'rent'],
      requiredFields: ['title', 'description', 'price', 'city', 'propertyType', 'operationType'],
      optionalFields: ['address', 'postalCode', 'sizeSqm', 'bedrooms', 'bathrooms'],
    },
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      requestsPerDay: 5000,
    },
  };

  getOAuthConfig(): OAuthConfig | null {
    // TODO: Implement with Fotocasa API credentials
    return null;
  }

  getAuthorizationUrl(_state: string, _redirectUri: string): string {
    throw new Error('Fotocasa adapter not yet implemented');
  }

  async exchangeCodeForTokens(_code: string, _redirectUri: string): Promise<AuthResult> {
    throw new Error('Fotocasa adapter not yet implemented');
  }

  async refreshAccessToken(_refreshToken: string): Promise<AuthResult> {
    throw new Error('Fotocasa adapter not yet implemented');
  }

  async revokeTokens(_context: AdapterContext): Promise<void> {
    throw new Error('Fotocasa adapter not yet implemented');
  }

  async publishListing(
    _context: AdapterContext,
    _listing: PortalListingData,
    _options?: PublishOptions
  ): Promise<PublishResult> {
    throw new Error('Fotocasa adapter not yet implemented');
  }

  async updateListing(
    _context: AdapterContext,
    _portalListingId: string,
    _listing: Partial<PortalListingData>
  ): Promise<UpdateResult> {
    throw new Error('Fotocasa adapter not yet implemented');
  }

  async deleteListing(_context: AdapterContext, _portalListingId: string): Promise<DeleteResult> {
    throw new Error('Fotocasa adapter not yet implemented');
  }

  async checkListingStatus(
    _context: AdapterContext,
    _portalListingId: string
  ): Promise<{ isActive: boolean; expiresAt?: Date }> {
    throw new Error('Fotocasa adapter not yet implemented');
  }

  async fetchLeads(
    _context: AdapterContext,
    _since?: Date,
    _portalListingId?: string
  ): Promise<PortalLeadData[]> {
    throw new Error('Fotocasa adapter not yet implemented');
  }

  async fetchAnalytics(
    _context: AdapterContext,
    _portalListingId: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<PortalAnalyticsData[]> {
    throw new Error('Fotocasa adapter not yet implemented');
  }
}
