/**
 * Idealista Portal Adapter
 * Implements integration with Idealista's API
 *
 * Note: This is a reference implementation. Actual API endpoints
 * and authentication flows must be verified with Idealista's
 * developer documentation when available.
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
import { PortalAuthError, PortalError, PortalRateLimitError } from '../types';
import { env } from '../../../../config/env';

// Idealista API configuration (placeholder URLs - must be verified)
const IDEALISTA_API_BASE = 'https://api.idealista.com/v1';
const IDEALISTA_AUTH_URL = 'https://www.idealista.com/oauth/authorize';
const IDEALISTA_TOKEN_URL = 'https://api.idealista.com/oauth/token';

export default class IdealistaAdapter extends BasePortalAdapter {
  readonly portal: Portal = 'idealista';

  readonly info: PortalInfo = {
    id: 'idealista',
    name: 'idealista',
    displayName: 'Idealista',
    logoUrl: 'https://www.idealista.com/favicon.ico',
    websiteUrl: 'https://www.idealista.com',
    capabilities: {
      supportsOAuth: true,
      supportsApiKey: false,
      supportsBulkPublish: false,
      supportsAnalytics: true,
      supportsLeadSync: true,
      supportsAutoUpdate: true,
      maxImagesPerListing: 50,
      supportedPropertyTypes: [
        'apartment', 'house', 'studio', 'penthouse', 'duplex',
        'loft', 'villa', 'chalet', 'townhouse', 'land',
        'commercial', 'office', 'garage', 'storage',
      ],
      supportedOperationTypes: ['sale', 'rent'],
      requiredFields: ['title', 'description', 'price', 'city', 'propertyType', 'operationType'],
      optionalFields: ['address', 'postalCode', 'sizeSqm', 'bedrooms', 'bathrooms'],
    },
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
    },
  };

  // ============================================
  // OAUTH METHODS
  // ============================================

  getOAuthConfig(): OAuthConfig | null {
    const clientId = env.IDEALISTA_CLIENT_ID;
    const clientSecret = env.IDEALISTA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return null;
    }

    return {
      clientId,
      clientSecret,
      redirectUri: `${env.APP_URL}/api/portals/callback/idealista`,
      authorizationUrl: IDEALISTA_AUTH_URL,
      tokenUrl: IDEALISTA_TOKEN_URL,
      scopes: ['listings:read', 'listings:write', 'leads:read', 'analytics:read'],
    };
  }

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const config = this.getOAuthConfig();
    if (!config) {
      throw new PortalAuthError('Idealista OAuth not configured', this.portal);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<AuthResult> {
    const config = this.getOAuthConfig();
    if (!config) {
      return { success: false, error: 'Idealista OAuth not configured' };
    }

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Token exchange failed: ${error}`,
          errorCode: `HTTP_${response.status}`,
        };
      }

      const data = await response.json();

      // Fetch account info
      const accountInfo = await this.fetchAccountInfo(data.access_token);

      return {
        success: true,
        tokens: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
          tokenType: data.token_type,
          scope: data.scope,
        },
        accountInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token exchange failed',
      };
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthResult> {
    const config = this.getOAuthConfig();
    if (!config) {
      return { success: false, error: 'Idealista OAuth not configured' };
    }

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Token refresh failed: ${error}`,
          errorCode: `HTTP_${response.status}`,
        };
      }

      const data = await response.json();

      return {
        success: true,
        tokens: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || refreshToken,
          expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
          tokenType: data.token_type,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      };
    }
  }

  async revokeTokens(context: AdapterContext): Promise<void> {
    // Idealista may not have a revoke endpoint
    // Implementation depends on their API
    console.log(`Revoking tokens for connection ${context.connectionId}`);
  }

  // ============================================
  // LISTING OPERATIONS
  // ============================================

  async publishListing(
    context: AdapterContext,
    listing: PortalListingData,
    options?: PublishOptions
  ): Promise<PublishResult> {
    this.validateListingData(listing);

    try {
      const idealistaListing = this.transformToIdealistaFormat(listing);

      const response = await this.apiRequest(context, 'POST', '/listings', {
        ...idealistaListing,
        options: {
          featured: options?.featured || false,
          highlighted: options?.highlighted || false,
          duration: options?.duration || 30,
        },
      });

      if (!response.ok) {
        return await this.handleApiError(response, 'publish');
      }

      const data = await response.json();

      return {
        success: true,
        portalListingId: data.id,
        portalUrl: data.url || `https://www.idealista.com/inmueble/${data.id}`,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Publish failed',
      };
    }
  }

  async updateListing(
    context: AdapterContext,
    portalListingId: string,
    listing: Partial<PortalListingData>
  ): Promise<UpdateResult> {
    try {
      const updates = this.transformToIdealistaFormat(listing as PortalListingData);

      const response = await this.apiRequest(
        context,
        'PATCH',
        `/listings/${portalListingId}`,
        updates
      );

      if (!response.ok) {
        return await this.handleApiError(response, 'update');
      }

      const data = await response.json();

      return {
        success: true,
        portalUrl: data.url,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  async deleteListing(context: AdapterContext, portalListingId: string): Promise<DeleteResult> {
    try {
      const response = await this.apiRequest(
        context,
        'DELETE',
        `/listings/${portalListingId}`
      );

      if (!response.ok && response.status !== 404) {
        const error = await response.text();
        return {
          success: false,
          error: `Delete failed: ${error}`,
          errorCode: `HTTP_${response.status}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  async checkListingStatus(
    context: AdapterContext,
    portalListingId: string
  ): Promise<{ isActive: boolean; expiresAt?: Date }> {
    try {
      const response = await this.apiRequest(
        context,
        'GET',
        `/listings/${portalListingId}/status`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { isActive: false };
        }
        throw new PortalError('Status check failed', `HTTP_${response.status}`, this.portal);
      }

      const data = await response.json();

      return {
        isActive: data.status === 'active',
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      };
    } catch (error) {
      if (error instanceof PortalError) throw error;
      return { isActive: false };
    }
  }

  // ============================================
  // LEAD SYNC
  // ============================================

  async fetchLeads(
    context: AdapterContext,
    since?: Date,
    portalListingId?: string
  ): Promise<PortalLeadData[]> {
    try {
      const params = new URLSearchParams();
      if (since) params.set('since', since.toISOString());
      if (portalListingId) params.set('listing_id', portalListingId);

      const response = await this.apiRequest(
        context,
        'GET',
        `/leads?${params.toString()}`
      );

      if (!response.ok) {
        throw new PortalError('Lead fetch failed', `HTTP_${response.status}`, this.portal);
      }

      const data = await response.json();

      return (data.leads || []).map((lead: Record<string, unknown>) => ({
        portalLeadId: lead.id as string,
        contactName: lead.name as string | undefined,
        contactEmail: lead.email as string | undefined,
        contactPhone: lead.phone as string | undefined,
        subject: lead.subject as string | undefined,
        message: lead.message as string | undefined,
        receivedAt: new Date(lead.created_at as string),
        rawData: lead,
      }));
    } catch (error) {
      if (error instanceof PortalError) throw error;
      throw new PortalError(
        error instanceof Error ? error.message : 'Lead fetch failed',
        'UNKNOWN',
        this.portal
      );
    }
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async fetchAnalytics(
    context: AdapterContext,
    portalListingId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PortalAnalyticsData[]> {
    try {
      const params = new URLSearchParams({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });

      const response = await this.apiRequest(
        context,
        'GET',
        `/listings/${portalListingId}/analytics?${params.toString()}`
      );

      if (!response.ok) {
        throw new PortalError('Analytics fetch failed', `HTTP_${response.status}`, this.portal);
      }

      const data = await response.json();

      return (data.daily || []).map((day: Record<string, unknown>) => ({
        date: new Date(day.date as string),
        views: (day.views as number) || 0,
        uniqueViews: (day.unique_views as number) || 0,
        clicks: (day.clicks as number) || 0,
        phoneClicks: (day.phone_clicks as number) || 0,
        emailClicks: (day.email_clicks as number) || 0,
        favorites: (day.favorites as number) || 0,
        shares: (day.shares as number) || 0,
        searchPosition: day.search_position as number | undefined,
      }));
    } catch (error) {
      if (error instanceof PortalError) throw error;
      throw new PortalError(
        error instanceof Error ? error.message : 'Analytics fetch failed',
        'UNKNOWN',
        this.portal
      );
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async fetchAccountInfo(accessToken: string): Promise<{ id: string; email?: string; name?: string }> {
    try {
      const response = await fetch(`${IDEALISTA_API_BASE}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return { id: 'unknown' };
      }

      const data = await response.json();
      return {
        id: data.id || data.user_id || 'unknown',
        email: data.email,
        name: data.name || data.display_name,
      };
    } catch {
      return { id: 'unknown' };
    }
  }

  private async apiRequest(
    context: AdapterContext,
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<Response> {
    const url = `${IDEALISTA_API_BASE}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${context.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      throw new PortalRateLimitError(this.portal, retryAfter);
    }

    // Handle auth errors
    if (response.status === 401) {
      throw new PortalAuthError('Access token expired or invalid', this.portal);
    }

    return response;
  }

  private async handleApiError(response: Response, operation: string): Promise<PublishResult | UpdateResult> {
    let errorMessage = `${operation} failed`;
    let errorCode = `HTTP_${response.status}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
      errorCode = errorData.code || errorCode;
    } catch {
      // If JSON parsing fails, use status text
      errorMessage = response.statusText || errorMessage;
    }

    return {
      success: false,
      error: errorMessage,
      errorCode,
    };
  }

  private transformToIdealistaFormat(listing: PortalListingData): Record<string, unknown> {
    // Map InmoAI property types to Idealista's format
    const propertyTypeMap: Record<string, string> = {
      apartment: 'flat',
      house: 'house',
      studio: 'studio',
      penthouse: 'penthouse',
      duplex: 'duplex',
      loft: 'loft',
      villa: 'villa',
      chalet: 'chalet',
      townhouse: 'terraced',
      land: 'land',
      commercial: 'premises',
      office: 'office',
      garage: 'garage',
      storage: 'storage',
    };

    return {
      title: listing.title,
      description: listing.description,
      price: listing.price,
      operation: listing.operationType === 'sale' ? 'sale' : 'rent',
      property_type: propertyTypeMap[listing.propertyType] || 'flat',
      location: {
        address: listing.address,
        city: listing.city,
        province: listing.province,
        postal_code: listing.postalCode,
        latitude: listing.latitude,
        longitude: listing.longitude,
      },
      features: {
        size: listing.sizeSqm,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        floor: listing.floor,
        has_elevator: listing.hasElevator,
        has_parking: listing.hasParking,
        has_terrace: listing.hasTerrace,
        has_pool: listing.hasPool,
        has_garden: listing.hasGarden,
        energy_rating: listing.energyRating,
        year_built: listing.yearBuilt,
      },
      images: listing.images.map((img, idx) => ({
        url: img.url,
        caption: img.caption,
        is_main: img.isMain || idx === 0,
        order: img.order ?? idx,
      })),
      contact: {
        name: listing.contactName,
        phone: listing.contactPhone,
        email: listing.contactEmail,
      },
    };
  }
}
