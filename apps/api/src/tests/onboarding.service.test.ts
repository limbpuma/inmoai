/**
 * Onboarding Service Unit Tests
 * Tests multi-step onboarding flow, stage completion, and progress tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../server/services/data-pipeline', () => ({
  ONBOARDING_STAGES: {
    signup: { name: 'Registro', description: 'Crea tu cuenta', nextStage: 'profile_setup' },
    profile_setup: { name: 'Perfil', description: 'Configura tu perfil', nextStage: 'first_listing' },
    first_listing: { name: 'Primer inmueble', description: 'Publica tu primera propiedad', nextStage: 'verification' },
    verification: { name: 'Verificación', description: 'Verifica tus datos', nextStage: 'social_connect' },
    social_connect: { name: 'Redes sociales', description: 'Conecta tus redes', nextStage: 'completed' },
    completed: { name: 'Completado', description: 'Onboarding completo', nextStage: null },
  },
  calculateOnboardingProgress: vi.fn().mockReturnValue({
    percentage: 50,
    currentStageName: 'Perfil',
    remainingStages: ['first_listing', 'verification', 'social_connect'],
  }),
}));

import { OnboardingService } from '../server/services/onboarding/onboarding.service';
import { db } from '@/server/infrastructure/database';

describe('OnboardingService', () => {
  let service: OnboardingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OnboardingService();
  });

  describe('getOnboardingState', () => {
    it('should return null for non-existent user', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);

      const result = await service.getOnboardingState('nonexistent');
      expect(result).toBeNull();
    });

    it('should initialize onboarding for user without state', async () => {
      // First call: user with no onboarding data
      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce({ preferences: null } as any)
        // Second call for initializeOnboarding -> saveOnboardingState
        .mockResolvedValueOnce({ preferences: {} } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.getOnboardingState('user-1');
      expect(result).not.toBeNull();
      expect(result!.currentStage).toBe('signup');
      expect(result!.completedStages).toEqual([]);
    });

    it('should return stored onboarding state', async () => {
      const storedState = {
        userId: 'user-1',
        currentStage: 'first_listing',
        completedStages: ['signup', 'profile_setup'],
        stageData: {
          signup: { completedAt: new Date() },
          profile_setup: { completedAt: new Date() },
          first_listing: {},
          verification: {},
          social_connect: {},
          completed: {},
        },
        startedAt: new Date(),
      };

      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        preferences: { onboarding: storedState },
      } as any);

      const result = await service.getOnboardingState('user-1');
      expect(result!.currentStage).toBe('first_listing');
      expect(result!.completedStages).toHaveLength(2);
    });
  });

  describe('initializeOnboarding', () => {
    it('should create initial state with signup as first stage', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ preferences: {} } as any);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.initializeOnboarding('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.currentStage).toBe('signup');
      expect(result.completedStages).toEqual([]);
      expect(result.startedAt).toBeInstanceOf(Date);
    });
  });

  describe('completeStage', () => {
    it('should advance to next stage', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        preferences: {
          onboarding: {
            userId: 'user-1',
            currentStage: 'signup',
            completedStages: [],
            stageData: { signup: {}, profile_setup: {}, first_listing: {}, verification: {}, social_connect: {}, completed: {} },
            startedAt: new Date(),
          },
        },
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.completeStage('user-1', 'signup');

      expect(result.completedStages).toContain('signup');
      expect(result.currentStage).toBe('profile_setup');
    });

    it('should not duplicate completed stages', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        preferences: {
          onboarding: {
            userId: 'user-1',
            currentStage: 'profile_setup',
            completedStages: ['signup'],
            stageData: { signup: {}, profile_setup: {}, first_listing: {}, verification: {}, social_connect: {}, completed: {} },
            startedAt: new Date(),
          },
        },
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.completeStage('user-1', 'signup');
      const signupCount = result.completedStages.filter(s => s === 'signup').length;
      expect(signupCount).toBe(1);
    });

    it('should throw for non-existent user', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);

      await expect(service.completeStage('nonexistent', 'signup')).rejects.toThrow('User not found');
    });
  });

  describe('skipStage', () => {
    it('should allow skipping social_connect', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        preferences: {
          onboarding: {
            userId: 'user-1',
            currentStage: 'social_connect',
            completedStages: ['signup', 'profile_setup', 'first_listing', 'verification'],
            stageData: { signup: {}, profile_setup: {}, first_listing: {}, verification: {}, social_connect: {}, completed: {} },
            startedAt: new Date(),
          },
        },
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.skipStage('user-1', 'social_connect');
      expect(result.stageData.social_connect.skipped).toBe(true);
      expect(result.currentStage).toBe('completed');
    });

    it('should reject skipping non-skippable stage', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        preferences: {
          onboarding: {
            userId: 'user-1',
            currentStage: 'profile_setup',
            completedStages: ['signup'],
            stageData: { signup: {}, profile_setup: {}, first_listing: {}, verification: {}, social_connect: {}, completed: {} },
            startedAt: new Date(),
          },
        },
      } as any);

      await expect(service.skipStage('user-1', 'profile_setup')).rejects.toThrow('cannot be skipped');
    });
  });

  describe('getProgress', () => {
    it('should return 0% for non-existent user', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);

      const progress = await service.getProgress('nonexistent');
      expect(progress.percentage).toBe(0);
      expect(progress.isCompleted).toBe(false);
    });

    it('should calculate progress from completed stages', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
        preferences: {
          onboarding: {
            userId: 'user-1',
            currentStage: 'first_listing',
            completedStages: ['signup', 'profile_setup'],
            stageData: { signup: {}, profile_setup: {}, first_listing: {}, verification: {}, social_connect: {}, completed: {} },
            startedAt: new Date(),
          },
        },
      } as any);

      const progress = await service.getProgress('user-1');
      expect(progress.percentage).toBe(50);
      expect(progress.isCompleted).toBe(false);
    });
  });
});
