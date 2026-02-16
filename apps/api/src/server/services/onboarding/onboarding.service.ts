/**
 * Onboarding Service
 *
 * Gestiona el flujo de onboarding para vendedores y agentes inmobiliarios.
 * Integra con el data-pipeline para tracking de progreso.
 */

import { db } from '@/server/infrastructure/database';
import { users } from '@/server/infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import {
  type OnboardingStage,
  type OnboardingProgress,
  ONBOARDING_STAGES,
  calculateOnboardingProgress,
} from '../data-pipeline';

// ============================================
// TYPES
// ============================================

export interface OnboardingState {
  userId: string;
  currentStage: OnboardingStage;
  completedStages: OnboardingStage[];
  stageData: Record<OnboardingStage, StageData>;
  startedAt: Date;
  completedAt?: Date;
}

export interface StageData {
  completedAt?: Date;
  data?: Record<string, unknown>;
  skipped?: boolean;
}

export interface StageRequirement {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  optional?: boolean;
}

export interface OnboardingStep {
  stage: OnboardingStage;
  name: string;
  description: string;
  icon: string;
  requirements: StageRequirement[];
  isCompleted: boolean;
  isCurrent: boolean;
  canSkip: boolean;
}

// ============================================
// SERVICE
// ============================================

export class OnboardingService {
  /**
   * Obtiene el estado actual del onboarding para un usuario
   */
  async getOnboardingState(userId: string): Promise<OnboardingState | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return null;

    // Parse onboarding data from user preferences (using preferences as storage)
    const onboardingData = (user.preferences as Record<string, unknown> | null)?.onboarding as OnboardingState | undefined;

    if (!onboardingData) {
      // Initialize onboarding for new user
      return this.initializeOnboarding(userId);
    }

