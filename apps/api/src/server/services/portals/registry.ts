/**
 * Portal Adapter Registry
 * Central registry for all portal adapters
 */

import type { Portal } from '../../infrastructure/database/schema';
import type { BasePortalAdapter } from './base.adapter';
import type { PortalInfo } from './types';

// Lazy-load adapters to avoid circular dependencies
const adapterModules: Record<Portal, () => Promise<{ default: new () => BasePortalAdapter }>> = {
  idealista: () => import('./adapters/idealista.adapter'),
  fotocasa: () => import('./adapters/fotocasa.adapter'),
  habitaclia: () => import('./adapters/habitaclia.adapter'),
  pisos: () => import('./adapters/pisos.adapter'),
  milanuncios: () => import('./adapters/milanuncios.adapter'),
};

// Cache instantiated adapters
const adapterCache = new Map<Portal, BasePortalAdapter>();

/**
 * Get adapter instance for a portal
 * Adapters are singletons - cached after first instantiation
 */
export async function getAdapter(portal: Portal): Promise<BasePortalAdapter> {
  // Return cached adapter if available
  const cached = adapterCache.get(portal);
  if (cached) {
    return cached;
  }

  // Lazy-load and instantiate adapter
  const loadAdapter = adapterModules[portal];
  if (!loadAdapter) {
    throw new Error(`No adapter found for portal: ${portal}`);
  }

  try {
    const module = await loadAdapter();
    const adapter = new module.default();
    adapterCache.set(portal, adapter);
    return adapter;
  } catch (error) {
    // If adapter module doesn't exist yet, return a placeholder error
    throw new Error(`Adapter for ${portal} is not yet implemented`);
  }
}

/**
 * Get info for all available portals
 */
export function getAllPortalInfo(): PortalInfo[] {
  return [
    {
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
          'commercial', 'office', 'garage', 'storage'
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
    },
    {
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
          'villa', 'chalet', 'townhouse', 'land', 'commercial', 'garage'
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
    },
    {
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
          'villa', 'chalet', 'townhouse', 'land'
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
    },
    {
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
          'villa', 'chalet', 'townhouse'
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
    },
    {
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
          'villa', 'chalet', 'land'
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
    },
  ];
}

/**
 * Get info for a specific portal
 */
export function getPortalInfo(portal: Portal): PortalInfo | undefined {
  return getAllPortalInfo().find(p => p.id === portal);
}

/**
 * Get list of portals that support a specific feature
 */
export function getPortalsByCapability(capability: keyof PortalInfo['capabilities']): Portal[] {
  return getAllPortalInfo()
    .filter(p => {
      const value = p.capabilities[capability];
      return typeof value === 'boolean' ? value : false;
    })
    .map(p => p.id);
}

/**
 * Check if a portal is available (has an implemented adapter)
 */
export async function isPortalAvailable(portal: Portal): Promise<boolean> {
  try {
    await getAdapter(portal);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all available portals (with implemented adapters)
 */
export async function getAvailablePortals(): Promise<Portal[]> {
  const portals: Portal[] = ['idealista', 'fotocasa', 'habitaclia', 'pisos', 'milanuncios'];
  const available: Portal[] = [];

  for (const portal of portals) {
    if (await isPortalAvailable(portal)) {
      available.push(portal);
    }
  }

  return available;
}
