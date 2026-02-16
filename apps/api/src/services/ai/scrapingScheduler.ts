/**
 * Scraping Scheduler Service
 * Manages automated scraping of real estate portals
 */

import { ScrapingResult } from "./types";
import { aiOrchestrator } from "./orchestrator";

interface ScrapingSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  schedule: string; // cron expression
  lastRun?: Date;
  nextRun?: Date;
  config: {
    maxPages: number;
    delay: number; // ms between requests
    userAgent?: string;
    proxy?: string;
  };
  stats: {
    totalRuns: number;
    successfulRuns: number;
    totalListingsFound: number;
    avgDuration: number;
  };
}

interface ScrapingJob {
  id: string;
  sourceId: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: Date;
  completedAt?: Date;
  result?: ScrapingResult;
  error?: string;
}

class ScrapingSchedulerService {
  private sources: Map<string, ScrapingSource> = new Map();
  private activeJobs: Map<string, ScrapingJob> = new Map();
  private jobHistory: ScrapingJob[] = [];
  private scheduledTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Initialize default sources
    this.initializeDefaultSources();
  }

  /**
   * Initialize default scraping sources
   */
  private initializeDefaultSources(): void {
    const defaultSources: ScrapingSource[] = [
      {
        id: "idealista",
        name: "Idealista",
        url: "https://www.idealista.com",
        enabled: true,
        schedule: "0 */6 * * *", // Every 6 hours
        config: {
          maxPages: 50,
          delay: 2000,
        },
        stats: {
          totalRuns: 0,
          successfulRuns: 0,
          totalListingsFound: 0,
          avgDuration: 0,
        },
      },
      {
        id: "fotocasa",
        name: "Fotocasa",
        url: "https://www.fotocasa.es",
        enabled: true,
        schedule: "0 */8 * * *", // Every 8 hours
        config: {
          maxPages: 40,
          delay: 2500,
        },
        stats: {
          totalRuns: 0,
          successfulRuns: 0,
          totalListingsFound: 0,
          avgDuration: 0,
        },
      },
      {
        id: "pisos",
        name: "Pisos.com",
        url: "https://www.pisos.com",
        enabled: false,
        schedule: "0 */12 * * *", // Every 12 hours
        config: {
          maxPages: 30,
          delay: 3000,
        },
        stats: {
          totalRuns: 0,
          successfulRuns: 0,
          totalListingsFound: 0,
          avgDuration: 0,
        },
      },
    ];

    defaultSources.forEach((source) => {
      this.sources.set(source.id, source);
    });
  }

  /**
   * Get all sources
   */
  getSources(): ScrapingSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get source by ID
   */
  getSource(sourceId: string): ScrapingSource | undefined {
    return this.sources.get(sourceId);
  }

  /**
   * Update source configuration
   */
  updateSource(sourceId: string, updates: Partial<ScrapingSource>): boolean {
    const source = this.sources.get(sourceId);
    if (!source) return false;

    this.sources.set(sourceId, { ...source, ...updates });
    return true;
  }

  /**
   * Enable/disable a source
   */
  setSourceEnabled(sourceId: string, enabled: boolean): boolean {
    const source = this.sources.get(sourceId);
    if (!source) return false;

    source.enabled = enabled;
    this.sources.set(sourceId, source);

    if (!enabled) {
      this.stopScheduledJob(sourceId);
    }

    return true;
  }

  /**
   * Run scraping job for a source
   */
  async runScraping(sourceId: string): Promise<ScrapingResult> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    if (!source.enabled) {
      throw new Error(`Source is disabled: ${source.name}`);
    }

    const jobId = crypto.randomUUID();
    const job: ScrapingJob = {
      id: jobId,
      sourceId,
      status: "running",
      startedAt: new Date(),
    };

    this.activeJobs.set(jobId, job);

    try {
      // Simulate scraping (in real implementation, would use actual scraper)
      const result = await this.simulateScraping(source);

      // Update job
      job.status = "completed";
      job.completedAt = new Date();
      job.result = result;

      // Update source stats
      source.lastRun = new Date();
      source.stats.totalRuns++;
      source.stats.successfulRuns++;
      source.stats.totalListingsFound += result.newListings;
      source.stats.avgDuration =
        (source.stats.avgDuration * (source.stats.totalRuns - 1) + result.duration) /
        source.stats.totalRuns;

      this.sources.set(sourceId, source);
      this.jobHistory.unshift(job);
      this.activeJobs.delete(jobId);

      // Keep only last 100 jobs
      if (this.jobHistory.length > 100) {
        this.jobHistory = this.jobHistory.slice(0, 100);
      }

      return result;
    } catch (error) {
      job.status = "failed";
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : "Unknown error";

      source.stats.totalRuns++;
      this.sources.set(sourceId, source);
      this.jobHistory.unshift(job);
      this.activeJobs.delete(jobId);

      throw error;
    }
  }

  /**
   * Simulate scraping (for demo purposes)
   */
  private async simulateScraping(source: ScrapingSource): Promise<ScrapingResult> {
    const startTime = Date.now();

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Simulate results
    const totalFound = Math.floor(Math.random() * 200) + 50;
    const newListings = Math.floor(totalFound * 0.3); // ~30% new
    const updatedListings = Math.floor(totalFound * 0.5); // ~50% updated
    const failedListings = Math.floor(Math.random() * 5);

    return {
      source: source.name,
      totalFound,
      newListings,
      updatedListings,
      failedListings,
      duration: Date.now() - startTime,
      errors: failedListings > 0 ? [`${failedListings} listings failed to parse`] : [],
    };
  }

  /**
   * Run all enabled sources
   */
  async runAllSources(): Promise<Map<string, ScrapingResult | Error>> {
    const results = new Map<string, ScrapingResult | Error>();
    const enabledSources = Array.from(this.sources.values()).filter((s) => s.enabled);

    for (const source of enabledSources) {
      try {
        const result = await this.runScraping(source.id);
        results.set(source.id, result);
      } catch (error) {
        results.set(source.id, error as Error);
      }
    }

    return results;
  }

  /**
   * Schedule a source to run periodically
   */
  scheduleSource(sourceId: string, intervalMs: number): void {
    // Clear existing timer
    this.stopScheduledJob(sourceId);

    const source = this.sources.get(sourceId);
    if (!source || !source.enabled) return;

    const timer = setInterval(async () => {
      const currentSource = this.sources.get(sourceId);
      if (currentSource?.enabled) {
        try {
          await this.runScraping(sourceId);
        } catch (error) {
          console.error(`Scheduled scraping failed for ${sourceId}:`, error);
        }
      }
    }, intervalMs);

    this.scheduledTimers.set(sourceId, timer);
  }

  /**
   * Stop scheduled job
   */
  stopScheduledJob(sourceId: string): void {
    const timer = this.scheduledTimers.get(sourceId);
    if (timer) {
      clearInterval(timer);
      this.scheduledTimers.delete(sourceId);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllScheduledJobs(): void {
    this.scheduledTimers.forEach((timer) => clearInterval(timer));
    this.scheduledTimers.clear();
  }

  /**
   * Get active jobs
   */
  getActiveJobs(): ScrapingJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get job history
   */
  getJobHistory(limit = 50): ScrapingJob[] {
    return this.jobHistory.slice(0, limit);
  }

  /**
   * Get statistics summary
   */
  getStatsSummary(): {
    totalSources: number;
    enabledSources: number;
    totalListingsScraped: number;
    avgSuccessRate: number;
    lastRunTime?: Date;
  } {
    const sources = Array.from(this.sources.values());
    const enabledSources = sources.filter((s) => s.enabled);

    const totalListingsScraped = sources.reduce(
      (sum, s) => sum + s.stats.totalListingsFound,
      0
    );

    const avgSuccessRate =
      sources.reduce((sum, s) => {
        if (s.stats.totalRuns === 0) return sum;
        return sum + (s.stats.successfulRuns / s.stats.totalRuns) * 100;
      }, 0) / sources.filter((s) => s.stats.totalRuns > 0).length || 100;

    const lastRunTimes = sources
      .filter((s) => s.lastRun)
      .map((s) => s.lastRun as Date)
      .sort((a, b) => b.getTime() - a.getTime());

    return {
      totalSources: sources.length,
      enabledSources: enabledSources.length,
      totalListingsScraped,
      avgSuccessRate: Math.round(avgSuccessRate),
      lastRunTime: lastRunTimes[0],
    };
  }
}

// Create singleton instance
export const scrapingSchedulerService = new ScrapingSchedulerService();

// Register with orchestrator
aiOrchestrator.registerHandler("data_pipeline", async (context) => {
  const startTime = Date.now();
  const { params } = context;

  const sourceId = params?.sourceId;

  try {
    let results: Map<string, ScrapingResult | Error>;

    if (sourceId) {
      const result = await scrapingSchedulerService.runScraping(sourceId);
      results = new Map([[sourceId, result]]);
    } else {
      results = await scrapingSchedulerService.runAllSources();
    }

    let totalNew = 0;
    let totalUpdated = 0;
    let errors = 0;

    results.forEach((result) => {
      if (result instanceof Error) {
        errors++;
      } else {
        totalNew += result.newListings;
        totalUpdated += result.updatedListings;
      }
    });

    return {
      success: errors === 0,
      itemsProcessed: results.size,
      itemsAffected: totalNew + totalUpdated,
      duration: Date.now() - startTime,
      details: `Scraping completado: ${totalNew} nuevos, ${totalUpdated} actualizados${
        errors > 0 ? `, ${errors} errores` : ""
      }`,
      data: Object.fromEntries(results),
    };
  } catch (error) {
    return {
      success: false,
      itemsProcessed: 0,
      itemsAffected: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
});

export { ScrapingSchedulerService };
