/**
 * Milanuncios Portal Adapter
 * Placeholder - To be implemented with Milanuncios API documentation
 * Note: Milanuncios may not have a public API, might require web automation
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

export default class MilanunciosAdapter extends BasePortalAdapter {
  readonly portal: Portal = 'milanuncios';

  readonly info: PortalInfo = {
    id: 'milanuncios',
    name: 'milanuncios',
    displayName: 'Milanuncios',
    logoUrl: 'https://www.milanuncios.com/favicon.ico',
    websiteUrl: 'https://www.milanuncios.com',
    capabilities: {
      supportsOAuth: false,
      supportsApiKey: false,
      supportsBulkPublish: false,
      supportsAnalytics: false,
      supportsLeadSync: false,
      supportsAutoUpdate: false,
      maxImagesPerListing: 10,
      supportedPropertyTypes: [
        'apartment', 'house', 'studio', 'penthouse',
        'villa', 'chalet', 'land',
      ],
      supportedOperationTypes: ['sale', 'rent'],
      requiredFields: ['title', 'description', 'price', 'city', 'propertyType', 'operationType'],
      optionalFields: ['address', 'sizeSqm', 'bedrooms'],
    },
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 500,
    },
  };

  getOAuthConfig(): OAuthConfig | null {
    return null;
  }

  getAuthorizationUrl(_state: string, _redirectUri: string): string {
    throw new Error('Milanuncios adapter not yet implemented');
  }

  async exchangeCodeForTokens(_code: string, _redirectUri: string): Promise<AuthResult> {
    throw new Error('Milanuncios adapter not yet implemented');
  }

  async refreshAccessToken(_refreshToken: string): Promise<AuthResult> {
    throw new Error('Milanuncios adapter not yet implemented');
  }

  async revokeTokens(_context: AdapterContext): Promise<void> {
    throw new Error('Milanuncios adapter not yet implemented');
  }

  async publishListing(
    _context: AdapterContext,
    _listing: PortalListingData,
    _options?: PublishOptions
  ): Promise<PublishResult> {
    throw new Error('Milanuncios adapter not yet implemented');
  }

  async updateListing(
    _context: AdapterContext,
    _portalListingId: string,
    _listing: Partial<PortalListingData>
  ): Promise<UpdateResult> {
    throw new Error('Milanuncios adapter not yet implemented');
  }

  async deleteListing(_context: AdapterContext, _portalListingId: string): Promise<DeleteResult> {
    throw new Error('Milanuncios adapter not yet implemented');
  }

  async checkListingStatus(
    _context: AdapterContext,
    _portalListingId: string
  ): Promise<{ isActive: boolean; expiresAt?: Date }> {
    throw new Error('Milanuncios adapter not yet implemented');
  }

  async fetchLeads(
    _context: AdapterContext,
    _since?: Date,
    _portalListingId?: string
  ): Promise<PortalLeadData[]> {
    throw new Error('Milanuncios adapter not yet implemented');
  }

  async fetchAnalytics(
    _context: AdapterContext,
    _portalListingId: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<PortalAnalyticsData[]> {
    throw new Error('Milanuncios adapter not yet implemented');
  }
}
