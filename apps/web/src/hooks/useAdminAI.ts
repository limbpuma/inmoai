"use client";

import { useCallback, useMemo } from "react";
import { useAdminAIStore } from "@/stores/adminAIStore";
import { AIFunction, AIMode, AIStatus } from "@/types/adminAI";

/**
 * Hook for accessing and controlling the Admin AI system
 * Provides a clean interface for components to interact with the AI store
 */
export function useAdminAI() {
  const store = useAdminAIStore();

  // Derived state
  const isActive = store.status === "working" || store.currentActions.length > 0;
  const isPaused = store.status === "paused";
  const hasErrors = store.status === "error";
  const hasUnacknowledgedAlerts = store.alerts.some((a) => !a.acknowledged);
  const hasPendingDecisions = store.pendingDecisions.some((d) => d.status === "pending");

  // Get enabled functions
  const enabledFunctions = useMemo(() => {
    return Object.entries(store.config.functions)
      .filter(([_, config]) => config.enabled)
      .map(([id]) => id as AIFunction);
  }, [store.config.functions]);

  // Get functions by mode
  const getFunctionsByMode = useCallback(
    (mode: AIMode) => {
      return Object.entries(store.config.functions)
        .filter(([_, config]) => config.mode === mode && config.enabled)
        .map(([id]) => id as AIFunction);
    },
    [store.config.functions]
  );

  // Check if a specific function is running
  const isFunctionRunning = useCallback(
    (func: AIFunction) => {
      return store.currentActions.some((a) => a.function === func);
    },
    [store.currentActions]
  );

  // Execute multiple functions in sequence
  const executeAll = useCallback(
    async (functions?: AIFunction[]) => {
      const funcsToExecute = functions || enabledFunctions;
      for (const func of funcsToExecute) {
        await store.triggerAction(func);
      }
    },
    [enabledFunctions, store]
  );

  // Execute function with confirmation for high impact
  const executeWithConfirmation = useCallback(
    async (func: AIFunction, skipConfirmation = false) => {
      const funcConfig = store.config.functions[func];

      if (!skipConfirmation && store.config.mode === "lazy") {
        // In lazy mode, add as pending decision instead of executing
        store.addDecision({
          function: func,
          action: `Ejecutar ${funcConfig.name}`,
          description: `Ejecucion manual de ${funcConfig.description}`,
          impact: "medium",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        return;
      }

      await store.triggerAction(func);
    },
    [store]
  );

  // Batch update function modes
  const setAllFunctionsMode = useCallback(
    (mode: AIMode) => {
      Object.keys(store.config.functions).forEach((func) => {
        store.setFunctionMode(func as AIFunction, mode);
      });
    },
    [store]
  );

  // Batch enable/disable functions
  const setAllFunctionsEnabled = useCallback(
    (enabled: boolean) => {
      Object.keys(store.config.functions).forEach((func) => {
        store.setFunctionEnabled(func as AIFunction, enabled);
      });
    },
    [store]
  );

  // Get summary statistics
  const summary = useMemo(
    () => ({
      mode: store.config.mode,
      status: store.status,
      activeActions: store.currentActions.length,
      pendingDecisions: store.pendingDecisions.filter((d) => d.status === "pending").length,
      unacknowledgedAlerts: store.alerts.filter((a) => !a.acknowledged).length,
      totalActionsToday: store.metrics.actionsToday,
      successRate: store.metrics.successRate,
      enabledFunctions: enabledFunctions.length,
      totalFunctions: Object.keys(store.config.functions).length,
    }),
    [
      store.config.mode,
      store.status,
      store.currentActions,
      store.pendingDecisions,
      store.alerts,
      store.metrics,
      enabledFunctions,
      store.config.functions,
    ]
  );

  return {
    // State
    config: store.config,
    status: store.status,
    currentActions: store.currentActions,
    actionHistory: store.actionHistory,
    events: store.events,
    pendingDecisions: store.pendingDecisions,
    alerts: store.alerts,
    metrics: store.metrics,

    // Derived state
    isActive,
    isPaused,
    hasErrors,
    hasUnacknowledgedAlerts,
    hasPendingDecisions,
    enabledFunctions,
    summary,

    // Actions
    setMode: store.setMode,
    setFunctionEnabled: store.setFunctionEnabled,
    setFunctionMode: store.setFunctionMode,
    triggerAction: store.triggerAction,
    cancelAction: store.cancelAction,
    approveDecision: store.approveDecision,
    rejectDecision: store.rejectDecision,
    acknowledgeAlert: store.acknowledgeAlert,
    clearAlerts: store.clearAlerts,
    pause: store.pause,
    resume: store.resume,

    // Helper functions
    getFunctionsByMode,
    isFunctionRunning,
    executeAll,
    executeWithConfirmation,
    setAllFunctionsMode,
    setAllFunctionsEnabled,
  };
}
