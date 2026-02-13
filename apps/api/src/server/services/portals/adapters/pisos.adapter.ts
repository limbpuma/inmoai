/**
 * Pisos.com Portal Adapter
 * Placeholder - To be implemented with Pisos.com API documentation
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

export default class PisosAdapter extends BasePortalAdapter {
  readonly portal: Portal = 'pisos';

  readonly info: PortalInfo = {
    id: 'pisos',
    name: 'pisos',
    displayName: 'Pisos.com',
    logoUrl: 'https://www.pisos.com/favicon.ico',
    websiteUrl: 'https://www.pisos.com',
    capabilities: {
      supportsOAuth: false,
      supportsApiKey: true,
      supportsBulkPublish: false,
      supportsAnalytics: true,
      supportsLeadSync: true,
      supportsAutoUpdate: false,
      maxImagesPerListing: 20,
      supportedPropertyTypes: [
        'apartment', 'house', 'studio', 'penthouse', 'duplex',
        'villa', 'chalet', 'townhouse',
      ],
      supportedOperationTypes: ['sale', 'rent'],
      requiredFields: ['title', 'description', 'price', 'city', 'propertyType', 'operationType'],
      optionalFields: ['address', 'postalCode', 'sizeSqm', 'bedrooms', 'bathrooms'],
    },
    rateLimit: {
      requestsPerMinute: 20,
      requestsPerHour: 200,
      requestsPerDay: 2000,
    },
  };

  getOAuthConfig(): OAuthConfig | null {
    return null;
  }

  getAuthorizationUrl(_state: string, _redirectUri: string): string {
    throw new Error('Pisos.com adapter not yet implemented');
  }

  async exchangeCodeForTokens(_code: string, _redirectUri: string): Promise<AuthResult> {
    throw new Error('Pisos.com adapter not yet implemented');
  }

  async refreshAccessToken(_refreshToken: string): Promise<AuthResult> {
    throw new Error('Pisos.com adapter not yet implemented');
  }

  async revokeTokens(_context: AdapterContext): Promise<void> {
    throw new Error('Pisos.com adapter not yet implemented');
  }

  async publishListing(
    _context: AdapterContext,
    _listing: PortalListingData,
    _options?: PublishOptions
  ): Promise<PublishResult> {
    throw new Error('Pisos.com adapter not yet implemented');
  }

  async updateListing(
    _context: AdapterContext,
    _portalListingId: string,
    _listing: Partial<PortalListingData>
  ): Promise<UpdateResult> {
    throw new Error('Pisos.com adapter not yet implemented');
  }

  async deleteListing(_context: AdapterContext, _portalListingId: string): Promise<DeleteResult> {
    throw new Error('Pisos.com adapter not yet implemented');
  }

  async checkListingStatus(
    _context: AdapterContext,
    _portalListingId: string
  ): Promise<{ isActive: boolean; expiresAt?: Date }> {
    throw new Error('Pisos.com adapter not yet implemented');
  }

  async fetchLeads(
    _context: AdapterContext,
    _since?: Date,
    _portalListingId?: string
  ): Promise<PortalLeadData[]> {
    throw new Error('Pisos.com adapter not yet implemented');
  }

  async fetchAnalytics(
    _context: AdapterContext,
    _portalListingId: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<PortalAnalyticsData[]> {
    throw new Error('Pisos.com adapter not yet implemented');
  }
}
