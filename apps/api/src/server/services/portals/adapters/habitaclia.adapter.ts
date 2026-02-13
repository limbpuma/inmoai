/**
 * Habitaclia Portal Adapter
 * Placeholder - To be implemented with Habitaclia API documentation
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

export default class HabitacliaAdapter extends BasePortalAdapter {
  readonly portal: Portal = 'habitaclia';

  readonly info: PortalInfo = {
    id: 'habitaclia',
    name: 'habitaclia',
    displayName: 'Habitaclia',
    logoUrl: 'https://www.habitaclia.com/favicon.ico',
    websiteUrl: 'https://www.habitaclia.com',
    capabilities: {
      supportsOAuth: true,
      supportsApiKey: true,
      supportsBulkPublish: false,
      supportsAnalytics: true,
      supportsLeadSync: true,
      supportsAutoUpdate: true,
      maxImagesPerListing: 25,
      supportedPropertyTypes: [
        'apartment', 'house', 'studio', 'penthouse', 'duplex',
        'villa', 'chalet', 'townhouse', 'land',
      ],
      supportedOperationTypes: ['sale', 'rent'],
      requiredFields: ['title', 'description', 'price', 'city', 'propertyType', 'operationType'],
      optionalFields: ['address', 'postalCode', 'sizeSqm', 'bedrooms', 'bathrooms'],
    },
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerHour: 300,
      requestsPerDay: 3000,
    },
  };

  getOAuthConfig(): OAuthConfig | null {
    return null;
  }

  getAuthorizationUrl(_state: string, _redirectUri: string): string {
    throw new Error('Habitaclia adapter not yet implemented');
  }

  async exchangeCodeForTokens(_code: string, _redirectUri: string): Promise<AuthResult> {
    throw new Error('Habitaclia adapter not yet implemented');
  }

  async refreshAccessToken(_refreshToken: string): Promise<AuthResult> {
    throw new Error('Habitaclia adapter not yet implemented');
  }

  async revokeTokens(_context: AdapterContext): Promise<void> {
    throw new Error('Habitaclia adapter not yet implemented');
  }

  async publishListing(
    _context: AdapterContext,
    _listing: PortalListingData,
    _options?: PublishOptions
  ): Promise<PublishResult> {
    throw new Error('Habitaclia adapter not yet implemented');
  }

  async updateListing(
    _context: AdapterContext,
    _portalListingId: string,
    _listing: Partial<PortalListingData>
  ): Promise<UpdateResult> {
    throw new Error('Habitaclia adapter not yet implemented');
  }

  async deleteListing(_context: AdapterContext, _portalListingId: string): Promise<DeleteResult> {
    throw new Error('Habitaclia adapter not yet implemented');
  }

  async checkListingStatus(
    _context: AdapterContext,
    _portalListingId: string
  ): Promise<{ isActive: boolean; expiresAt?: Date }> {
    throw new Error('Habitaclia adapter not yet implemented');
  }

  async fetchLeads(
    _context: AdapterContext,
    _since?: Date,
    _portalListingId?: string
  ): Promise<PortalLeadData[]> {
    throw new Error('Habitaclia adapter not yet implemented');
  }

  async fetchAnalytics(
    _context: AdapterContext,
    _portalListingId: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<PortalAnalyticsData[]> {
    throw new Error('Habitaclia adapter not yet implemented');
  }
}
