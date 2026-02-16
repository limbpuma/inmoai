/**
 * InmoAI Pricing Configuration
 *
 * Modelo hibrido: Suscripcion base + Outcome-based pricing
 * Alineado con el valor: pagas mas cuando obtienes mas
 */

// ============================================
// TYPES
// ============================================

export type PricingTier = 'free' | 'pro' | 'agency' | 'enterprise';

export interface TierLimits {
  searchesPerMonth: number;
  semanticSearches: number;
  cadastreVerifications: number;
  fraudDetections: number;
  valuations: number;
  savedSearches: number;
  alerts: number;
  activeListings: number;
  leadsPerMonth: number;
  apiCallsPerMonth: number;
}

export interface TierFeatures {
  semanticSearch: boolean;
  cadastreVerification: boolean;
  fraudDetection: boolean;
  aiValuation: boolean;
  priceHistory: boolean;
  marketAlerts: boolean;
  exportData: boolean;
  prioritySupport: boolean;
  whiteLabel: boolean;
  dedicatedAccount: boolean;
  apiAccess: boolean;
  bulkOperations: boolean;
}

export interface PricingTierConfig {
  id: PricingTier;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  limits: TierLimits;
  features: TierFeatures;
  stripePriceId?: string;
}

// ============================================
// TIER CONFIGURATIONS
// ============================================

export const PRICING_TIERS: Record<PricingTier, PricingTierConfig> = {
  free: {
    id: 'free',
    name: 'Explorador',
    description: 'Ideal para compradores casuales',
    priceMonthly: 0,
    priceYearly: 0,
    limits: {
      searchesPerMonth: 30,
      semanticSearches: 3,
      cadastreVerifications: 1,
      fraudDetections: 3,
      valuations: 1,
      savedSearches: 2,
      alerts: 1,
      activeListings: 0,
      leadsPerMonth: 0,
      apiCallsPerMonth: 0,
    },
    features: {
      semanticSearch: true,
      cadastreVerification: true,
      fraudDetection: true,
      aiValuation: true,
      priceHistory: true,
      marketAlerts: false,
      exportData: false,
      prioritySupport: false,
      whiteLabel: false,
      dedicatedAccount: false,
      apiAccess: false,
      bulkOperations: false,
    },
  },

  pro: {
    id: 'pro',
    name: 'Profesional',
    description: 'Para agentes y vendedores activos',
    priceMonthly: 49,
    priceYearly: 529,
    limits: {
      searchesPerMonth: 500,
      semanticSearches: 200,
      cadastreVerifications: 50,
      fraudDetections: 100,
      valuations: 30,
      savedSearches: 20,
      alerts: 10,
      activeListings: 10,
      leadsPerMonth: 50,
      apiCallsPerMonth: 0,
    },
    features: {
      semanticSearch: true,
      cadastreVerification: true,
      fraudDetection: true,
      aiValuation: true,
      priceHistory: true,
      marketAlerts: true,
      exportData: true,
      prioritySupport: false,
      whiteLabel: false,
      dedicatedAccount: false,
      apiAccess: false,
      bulkOperations: false,
    },
  },

  agency: {
    id: 'agency',
    name: 'Agencia',
    description: 'Para equipos inmobiliarios',
    priceMonthly: 149,
    priceYearly: 1609,
    limits: {
      searchesPerMonth: 2000,
      semanticSearches: 1000,
      cadastreVerifications: 200,
      fraudDetections: 500,
      valuations: 150,
      savedSearches: 100,
      alerts: 50,
      activeListings: 100,
      leadsPerMonth: 300,
      apiCallsPerMonth: 1000,
    },
    features: {
      semanticSearch: true,
      cadastreVerification: true,
      fraudDetection: true,
      aiValuation: true,
      priceHistory: true,
      marketAlerts: true,
      exportData: true,
      prioritySupport: true,
      whiteLabel: false,
      dedicatedAccount: false,
      apiAccess: true,
      bulkOperations: true,
    },
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'API B2B para fintechs y portales',
    priceMonthly: 499,
    priceYearly: 4990,
    limits: {
      searchesPerMonth: -1,
      semanticSearches: -1,
      cadastreVerifications: -1,
      fraudDetections: -1,
      valuations: -1,
      savedSearches: -1,
      alerts: -1,
      activeListings: -1,
      leadsPerMonth: -1,
      apiCallsPerMonth: 50000,
    },
    features: {
      semanticSearch: true,
      cadastreVerification: true,
      fraudDetection: true,
      aiValuation: true,
      priceHistory: true,
      marketAlerts: true,
      exportData: true,
      prioritySupport: true,
      whiteLabel: true,
      dedicatedAccount: true,
      apiAccess: true,
      bulkOperations: true,
    },
  },
};

// ============================================
// OUTCOME-BASED PRICING (Pay-per-success)
// ============================================

export const OUTCOME_PRICING = {
  qualifiedLead: {
    price: 35,
    description: 'Lead cualificado que agenda visita',
  },
  closedDeal: {
    salePercentage: 0.5,
    rentFirstMonthPercent: 5,
    minFee: 100,
    maxFee: 5000,
    description: 'Comision por cierre exitoso (0.5% ventas, 5% primer mes alquiler)',
  },
  premiumVerification: {
    price: 15,
    description: 'Verificacion catastral completa premium',
  },
  directoryListing: {
    price: 10,
    description: 'Consulta directorio empresarial premium',
  },
  comprehensiveVerification: {
    price: 25,
    description: 'Verificacion integral: catastro + fraude + mercado + comparables',
  },
} as const;

// ============================================
// HELPERS
// ============================================

export function getTierConfig(tier: PricingTier): PricingTierConfig {
  return PRICING_TIERS[tier];
}

export function isFeatureEnabled(tier: PricingTier, feature: keyof TierFeatures): boolean {
  return PRICING_TIERS[tier].features[feature];
}

export function getLimit(tier: PricingTier, limit: keyof TierLimits): number {
  return PRICING_TIERS[tier].limits[limit];
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}

export function calculateOutcomeFee(type: 'sale' | 'rent', price: number): number {
  const { salePercentage, rentFirstMonthPercent, minFee, maxFee } = OUTCOME_PRICING.closedDeal;

  const fee = type === 'sale'
    ? (price * salePercentage) / 100
    : (price * rentFirstMonthPercent) / 100;

  return Math.min(Math.max(fee, minFee), maxFee);
}

// ============================================
// API PRICING (for AI agents via MCP/REST)
// ============================================

export const API_PRICING = {
  verification: {
    basic: 0.15,
    comprehensive: 0.50,
    description: 'Verificacion catastral por API (basic/comprehensive)',
  },
  directoryQuery: {
    price: 0.10,
    description: 'Consulta directorio empresarial por API',
  },
  contentGeneration: {
    price: 0.25,
    description: 'Generacion de contenido AI por API',
  },
  socialPost: {
    price: 0.50,
    description: 'Publicacion en redes sociales por API',
  },
} as const;
