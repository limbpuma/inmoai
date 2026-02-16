/**
 * InmoAI Data Pipeline - Source Management
 *
 * Pipeline de datos LEGAL para InmoAI:
 * - Usuario genera contenido directamente
 * - Importación desde CRMs inmobiliarios
 * - NO scraping de portales (ilegal)
 */

import { z } from 'zod';

// ============================================
// TYPES
// ============================================

export type DataSourceType =
  | 'user_created'      // Usuario crea listing manualmente
  | 'csv_import'        // Importación CSV/Excel
  | 'crm_sync'          // Sincronización con CRM
  | 'api_submission';   // Vía API (B2B)

export type CRMProvider =
  | 'inmovilla'
  | 'witei'
  | 'idealista_pro'     // Exportación oficial (no scraping)
  | 'fotocasa_pro'
  | 'habitaclia_pro'
  | 'custom';

export type OnboardingStage =
  | 'signup'
  | 'profile_setup'
  | 'first_listing'
  | 'verification'
  | 'social_connect'
  | 'completed';

export interface DataSourceConfig {
  type: DataSourceType;
  provider?: CRMProvider;
  enabled: boolean;
  autoSync?: boolean;
  syncIntervalMinutes?: number;
  lastSyncAt?: Date;
  credentials?: {
    apiKey?: string;
    apiSecret?: string;
    webhookUrl?: string;
  };
}

export interface OnboardingProgress {
  userId: string;
  currentStage: OnboardingStage;
  completedStages: OnboardingStage[];
  startedAt: Date;
  completedAt?: Date;
  metadata: {
    listingsCreated: number;
    socialPlatformsConnected: string[];
    verificationCompleted: boolean;
  };
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Schema para validar calidad de datos importados
 */
export const ListingQualitySchema = z.object({
  // Datos obligatorios
  title: z.string().min(10).max(200),
  price: z.number().positive(),
  operation: z.enum(['sale', 'rent']),
  propertyType: z.enum([
    'apartment', 'house', 'studio', 'penthouse', 'duplex',
    'chalet', 'villa', 'land', 'commercial', 'office',
    'garage', 'storage', 'building',
  ]),

  // Ubicación (al menos uno requerido)
  location: z.object({
    address: z.string().optional(),
    city: z.string().min(2),
    province: z.string().optional(),
    postalCode: z.string().regex(/^\d{5}$/).optional(),
    neighborhood: z.string().optional(),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }).optional(),
  }),

  // Características (mejoran score de calidad)
  features: z.object({
    bedrooms: z.number().int().min(0).max(50).optional(),
    bathrooms: z.number().int().min(0).max(20).optional(),
    surface: z.number().positive().max(100000).optional(),
    floor: z.number().int().optional(),
    hasElevator: z.boolean().optional(),
    hasGarage: z.boolean().optional(),
    hasPool: z.boolean().optional(),
    hasTerrace: z.boolean().optional(),
    hasAirConditioning: z.boolean().optional(),
    hasHeating: z.boolean().optional(),
    energyCertificate: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'pending', 'exempt']).optional(),
    yearBuilt: z.number().int().min(1800).max(2030).optional(),
  }).optional(),

  // Descripción
  description: z.string().min(50).max(5000).optional(),

  // Imágenes (mínimo 1 requerida)
  images: z.array(z.object({
    url: z.string().url(),
    caption: z.string().optional(),
    order: z.number().int().optional(),
  })).min(1).max(50),

  // Contacto
  contact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    whatsapp: z.string().optional(),
  }).optional(),

  // Metadata
  externalId: z.string().optional(),
  source: z.enum(['user_created', 'csv_import', 'crm_sync', 'api_submission']),
});

export type ListingQualityInput = z.infer<typeof ListingQualitySchema>;

// ============================================
// CRM FIELD MAPPINGS
// ============================================

/**
 * Mapeos de campos para cada CRM
 * Permite normalizar datos de diferentes fuentes
 */
