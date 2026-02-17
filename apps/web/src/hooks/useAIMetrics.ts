/**
 * useAIMetrics - Hook for monitoring AI system performance metrics
 * Provides computed metrics and historical performance data
 */

import { useMemo } from 'react';
import { useAdminAIStore } from '@/stores/adminAIStore';
import type { AIFunction, AIAction } from '@/types/adminAI';

interface FunctionMetrics {
  function: AIFunction;
  name: string;
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  lastRun: Date | null;
  isRunning: boolean;
}

export function useAIMetrics() {
  const metrics = useAdminAIStore((s) => s.metrics);
  const actionHistory = useAdminAIStore((s) => s.actionHistory);
  const currentActions = useAdminAIStore((s) => s.currentActions);
  const config = useAdminAIStore((s) => s.config);
  const events = useAdminAIStore((s) => s.events);

  // Compute success rate from action history
  const computedSuccessRate = useMemo(() => {
    const completed = actionHistory.filter(
      (a) => a.status === 'completed' || a.status === 'failed'
    );
    if (completed.length === 0) return 100;

    const successful = completed.filter((a) => a.status === 'completed');
    return Math.round((successful.length / completed.length) * 100);
  }, [actionHistory]);

  // Compute average response time
  const avgResponseTime = useMemo(() => {
    const withDuration = actionHistory.filter(
      (a) => a.result?.duration != null
    );
    if (withDuration.length === 0) return 0;

    const total = withDuration.reduce(
      (sum, a) => sum + (a.result?.duration ?? 0),
      0
    );
    return Math.round(total / withDuration.length);
  }, [actionHistory]);

  // Per-function metrics
  const functionMetrics = useMemo((): FunctionMetrics[] => {
    const functions = Object.entries(config.functions) as [
      AIFunction,
      (typeof config.functions)[AIFunction],
    ][];

    return functions.map(([func, funcConfig]) => {
      const funcActions = actionHistory.filter((a) => a.function === func);
      const completed = funcActions.filter(
        (a) => a.status === 'completed' || a.status === 'failed'
      );
      const successful = completed.filter((a) => a.status === 'completed');

      const durationsMs = completed
        .filter((a) => a.result?.duration != null)
        .map((a) => a.result!.duration);

      const avgDuration =
        durationsMs.length > 0
          ? Math.round(
              durationsMs.reduce((s, d) => s + d, 0) / durationsMs.length
            )
          : 0;

      const lastAction = funcActions[0] as AIAction | undefined;

      return {
        function: func,
        name: funcConfig.name,
        totalRuns: completed.length,
        successRate:
          completed.length > 0
            ? Math.round((successful.length / completed.length) * 100)
            : 100,
        avgDuration,
        lastRun: lastAction?.startedAt ?? null,
        isRunning: currentActions.some(
          (a) => a.function === func && a.status === 'running'
        ),
      };
    });
  }, [actionHistory, currentActions, config.functions]);

  // Today's actions count
  const actionsToday = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return actionHistory.filter(
      (a) => new Date(a.startedAt) >= todayStart
    ).length;
  }, [actionHistory]);

  // This week's actions count
  const actionsThisWeek = useMemo(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return actionHistory.filter(
      (a) => new Date(a.startedAt) >= weekStart
    ).length;
  }, [actionHistory]);

  // Error count today
  const errorsToday = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return events.filter(
      (e) =>
        e.severity === 'error' && new Date(e.timestamp) >= todayStart
    ).length;
  }, [events]);

  // Total items processed
  const totalItemsProcessed = useMemo(
    () =>
      actionHistory.reduce(
        (sum, a) => sum + (a.result?.itemsProcessed ?? 0),
        0
      ),
    [actionHistory]
  );

  return {
    // Store metrics
    metrics,

    // Computed metrics
    successRate: computedSuccessRate,
    avgResponseTime,
    actionsToday,
    actionsThisWeek,
    errorsToday,
    totalItemsProcessed,
    activeTaskCount: currentActions.length,

    // Per-function breakdown
    functionMetrics,

    // Derived state
    isHealthy: computedSuccessRate >= 80 && errorsToday < 5,
    performanceLabel:
      avgResponseTime < 2000
        ? 'rapido'
        : avgResponseTime < 5000
          ? 'normal'
          : 'lento',
  };
}
