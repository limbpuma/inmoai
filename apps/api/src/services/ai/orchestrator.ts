/**
 * AI Orchestrator Service
 * Central coordinator for all AI operations
 */

import { AIFunction, AIMode, AIStatus, AIAction, AIDecision } from "./types";

export interface OrchestratorConfig {
  mode: AIMode;
  maxConcurrentTasks: number;
  autoApproveThreshold: "low" | "medium" | "high";
  retryOnError: boolean;
  maxRetries: number;
}

export interface TaskResult {
  success: boolean;
  itemsProcessed: number;
  itemsAffected: number;
  duration: number;
  details?: string;
  error?: string;
}

type TaskHandler = (context: TaskContext) => Promise<TaskResult>;

interface TaskContext {
  taskId: string;
  function: AIFunction;
  params?: Record<string, any>;
  onProgress?: (progress: number, message: string) => void;
}

class AIOrchestrator {
  private config: OrchestratorConfig;
  private status: AIStatus = "idle";
  private activeTasks: Map<string, AIAction> = new Map();
  private taskHandlers: Map<AIFunction, TaskHandler> = new Map();
  private taskQueue: Array<{ id: string; function: AIFunction; params?: any }> = [];

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      mode: "lazy",
      maxConcurrentTasks: 3,
      autoApproveThreshold: "low",
      retryOnError: true,
      maxRetries: 3,
      ...config,
    };
  }

  /**
   * Register a task handler for a specific AI function
   */
  registerHandler(func: AIFunction, handler: TaskHandler): void {
    this.taskHandlers.set(func, handler);
  }

  /**
   * Get current orchestrator status
   */
  getStatus(): {
    status: AIStatus;
    activeTasks: number;
    queuedTasks: number;
    mode: AIMode;
  } {
    return {
      status: this.status,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      mode: this.config.mode,
    };
  }

  /**
   * Update orchestrator configuration
   */
  setConfig(config: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set operating mode
   */
  setMode(mode: AIMode): void {
    this.config.mode = mode;
  }

  /**
   * Submit a task for execution
   */
  async submitTask(
    func: AIFunction,
    params?: Record<string, any>,
    options?: {
      priority?: "high" | "normal" | "low";
      skipApproval?: boolean;
    }
  ): Promise<string> {
    const taskId = crypto.randomUUID();

    // In lazy mode, queue for approval unless skipped
    if (this.config.mode === "lazy" && !options?.skipApproval) {
      this.taskQueue.push({ id: taskId, function: func, params });
      return taskId;
    }

    // Check concurrent task limit
    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      this.taskQueue.push({ id: taskId, function: func, params });
      return taskId;
    }

    // Execute immediately
    this.executeTask(taskId, func, params);
    return taskId;
  }

  /**
   * Execute a task directly
   */
  private async executeTask(
    taskId: string,
    func: AIFunction,
    params?: Record<string, any>,
    retryCount = 0
  ): Promise<TaskResult> {
    const handler = this.taskHandlers.get(func);
    if (!handler) {
      throw new Error(`No handler registered for function: ${func}`);
    }

    const action: AIAction = {
      id: taskId,
      function: func,
      type: this.config.mode === "autonomous" ? "automatic" : "manual",
      status: "running",
      startedAt: new Date(),
    };

    this.activeTasks.set(taskId, action);
    this.status = "working";

    try {
      const context: TaskContext = {
        taskId,
        function: func,
        params,
        onProgress: (progress, message) => {
          // Could emit events here
          console.log(`[${taskId}] ${progress}% - ${message}`);
        },
      };

      const result = await handler(context);

      this.activeTasks.delete(taskId);
      if (this.activeTasks.size === 0) {
        this.status = "idle";
        this.processQueue();
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Retry logic
      if (this.config.retryOnError && retryCount < this.config.maxRetries) {
        console.log(`Retrying task ${taskId} (attempt ${retryCount + 2}/${this.config.maxRetries + 1})`);
        return this.executeTask(taskId, func, params, retryCount + 1);
      }

      this.activeTasks.delete(taskId);
      if (this.activeTasks.size === 0) {
        this.status = "idle";
        this.processQueue();
      }

      return {
        success: false,
        itemsProcessed: 0,
        itemsAffected: 0,
        duration: Date.now() - action.startedAt.getTime(),
        error: errorMessage,
      };
    }
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    while (
      this.taskQueue.length > 0 &&
      this.activeTasks.size < this.config.maxConcurrentTasks
    ) {
      const task = this.taskQueue.shift();
      if (task) {
        this.executeTask(task.id, task.function, task.params);
      }
    }
  }

  /**
   * Approve a pending task (for lazy mode)
   */
  async approveTask(taskId: string): Promise<TaskResult | null> {
    const taskIndex = this.taskQueue.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return null;

    const [task] = this.taskQueue.splice(taskIndex, 1);
    return this.executeTask(task.id, task.function, task.params);
  }

  /**
   * Reject a pending task
   */
  rejectTask(taskId: string): boolean {
    const taskIndex = this.taskQueue.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return false;

    this.taskQueue.splice(taskIndex, 1);
    return true;
  }

  /**
   * Cancel a running task
   */
  cancelTask(taskId: string): boolean {
    if (!this.activeTasks.has(taskId)) return false;
    this.activeTasks.delete(taskId);

    if (this.activeTasks.size === 0) {
      this.status = "idle";
    }

    return true;
  }

  /**
   * Get pending tasks (for lazy mode approval)
   */
  getPendingTasks(): Array<{ id: string; function: AIFunction; params?: any }> {
    return [...this.taskQueue];
  }

  /**
   * Pause orchestrator
   */
  pause(): void {
    this.status = "paused";
  }

  /**
   * Resume orchestrator
   */
  resume(): void {
    this.status = this.activeTasks.size > 0 ? "working" : "idle";
    this.processQueue();
  }
}

// Singleton instance
export const aiOrchestrator = new AIOrchestrator();

// Export class for testing
export { AIOrchestrator };