export const CRM_FIELD_MAPPINGS: Record<CRMProvider, Record<string, string>> = {
  inmovilla: {
    // Inmovilla → InmoAI
    'referencia': 'externalId',
    'titulo': 'title',
    'precio': 'price',
    'tipo_operacion': 'operation',
    'tipo_inmueble': 'propertyType',
    'direccion': 'location.address',
    'localidad': 'location.city',
    'provincia': 'location.province',
    'cp': 'location.postalCode',
    'zona': 'location.neighborhood',
    'latitud': 'location.coordinates.lat',
    'longitud': 'location.coordinates.lng',
    'habitaciones': 'features.bedrooms',
    'banos': 'features.bathrooms',
    'superficie': 'features.surface',
    'planta': 'features.floor',
    'ascensor': 'features.hasElevator',
    'garaje': 'features.hasGarage',
    'piscina': 'features.hasPool',
    'terraza': 'features.hasTerrace',
    'aire_acondicionado': 'features.hasAirConditioning',
    'calefaccion': 'features.hasHeating',
    'certificado_energetico': 'features.energyCertificate',
    'ano_construccion': 'features.yearBuilt',
    'descripcion': 'description',
    'fotos': 'images',
  },

  witei: {
    // Witei → InmoAI
    'id': 'externalId',
    'name': 'title',
    'price': 'price',
    'operation_type': 'operation',
    'property_type': 'propertyType',
    'address': 'location.address',
    'city': 'location.city',
    'province': 'location.province',
    'postal_code': 'location.postalCode',
    'district': 'location.neighborhood',
    'latitude': 'location.coordinates.lat',
    'longitude': 'location.coordinates.lng',
    'rooms': 'features.bedrooms',
    'bathrooms': 'features.bathrooms',
    'area': 'features.surface',
    'floor_number': 'features.floor',
    'elevator': 'features.hasElevator',
    'parking': 'features.hasGarage',
    'swimming_pool': 'features.hasPool',
    'terrace': 'features.hasTerrace',
    'air_conditioning': 'features.hasAirConditioning',
    'heating': 'features.hasHeating',
    'energy_rating': 'features.energyCertificate',
    'year': 'features.yearBuilt',
    'description': 'description',
    'photos': 'images',
  },

  idealista_pro: {
    // Export oficial de Idealista Pro
    'reference': 'externalId',
    'title': 'title',
    'price': 'price',
    'operation': 'operation',
    'type': 'propertyType',
    'address': 'location.address',
    'municipality': 'location.city',
    'province': 'location.province',
    'postalCode': 'location.postalCode',
    'district': 'location.neighborhood',
    'latitude': 'location.coordinates.lat',
    'longitude': 'location.coordinates.lng',
    'bedrooms': 'features.bedrooms',
    'bathrooms': 'features.bathrooms',
    'size': 'features.surface',
    'floor': 'features.floor',
    'hasLift': 'features.hasElevator',
    'parkingSpace': 'features.hasGarage',
    'swimmingPool': 'features.hasPool',
    'terrace': 'features.hasTerrace',
    'airConditioning': 'features.hasAirConditioning',
    'heating': 'features.hasHeating',
    'energyCertificationType': 'features.energyCertificate',
    'constructedYear': 'features.yearBuilt',
    'description': 'description',
    'multimedia': 'images',
  },

  fotocasa_pro: {
    // Similar mapping for Fotocasa Pro export
    'ref': 'externalId',
    'titulo': 'title',
    'precio': 'price',
    'tipoOperacion': 'operation',
    'tipoInmueble': 'propertyType',
    'direccion': 'location.address',
    'poblacion': 'location.city',
    'provincia': 'location.province',
    'codigoPostal': 'location.postalCode',
    'barrio': 'location.neighborhood',
    'lat': 'location.coordinates.lat',
    'lon': 'location.coordinates.lng',
    'dormitorios': 'features.bedrooms',
    'aseos': 'features.bathrooms',
    'metrosCuadrados': 'features.surface',
    'planta': 'features.floor',
    'tieneAscensor': 'features.hasElevator',
    'tieneGaraje': 'features.hasGarage',
    'tienePiscina': 'features.hasPool',
    'tieneTerraza': 'features.hasTerrace',
    'tieneAireAcondicionado': 'features.hasAirConditioning',
    'tieneCalefaccion': 'features.hasHeating',
    'certificadoEnergetico': 'features.energyCertificate',
    'antiguedad': 'features.yearBuilt',
    'descripcion': 'description',
    'imagenes': 'images',
  },

  habitaclia_pro: {
    // Similar mapping for Habitaclia Pro export
    'codigo': 'externalId',
    'titulo': 'title',
    'precio': 'price',
    'operacion': 'operation',
    'tipo': 'propertyType',
    'direccion': 'location.address',
    'ciudad': 'location.city',
    'provincia': 'location.province',
    'cp': 'location.postalCode',
    'zona': 'location.neighborhood',
    'latitud': 'location.coordinates.lat',
    'longitud': 'location.coordinates.lng',
    'habitaciones': 'features.bedrooms',
    'banos': 'features.bathrooms',
    'metros': 'features.surface',
    'planta': 'features.floor',
    'ascensor': 'features.hasElevator',
    'parking': 'features.hasGarage',
    'piscina': 'features.hasPool',
    'terraza': 'features.hasTerrace',
    'aa': 'features.hasAirConditioning',
    'calefaccion': 'features.hasHeating',
    'cee': 'features.energyCertificate',
    'ano': 'features.yearBuilt',
    'descripcion': 'description',
    'fotos': 'images',
  },

  custom: {
    // For custom integrations, user defines mapping
  },
};

