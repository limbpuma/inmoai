/**
 * useAITriggers - Hook for triggering AI actions
 * Provides methods to dispatch AI functions with status tracking
 */

import { useCallback, useState } from 'react';
import { useAdminAIStore } from '@/stores/adminAIStore';
import type { AIFunction } from '@/types/adminAI';

interface TriggerState {
  isTriggering: boolean;
  lastTriggered: AIFunction | null;
  error: string | null;
}

export function useAITriggers() {
  const triggerAction = useAdminAIStore((s) => s.triggerAction);
  const cancelAction = useAdminAIStore((s) => s.cancelAction);
  const config = useAdminAIStore((s) => s.config);
  const currentActions = useAdminAIStore((s) => s.currentActions);
  const status = useAdminAIStore((s) => s.status);

  const [triggerState, setTriggerState] = useState<TriggerState>({
    isTriggering: false,
    lastTriggered: null,
    error: null,
  });

  const trigger = useCallback(
    async (func: AIFunction) => {
      const funcConfig = config.functions[func];

      if (!funcConfig.enabled) {
        setTriggerState({
          isTriggering: false,
          lastTriggered: func,
          error: `${funcConfig.name} esta desactivada`,
        });
        return;
      }

      if (status === 'paused') {
        setTriggerState({
          isTriggering: false,
          lastTriggered: func,
          error: 'El sistema IA esta pausado',
        });
        return;
      }

      setTriggerState({
        isTriggering: true,
        lastTriggered: func,
        error: null,
      });

      try {
        await triggerAction(func);
        setTriggerState({
          isTriggering: false,
          lastTriggered: func,
          error: null,
        });
      } catch (err) {
        setTriggerState({
          isTriggering: false,
          lastTriggered: func,
          error: err instanceof Error ? err.message : 'Error desconocido',
        });
      }
    },
    [config.functions, status, triggerAction]
  );

  const triggerAll = useCallback(async () => {
    const enabledFunctions = (
      Object.entries(config.functions) as [AIFunction, (typeof config.functions)[AIFunction]][]
    )
      .filter(([, cfg]) => cfg.enabled)
      .map(([key]) => key);

    setTriggerState({
      isTriggering: true,
      lastTriggered: null,
      error: null,
    });

    for (const func of enabledFunctions) {
      await trigger(func);
    }

    setTriggerState((prev) => ({
      ...prev,
      isTriggering: false,
    }));
  }, [config.functions, trigger]);

  const cancelAll = useCallback(() => {
    for (const action of currentActions) {
      cancelAction(action.id);
    }
  }, [currentActions, cancelAction]);

  const isFunctionRunning = useCallback(
    (func: AIFunction) =>
      currentActions.some(
        (a) => a.function === func && a.status === 'running'
      ),
    [currentActions]
  );

  return {
    // State
    isTriggering: triggerState.isTriggering,
    lastTriggered: triggerState.lastTriggered,
    error: triggerState.error,
    runningActions: currentActions,

    // Actions
    trigger,
    triggerAll,
    cancelAction,
    cancelAll,
    isFunctionRunning,
  };
}
