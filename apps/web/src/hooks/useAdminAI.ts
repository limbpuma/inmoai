/**
 * useAdminAI - Main hook for AI control system
 * Provides state and primary actions for the admin AI panel
 */

import { useCallback, useMemo } from 'react';
import { useAdminAIStore } from '@/stores/adminAIStore';
import type { AIFunction, AIMode, AIFunctionConfig } from '@/types/adminAI';

export function useAdminAI() {
  const config = useAdminAIStore((s) => s.config);
  const status = useAdminAIStore((s) => s.status);
  const currentActions = useAdminAIStore((s) => s.currentActions);
  const pendingDecisions = useAdminAIStore((s) => s.pendingDecisions);
  const alerts = useAdminAIStore((s) => s.alerts);

  const setMode = useAdminAIStore((s) => s.setMode);
  const setFunctionEnabled = useAdminAIStore((s) => s.setFunctionEnabled);
  const setFunctionMode = useAdminAIStore((s) => s.setFunctionMode);
  const triggerAction = useAdminAIStore((s) => s.triggerAction);
  const cancelAction = useAdminAIStore((s) => s.cancelAction);
  const approveDecision = useAdminAIStore((s) => s.approveDecision);
  const rejectDecision = useAdminAIStore((s) => s.rejectDecision);
  const acknowledgeAlert = useAdminAIStore((s) => s.acknowledgeAlert);
  const clearAlerts = useAdminAIStore((s) => s.clearAlerts);
  const pause = useAdminAIStore((s) => s.pause);
  const resume = useAdminAIStore((s) => s.resume);

  const isWorking = status === 'working';
  const isPaused = status === 'paused';
  const hasError = status === 'error';

  const enabledFunctions = useMemo(
    () =>
      Object.values(config.functions).filter(
        (f: AIFunctionConfig) => f.enabled
      ),
    [config.functions]
  );

  const unacknowledgedAlerts = useMemo(
    () => alerts.filter((a) => !a.acknowledged),
    [alerts]
  );

  const pendingCount = pendingDecisions.filter(
    (d) => d.status === 'pending'
  ).length;

  const toggleFunction = useCallback(
    (func: AIFunction) => {
      const current = config.functions[func];
      setFunctionEnabled(func, !current.enabled);
    },
    [config.functions, setFunctionEnabled]
  );

  const switchMode = useCallback(
    (mode: AIMode) => {
      setMode(mode);
      // Also update all functions to the new mode
      for (const func of Object.keys(config.functions) as AIFunction[]) {
        setFunctionMode(func, mode);
      }
    },
    [config.functions, setMode, setFunctionMode]
  );

  return {
    // State
    config,
    status,
    mode: config.mode,
    isWorking,
    isPaused,
    hasError,
    currentActions,
    enabledFunctions,
    pendingDecisions,
    pendingCount,
    alerts,
    unacknowledgedAlerts,

    // Actions
    setMode,
    switchMode,
    setFunctionEnabled,
    setFunctionMode,
    toggleFunction,
    triggerAction,
    cancelAction,
    approveDecision,
    rejectDecision,
    acknowledgeAlert,
    clearAlerts,
    pause,
    resume,
  };
}