// ============================================
// QUALITY SCORING
// ============================================

export interface QualityScore {
  overall: number;        // 0-100
  completeness: number;   // % of fields filled
  imageQuality: number;   // Based on count and resolution
  descriptionQuality: number; // Based on length and keywords
  locationAccuracy: number;   // Has coordinates, valid postal code
  breakdown: {
    field: string;
    score: number;
    suggestion?: string;
  }[];
}

/**
 * Calcula score de calidad para un listing
 */
export function calculateQualityScore(listing: ListingQualityInput): QualityScore {
  const breakdown: QualityScore['breakdown'] = [];
  let totalScore = 0;
  let maxScore = 0;

  // Título (10 puntos)
  maxScore += 10;
  if (listing.title.length >= 30) {
    totalScore += 10;
    breakdown.push({ field: 'title', score: 10 });
  } else if (listing.title.length >= 20) {
    totalScore += 7;
    breakdown.push({ field: 'title', score: 7, suggestion: 'Título más descriptivo mejora visibilidad' });
  } else {
    totalScore += 4;
    breakdown.push({ field: 'title', score: 4, suggestion: 'Título demasiado corto' });
  }

  // Descripción (20 puntos)
  maxScore += 20;
  const descLen = listing.description?.length || 0;
  if (descLen >= 500) {
    totalScore += 20;
    breakdown.push({ field: 'description', score: 20 });
  } else if (descLen >= 200) {
    totalScore += 15;
    breakdown.push({ field: 'description', score: 15, suggestion: 'Descripción más detallada aumenta conversión' });
  } else if (descLen >= 50) {
    totalScore += 8;
    breakdown.push({ field: 'description', score: 8, suggestion: 'Descripción muy corta' });
  } else {
    totalScore += 0;
    breakdown.push({ field: 'description', score: 0, suggestion: 'Añade descripción del inmueble' });
  }

  // Imágenes (25 puntos)
  maxScore += 25;
  const imgCount = listing.images.length;
  if (imgCount >= 15) {
    totalScore += 25;
    breakdown.push({ field: 'images', score: 25 });
  } else if (imgCount >= 8) {
    totalScore += 20;
    breakdown.push({ field: 'images', score: 20, suggestion: 'Más fotos mejoran engagement' });
  } else if (imgCount >= 4) {
    totalScore += 12;
    breakdown.push({ field: 'images', score: 12, suggestion: 'Recomendamos al menos 8 fotos' });
  } else {
    totalScore += 5;
    breakdown.push({ field: 'images', score: 5, suggestion: 'Muy pocas fotos, añade más' });
  }

  // Ubicación (20 puntos)
  maxScore += 20;
  let locationScore = 0;
  if (listing.location.coordinates) locationScore += 10;
  if (listing.location.postalCode) locationScore += 4;
  if (listing.location.neighborhood) locationScore += 3;
  if (listing.location.address) locationScore += 3;
  totalScore += locationScore;
  breakdown.push({
    field: 'location',
    score: locationScore,
    suggestion: locationScore < 15 ? 'Añade coordenadas exactas para mejor visibilidad en mapa' : undefined,
  });

  // Características (15 puntos)
  maxScore += 15;
  let featuresScore = 0;
  if (listing.features) {
    if (listing.features.bedrooms !== undefined) featuresScore += 2;
    if (listing.features.bathrooms !== undefined) featuresScore += 2;
    if (listing.features.surface !== undefined) featuresScore += 3;
    if (listing.features.energyCertificate) featuresScore += 3;
    if (listing.features.yearBuilt) featuresScore += 2;
    if (listing.features.hasElevator !== undefined) featuresScore += 1;
    if (listing.features.hasGarage !== undefined) featuresScore += 1;
    if (listing.features.hasPool !== undefined) featuresScore += 1;
  }
  totalScore += Math.min(featuresScore, 15);
  breakdown.push({
    field: 'features',
    score: Math.min(featuresScore, 15),
    suggestion: featuresScore < 10 ? 'Completa más características del inmueble' : undefined,
  });

  // Contacto (10 puntos)
  maxScore += 10;
  let contactScore = 0;
  if (listing.contact) {
    if (listing.contact.phone) contactScore += 4;
    if (listing.contact.email) contactScore += 3;
    if (listing.contact.whatsapp) contactScore += 3;
  }
  totalScore += contactScore;
  breakdown.push({
    field: 'contact',
    score: contactScore,
    suggestion: contactScore < 7 ? 'Añade más formas de contacto' : undefined,
  });

  const overall = Math.round((totalScore / maxScore) * 100);

  return {
    overall,
    completeness: Math.round((breakdown.filter(b => b.score > 0).length / breakdown.length) * 100),
    imageQuality: Math.round((listing.images.length / 15) * 100),
    descriptionQuality: Math.round((descLen / 500) * 100),
    locationAccuracy: listing.location.coordinates ? 100 : (listing.location.postalCode ? 60 : 30),
    breakdown,
  };
}

