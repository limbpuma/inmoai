"use client";

import { useMemo } from "react";
import { useAdminAIStore } from "@/stores/adminAIStore";
import { AIFunction } from "@/types/adminAI";

/**
 * Hook for accessing AI system metrics and analytics
 */
export function useAIMetrics() {
  const { metrics, config, actionHistory, events, alerts, pendingDecisions } =
    useAdminAIStore();

  // For time-based calculations, we need the current time.
  // This is intentionally computed during render to ensure metrics are current.
  // eslint-disable-next-line react-hooks/purity
  const referenceTimestamp = Date.now();

  // Calculate overall system health (0-100)
  const systemHealth = useMemo(() => {
    let score = 100;

    // Reduce score for errors
    const errorEvents = events.filter((e) => e.severity === "error").length;
    score -= Math.min(errorEvents * 5, 30);

    // Reduce score for failed actions
    const failedActions = actionHistory.filter((a) => a.status === "failed").length;
    const totalActions = actionHistory.length;
    if (totalActions > 0) {
      const failRate = (failedActions / totalActions) * 100;
      score -= Math.min(failRate, 30);
    }

    // Reduce score for unacknowledged alerts
    const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).length;
    score -= Math.min(unacknowledgedAlerts * 3, 20);

    // Reduce score for pending decisions (in lazy mode)
    const pendingCount = pendingDecisions.filter((d) => d.status === "pending").length;
    score -= Math.min(pendingCount * 2, 10);

    return Math.max(0, Math.round(score));
  }, [events, actionHistory, alerts, pendingDecisions]);

  // Get metrics per function
  const functionMetrics = useMemo(() => {
    const result = {} as Record<
      AIFunction,
      {
        totalActions: number;
        successRate: number;
        avgDuration: number;
        lastRun: Date | null;
        recentErrors: number;
      }
    >;

    Object.keys(config.functions).forEach((func) => {
      const funcId = func as AIFunction;
      const funcActions = actionHistory.filter((a) => a.function === funcId);
      const completedActions = funcActions.filter((a) => a.status === "completed");
      const recentActions = funcActions.filter(
        (a) =>
          new Date(a.startedAt).getTime() > referenceTimestamp - 24 * 60 * 60 * 1000
      );

      const totalDuration = completedActions.reduce(
        (sum, a) => sum + (a.result?.duration || 0),
        0
      );

      result[funcId] = {
        totalActions: funcActions.length,
        successRate:
          funcActions.length > 0
            ? Math.round((completedActions.length / funcActions.length) * 100)
            : 100,
        avgDuration:
          completedActions.length > 0
            ? Math.round(totalDuration / completedActions.length)
            : 0,
        lastRun:
          funcActions.length > 0 ? new Date(funcActions[0].startedAt) : null,
        recentErrors: recentActions.filter((a) => a.status === "failed").length,
      };
    });

    return result;
  }, [config.functions, actionHistory, referenceTimestamp]);

  // Time-based activity analysis
  const activityByHour = useMemo(() => {
    const hourCounts = new Array(24).fill(0);

    actionHistory.forEach((action) => {
      const hour = new Date(action.startedAt).getHours();
      hourCounts[hour]++;
    });

    return hourCounts;
  }, [actionHistory]);

  // Most active function
  const mostActiveFunction = useMemo(() => {
    let maxActions = 0;
    let mostActive: AIFunction | null = null;

    Object.entries(functionMetrics).forEach(([func, metrics]) => {
      if (metrics.totalActions > maxActions) {
        maxActions = metrics.totalActions;
        mostActive = func as AIFunction;
      }
    });

    return mostActive;
  }, [functionMetrics]);

  // Best performing function (by success rate with min 5 actions)
  const bestPerformingFunction = useMemo(() => {
    let bestRate = 0;
    let bestFunc: AIFunction | null = null;

    Object.entries(functionMetrics).forEach(([func, metrics]) => {
      if (metrics.totalActions >= 5 && metrics.successRate > bestRate) {
        bestRate = metrics.successRate;
        bestFunc = func as AIFunction;
      }
    });

    return bestFunc;
  }, [functionMetrics]);

  // Functions needing attention (low success rate or recent errors)
  const functionsNeedingAttention = useMemo(() => {
    return Object.entries(functionMetrics)
      .filter(
        ([_, metrics]) =>
          (metrics.totalActions >= 5 && metrics.successRate < 80) ||
          metrics.recentErrors > 2
      )
      .map(([func]) => func as AIFunction);
  }, [functionMetrics]);

  // Summary stats
  const summary = useMemo(
    () => ({
      systemHealth,
      totalActionsToday: metrics.actionsToday,
      totalActionsThisWeek: metrics.actionsThisWeek,
      overallSuccessRate: metrics.successRate,
      avgResponseTime: metrics.avgResponseTime,
      pendingDecisions: metrics.pendingDecisions,
      activeAlerts: metrics.activeAlerts,
      enabledFunctions: Object.values(config.functions).filter((f) => f.enabled)
        .length,
      totalFunctions: Object.keys(config.functions).length,
      mostActiveFunction,
      bestPerformingFunction,
      functionsNeedingAttention,
    }),
    [
      systemHealth,
      metrics,
      config.functions,
      mostActiveFunction,
      bestPerformingFunction,
      functionsNeedingAttention,
    ]
  );

  // Calculate trend (comparing last 7 days to previous 7 days)
  const actionTrend = useMemo(() => {
    const now = referenceTimestamp;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    const thisWeek = actionHistory.filter(
      (a) => new Date(a.startedAt).getTime() > weekAgo
    ).length;

    const lastWeek = actionHistory.filter(
      (a) =>
        new Date(a.startedAt).getTime() > twoWeeksAgo &&
        new Date(a.startedAt).getTime() <= weekAgo
    ).length;

    if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  }, [actionHistory, referenceTimestamp]);

  return {
    // Raw metrics
    metrics,
    functionMetrics,
    activityByHour,

    // Calculated metrics
    systemHealth,
    actionTrend,
    summary,

    // Insights
    mostActiveFunction,
    bestPerformingFunction,
    functionsNeedingAttention,
  };
}
