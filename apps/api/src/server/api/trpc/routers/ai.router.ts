/**
 * AI Router
 * tRPC endpoints for AI control and monitoring
 */

import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../trpc";
import {
  aiOrchestrator,
  fraudDetectionService,
  priceAnalysisService,
  scrapingSchedulerService,
} from "@/services/ai";
import { AIFunction, AIMode } from "@/services/ai/types";

const aiFunctionSchema = z.enum([
  "data_pipeline",
  "fraud_detection",
  "price_analysis",
  "moderation",
  "user_support",
  "seo_optimization",
]);

const aiModeSchema = z.enum(["lazy", "active", "autonomous"]);

export const aiRouter = createTRPCRouter({
  // Get AI system status
  getStatus: adminProcedure.query(() => {
    const orchestratorStatus = aiOrchestrator.getStatus();
    const scrapingStats = scrapingSchedulerService.getStatsSummary();

    return {
      orchestrator: orchestratorStatus,
      scraping: scrapingStats,
    };
  }),

  // Set AI operating mode
  setMode: adminProcedure
    .input(z.object({ mode: aiModeSchema }))
    .mutation(({ input }) => {
      aiOrchestrator.setMode(input.mode);
      return { success: true, mode: input.mode };
    }),

  // Trigger an AI function
  triggerFunction: adminProcedure
    .input(
      z.object({
        function: aiFunctionSchema,
        params: z.record(z.any()).optional(),
        skipApproval: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const taskId = await aiOrchestrator.submitTask(
        input.function as AIFunction,
        input.params,
        { skipApproval: input.skipApproval }
      );
      return { success: true, taskId };
    }),

  // Get pending tasks (for lazy mode approval)
  getPendingTasks: adminProcedure.query(() => {
    return aiOrchestrator.getPendingTasks();
  }),

  // Approve a pending task
  approveTask: adminProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input }) => {
      const result = await aiOrchestrator.approveTask(input.taskId);
      return { success: result !== null, result };
    }),

  // Reject a pending task
  rejectTask: adminProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(({ input }) => {
      const success = aiOrchestrator.rejectTask(input.taskId);
      return { success };
    }),

  // Cancel a running task
  cancelTask: adminProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(({ input }) => {
      const success = aiOrchestrator.cancelTask(input.taskId);
      return { success };
    }),

  // Pause AI system
  pause: adminProcedure.mutation(() => {
    aiOrchestrator.pause();
    return { success: true, status: "paused" };
  }),

  // Resume AI system
  resume: adminProcedure.mutation(() => {
    aiOrchestrator.resume();
    return { success: true, status: aiOrchestrator.getStatus().status };
  }),

  // Scraping endpoints
  scraping: createTRPCRouter({
    getSources: adminProcedure.query(() => {
      return scrapingSchedulerService.getSources();
    }),

    getSource: adminProcedure
      .input(z.object({ sourceId: z.string() }))
      .query(({ input }) => {
        return scrapingSchedulerService.getSource(input.sourceId);
      }),

    updateSource: adminProcedure
      .input(
        z.object({
          sourceId: z.string(),
          enabled: z.boolean().optional(),
          config: z
            .object({
              maxPages: z.number().optional(),
              delay: z.number().optional(),
            })
            .optional(),
        })
      )
      .mutation(({ input }) => {
        const { sourceId, ...updates } = input;
        // @ts-expect-error - Partial config is valid for updates
        const success = scrapingSchedulerService.updateSource(sourceId, updates);
        return { success };
      }),

    setSourceEnabled: adminProcedure
      .input(z.object({ sourceId: z.string(), enabled: z.boolean() }))
      .mutation(({ input }) => {
        const success = scrapingSchedulerService.setSourceEnabled(
          input.sourceId,
          input.enabled
        );
        return { success };
      }),

    runSource: adminProcedure
      .input(z.object({ sourceId: z.string() }))
      .mutation(async ({ input }) => {
        const result = await scrapingSchedulerService.runScraping(input.sourceId);
        return { success: true, result };
      }),

    runAll: adminProcedure.mutation(async () => {
      const results = await scrapingSchedulerService.runAllSources();
      return {
        success: true,
        results: Object.fromEntries(
          Array.from(results.entries()).map(([k, v]) => [
            k,
            v instanceof Error ? { error: v.message } : v,
          ])
        ),
      };
    }),

    getActiveJobs: adminProcedure.query(() => {
      return scrapingSchedulerService.getActiveJobs();
    }),

    getJobHistory: adminProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(({ input }) => {
        return scrapingSchedulerService.getJobHistory(input.limit);
      }),

    getStats: adminProcedure.query(() => {
      return scrapingSchedulerService.getStatsSummary();
    }),
  }),

  // Fraud detection endpoints
  fraudDetection: createTRPCRouter({
    analyzeListings: adminProcedure
      .input(
        z.object({
          listingIds: z.array(z.string()),
        })
      )
      .mutation(async ({ input }) => {
        // In real implementation, would fetch listings from DB
        // For now, return mock data
        return {
          success: true,
          analyzed: input.listingIds.length,
          suspicious: 0,
        };
      }),
  }),

  // Price analysis endpoints
  priceAnalysis: createTRPCRouter({
    getMarketStats: adminProcedure
      .input(
        z.object({
          city: z.string(),
          propertyType: z.string(),
        })
      )
      .query(async ({ input }) => {
        return priceAnalysisService.getMarketStats(input.city, input.propertyType);
      }),

    analyzeListings: adminProcedure
      .input(
        z.object({
          listingIds: z.array(z.string()),
        })
      )
      .mutation(async ({ input }) => {
        // In real implementation, would fetch and analyze listings
        return {
          success: true,
          analyzed: input.listingIds.length,
          anomalies: 0,
        };
      }),
  }),
});