// ============================================
// ONBOARDING PIPELINE
// ============================================

export const ONBOARDING_STAGES: Record<OnboardingStage, {
  name: string;
  description: string;
  requiredActions: string[];
  nextStage: OnboardingStage | null;
}> = {
  signup: {
    name: 'Registro',
    description: 'Crear cuenta en InmoAI',
    requiredActions: ['email_verified'],
    nextStage: 'profile_setup',
  },
  profile_setup: {
    name: 'Perfil',
    description: 'Completar información profesional',
    requiredActions: ['name_set', 'phone_verified', 'role_selected'],
    nextStage: 'first_listing',
  },
  first_listing: {
    name: 'Primer Inmueble',
    description: 'Publicar tu primera propiedad',
    requiredActions: ['listing_created', 'images_uploaded'],
    nextStage: 'verification',
  },
  verification: {
    name: 'Verificación',
    description: 'Verificar datos catastrales',
    requiredActions: ['cadastre_verified'],
    nextStage: 'social_connect',
  },
  social_connect: {
    name: 'Redes Sociales',
    description: 'Conectar al menos una red social',
    requiredActions: ['one_platform_connected'],
    nextStage: 'completed',
  },
  completed: {
    name: 'Completado',
    description: 'Onboarding finalizado',
    requiredActions: [],
    nextStage: null,
  },
};

/**
 * Calcula progreso del onboarding
 */
export function calculateOnboardingProgress(progress: OnboardingProgress): {
  percentage: number;
  currentStageName: string;
  remainingStages: OnboardingStage[];
} {
  const allStages: OnboardingStage[] = [
    'signup', 'profile_setup', 'first_listing', 'verification', 'social_connect', 'completed'
  ];

  const completedCount = progress.completedStages.length;
  const percentage = Math.round((completedCount / (allStages.length - 1)) * 100);

  const remainingStages = allStages.filter(
    stage => !progress.completedStages.includes(stage) && stage !== progress.currentStage
  );

  return {
    percentage,
    currentStageName: ONBOARDING_STAGES[progress.currentStage].name,
    remainingStages,
  };
}

// ============================================
// DATA TRANSFORMATION
// ============================================

/**
 * Transforma datos de CRM a formato InmoAI
 */
export function transformCRMData(
  data: Record<string, unknown>,
  provider: CRMProvider
): Partial<ListingQualityInput> {
  const mapping = CRM_FIELD_MAPPINGS[provider];
  const result: Record<string, unknown> = {};

  for (const [sourceField, targetPath] of Object.entries(mapping)) {
    const value = data[sourceField];
    if (value === undefined || value === null) continue;

    // Handle nested paths (e.g., 'location.city')
    const parts = targetPath.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result as Partial<ListingQualityInput>;
}

/**
 * Valida y normaliza datos importados
 */
export function validateAndNormalize(
  data: unknown,
  source: DataSourceType
): { success: true; data: ListingQualityInput } | { success: false; errors: string[] } {
  try {
    const withSource = { ...(data as object), source };
    const validated = ListingQualitySchema.parse(withSource);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { success: false, errors: ['Error de validación desconocido'] };
  }
}