    return onboardingData;
  }

  /**
   * Inicializa el onboarding para un nuevo usuario
   */
  async initializeOnboarding(userId: string): Promise<OnboardingState> {
    const initialState: OnboardingState = {
      userId,
      currentStage: 'signup',
      completedStages: [],
      stageData: {
        signup: {},
        profile_setup: {},
        first_listing: {},
        verification: {},
        social_connect: {},
        completed: {},
      },
      startedAt: new Date(),
    };

    await this.saveOnboardingState(userId, initialState);
    return initialState;
  }

  /**
   * Guarda el estado del onboarding
   */
  private async saveOnboardingState(userId: string, state: OnboardingState): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return;

    const currentPrefs = (user.preferences as Record<string, unknown>) || {};

    // Type assertion needed because we're extending the preferences schema
    const newPrefs = {
      ...currentPrefs,
      onboarding: state,
    } as typeof user.preferences;

    await db
      .update(users)
      .set({
        preferences: newPrefs,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Completa una etapa del onboarding
   */
  async completeStage(
    userId: string,
    stage: OnboardingStage,
    data?: Record<string, unknown>
  ): Promise<OnboardingState> {
    const state = await this.getOnboardingState(userId);
    if (!state) throw new Error('User not found');

    // Mark stage as completed
    if (!state.completedStages.includes(stage)) {
      state.completedStages.push(stage);
    }

    state.stageData[stage] = {
      completedAt: new Date(),
      data,
    };

    // Move to next stage
    const stageInfo = ONBOARDING_STAGES[stage];
    if (stageInfo.nextStage) {
      state.currentStage = stageInfo.nextStage;
    }

    // Check if onboarding is complete
    if (state.currentStage === 'completed') {
      state.completedAt = new Date();
    }

    await this.saveOnboardingState(userId, state);
    return state;
  }

  /**
   * Salta una etapa opcional
   */
  async skipStage(userId: string, stage: OnboardingStage): Promise<OnboardingState> {
    const state = await this.getOnboardingState(userId);
    if (!state) throw new Error('User not found');

    // Only certain stages can be skipped
    const skippableStages: OnboardingStage[] = ['social_connect'];
    if (!skippableStages.includes(stage)) {
      throw new Error('This stage cannot be skipped');
    }

    state.stageData[stage] = {
      skipped: true,
    };

    // Move to next stage
    const stageInfo = ONBOARDING_STAGES[stage];
    if (stageInfo.nextStage) {
      state.currentStage = stageInfo.nextStage;
    }

    if (state.currentStage === 'completed') {
      state.completedAt = new Date();
    }

    await this.saveOnboardingState(userId, state);
    return state;
  }

  /**
   * Obtiene los pasos del onboarding con estado actual
   */
  async getOnboardingSteps(userId: string): Promise<OnboardingStep[]> {
    const state = await this.getOnboardingState(userId);
    if (!state) return [];

    const steps: OnboardingStep[] = [];

    for (const [stage, config] of Object.entries(ONBOARDING_STAGES)) {
      const stageKey = stage as OnboardingStage;
      const isCompleted = state.completedStages.includes(stageKey);
      const isCurrent = state.currentStage === stageKey;

      steps.push({
        stage: stageKey,
        name: config.name,
        description: config.description,
        icon: this.getStageIcon(stageKey),
        requirements: await this.getStageRequirements(userId, stageKey),
        isCompleted,
        isCurrent,
        canSkip: stageKey === 'social_connect',
      });
    }

    return steps;
  }

  /**
   * Obtiene los requisitos de una etapa
   */
  private async getStageRequirements(
    userId: string,
    stage: OnboardingStage
  ): Promise<StageRequirement[]> {
    switch (stage) {
      case 'signup':
        return [
          {
            id: 'email_verified',
            label: 'Email verificado',
            description: 'Confirma tu dirección de email',
            completed: await this.isEmailVerified(userId),
          },
        ];

      case 'profile_setup':
        return [
          {
            id: 'name_set',
            label: 'Nombre completo',
            description: 'Añade tu nombre',
            completed: await this.hasName(userId),
          },
          {
            id: 'phone_verified',
            label: 'Teléfono verificado',
            description: 'Verifica tu número de teléfono',
            completed: await this.hasPhone(userId),
          },
          {
            id: 'role_selected',
            label: 'Tipo de usuario',
            description: 'Selecciona tu rol (particular, agente, agencia)',
            completed: await this.hasRole(userId),
          },
        ];

      case 'first_listing':
        return [
          {
            id: 'listing_created',
            label: 'Inmueble creado',
            description: 'Publica tu primera propiedad',
            completed: await this.hasListings(userId),
          },
          {
            id: 'images_uploaded',
            label: 'Fotos añadidas',
            description: 'Sube al menos 4 fotos',
            completed: await this.hasListingImages(userId),
          },
        ];

      case 'verification':
        return [
          {
            id: 'cadastre_verified',
            label: 'Verificación catastral',
            description: 'Verifica los datos con el Catastro',
            completed: await this.hasCadastreVerification(userId),
          },
        ];

      case 'social_connect':
        return [
          {
            id: 'one_platform_connected',
            label: 'Red social conectada',
            description: 'Conecta Facebook, Instagram, LinkedIn o TikTok',
            completed: await this.hasSocialConnection(userId),
            optional: true,
          },
        ];

      case 'completed':
        return [];

      default:
        return [];
    }
  }

  /**
   * Helpers para verificar requisitos
   */
  private async isEmailVerified(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return user?.emailVerified !== null;
  }

  private async hasName(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return !!user?.name && user.name.length > 2;
  }

  private async hasPhone(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    // Check phone in preferences
    const prefs = user?.preferences as Record<string, unknown> | undefined;
    return !!prefs?.phone;
  }

  private async hasRole(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return !!user?.role && user.role !== 'user';
  }

  private async hasListings(_userId: string): Promise<boolean> {
    // TODO: listings don't have userId field yet
    // For now, return false - this feature needs schema update
    return false;
  }

  private async hasListingImages(_userId: string): Promise<boolean> {
    // TODO: requires listings.userId and listingImages relation
    // For now, return false - this feature needs schema update
    return false;
  }

  private async hasCadastreVerification(_userId: string): Promise<boolean> {
    // TODO: requires listings.userId field
    // For now, return false - this feature needs schema update
    return false;
  }

  private async hasSocialConnection(userId: string): Promise<boolean> {
    const connections = await db.query.socialConnections.findMany({
      where: (sc, { eq, and }) =>
        and(eq(sc.userId, userId), eq(sc.status, 'active')),
      limit: 1,
    });
    return connections.length > 0;
  }

  /**
   * Iconos para cada etapa
   */
  private getStageIcon(stage: OnboardingStage): string {
    const icons: Record<OnboardingStage, string> = {
      signup: 'user-plus',
      profile_setup: 'user-cog',
      first_listing: 'home',
      verification: 'shield-check',
      social_connect: 'share-2',
      completed: 'check-circle',
    };
    return icons[stage];
  }

  /**
   * Calcula el progreso general
   */
  async getProgress(userId: string): Promise<{
    percentage: number;
    currentStageName: string;
    remainingStages: OnboardingStage[];
    isCompleted: boolean;
  }> {
    const state = await this.getOnboardingState(userId);
    if (!state) {
      return {
        percentage: 0,
        currentStageName: 'Registro',
        remainingStages: ['signup', 'profile_setup', 'first_listing', 'verification', 'social_connect'],
        isCompleted: false,
      };
    }

    const progress = calculateOnboardingProgress({
      userId,
      currentStage: state.currentStage,
      completedStages: state.completedStages,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      metadata: {
        listingsCreated: 0,
        socialPlatformsConnected: [],
        verificationCompleted: state.completedStages.includes('verification'),
      },
    });

    return {
      ...progress,
      isCompleted: state.currentStage === 'completed',
    };
  }
}

// Singleton instance
export const onboardingService = new OnboardingService();
