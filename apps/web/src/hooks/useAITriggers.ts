"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAdminAIStore } from "@/stores/adminAIStore";
import { AIFunction, AIMode } from "@/types/adminAI";

type ScheduleConfig = {
  function: AIFunction;
  interval: number; // in milliseconds
  enabled?: boolean;
};

/**
 * Hook for managing AI action triggers
 * Handles scheduled execution, conditional triggers, and manual invocation
 */
export function useAITriggers() {
  const store = useAdminAIStore();
  const scheduledTimers = useRef<Map<AIFunction, NodeJS.Timeout>>(new Map());

  // Manual trigger
  const trigger = useCallback(
    async (func: AIFunction) => {
      const funcConfig = store.config.functions[func];

      if (!funcConfig.enabled) {
        store.addEvent({
          type: "alert",
          function: func,
          message: `No se puede ejecutar ${funcConfig.name} porque esta desactivada`,
          severity: "warning",
        });
        return false;
      }

      if (store.status === "paused") {
        store.addEvent({
          type: "alert",
          function: func,
          message: "El sistema IA esta pausado",
          severity: "warning",
        });
        return false;
      }

      await store.triggerAction(func);
      return true;
    },
    [store]
  );

  // Conditional trigger - only executes if condition is met
  const triggerIf = useCallback(
    async (func: AIFunction, condition: () => boolean) => {
      if (condition()) {
        return trigger(func);
      }
      return false;
    },
    [trigger]
  );

  // Batch trigger - execute multiple functions
  const triggerBatch = useCallback(
    async (functions: AIFunction[], sequential = true) => {
      const results: Record<AIFunction, boolean> = {} as Record<AIFunction, boolean>;

      if (sequential) {
        for (const func of functions) {
          results[func] = await trigger(func);
        }
      } else {
        const promises = functions.map(async (func) => {
          results[func] = await trigger(func);
        });
        await Promise.all(promises);
      }

      return results;
    },
    [trigger]
  );

  // Trigger all enabled functions
  const triggerAll = useCallback(
    async (sequential = true) => {
      const enabledFunctions = Object.entries(store.config.functions)
        .filter(([_, config]) => config.enabled)
        .map(([id]) => id as AIFunction);

      return triggerBatch(enabledFunctions, sequential);
    },
    [store.config.functions, triggerBatch]
  );

  // Trigger functions by mode
  const triggerByMode = useCallback(
    async (mode: AIMode, sequential = true) => {
      const functions = Object.entries(store.config.functions)
        .filter(([_, config]) => config.enabled && config.mode === mode)
        .map(([id]) => id as AIFunction);

      return triggerBatch(functions, sequential);
    },
    [store.config.functions, triggerBatch]
  );

  // Schedule a function to run periodically
  const schedule = useCallback(
    (config: ScheduleConfig) => {
      // Clear existing timer for this function
      const existingTimer = scheduledTimers.current.get(config.function);
      if (existingTimer) {
        clearInterval(existingTimer);
      }

      if (config.enabled === false) {
        scheduledTimers.current.delete(config.function);
        return;
      }

      const timer = setInterval(async () => {
        const funcConfig = store.config.functions[config.function];

        // Check if function is still enabled and system isn't paused
        if (funcConfig.enabled && store.status !== "paused") {
          // In lazy mode, add decision instead of executing
          if (funcConfig.mode === "lazy") {
            store.addDecision({
              function: config.function,
              action: `Ejecucion programada de ${funcConfig.name}`,
              description: `Tarea programada: ${funcConfig.description}`,
              impact: "low",
              expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            });
          } else {
            await store.triggerAction(config.function);
          }
        }
      }, config.interval);

      scheduledTimers.current.set(config.function, timer);

      store.addEvent({
        type: "alert",
        function: config.function,
        message: `Programado para ejecutar cada ${config.interval / 1000}s`,
        severity: "info",
      });
    },
    [store]
  );

  // Cancel scheduled function
  const unschedule = useCallback((func: AIFunction) => {
    const timer = scheduledTimers.current.get(func);
    if (timer) {
      clearInterval(timer);
      scheduledTimers.current.delete(func);
    }
  }, []);

  // Cancel all scheduled functions
  const unscheduleAll = useCallback(() => {
    scheduledTimers.current.forEach((timer) => {
      clearInterval(timer);
    });
    scheduledTimers.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unscheduleAll();
    };
  }, [unscheduleAll]);

  // Get list of scheduled functions
  const getScheduledFunctions = useCallback(() => {
    return Array.from(scheduledTimers.current.keys());
  }, []);

  return {
    trigger,
    triggerIf,
    triggerBatch,
    triggerAll,
    triggerByMode,
    schedule,
    unschedule,
    unscheduleAll,
    getScheduledFunctions,
  };
}

/**
 * Hook for setting up automatic triggers based on conditions
 */
export function useAutoTrigger(
  func: AIFunction,
  options: {
    condition: () => boolean;
    checkInterval?: number;
    enabled?: boolean;
  }
) {
  const { trigger } = useAITriggers();
  const { status, config } = useAdminAIStore();
  const lastTriggered = useRef<Date | null>(null);

  const checkInterval = options.checkInterval ?? 60000; // Default 1 minute
  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;

    const funcConfig = config.functions[func];

    // Only auto-trigger in active or autonomous mode
    if (funcConfig.mode === "lazy") return;

    const interval = setInterval(async () => {
      // Check if conditions are met
      if (
        funcConfig.enabled &&
        status !== "paused" &&
        options.condition()
      ) {
        // Prevent rapid re-triggering (minimum 5 second gap)
        const now = new Date();
        if (lastTriggered.current) {
          const gap = now.getTime() - lastTriggered.current.getTime();
          if (gap < 5000) return;
        }

        lastTriggered.current = now;
        await trigger(func);
      }
    }, checkInterval);

    return () => clearInterval(interval);
  }, [func, enabled, checkInterval, status, config.functions, options, trigger]);

  return {
    lastTriggered: lastTriggered.current,
  };
}
