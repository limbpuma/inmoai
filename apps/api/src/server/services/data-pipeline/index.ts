/**
 * Data Pipeline Module
 *
 * Gestión de fuentes de datos LEGALES para InmoAI:
 * - Contenido generado por usuarios
 * - Importación desde CRMs
 * - Validación y normalización
 * - Pipeline de onboarding
 */

export {
  // Types
  type DataSourceType,
  type CRMProvider,
  type OnboardingStage,
  type DataSourceConfig,
  type OnboardingProgress,
  type ListingQualityInput,
  type QualityScore,

  // Schemas
  ListingQualitySchema,

  // CRM Mappings
  CRM_FIELD_MAPPINGS,

  // Onboarding
  ONBOARDING_STAGES,
  calculateOnboardingProgress,

  // Quality
  calculateQualityScore,

  // Transformation
  transformCRMData,
  validateAndNormalize,
} from './sources';
