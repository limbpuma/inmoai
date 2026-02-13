/**
 * BullMQ Queue System for Portal Operations
 *
 * Queues:
 * - portal:publish - Publishing listings to portals
 * - portal:update - Updating existing listings
 * - portal:delete - Removing listings from portals
 * - portal:sync - Syncing leads and analytics
 * - portal:token-refresh - Refreshing OAuth tokens
 */

import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { env } from '../../../../config/env';
import type { Portal, PortalSyncJobType } from '../../../infrastructure/database/schema';

// ============================================
// QUEUE CONFIGURATION
// ============================================

const REDIS_CONNECTION = {
  host: env.REDIS_HOST || 'localhost',
  port: env.REDIS_PORT ? parseInt(env.REDIS_PORT, 10) : 6379,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB ? parseInt(env.REDIS_DB, 10) : 0,
};

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000, // 5s -> 10s -> 20s
  },
  removeOnComplete: {
    count: 100, // Keep last 100 completed jobs
  },
  removeOnFail: {
    count: 500, // Keep last 500 failed jobs for debugging
  },
};

// Queue names
export const QUEUE_NAMES = {
  PUBLISH: 'portal:publish',
  UPDATE: 'portal:update',
  DELETE: 'portal:delete',
  SYNC: 'portal:sync',
  TOKEN_REFRESH: 'portal:token-refresh',
} as const;

// ============================================
// JOB TYPES
// ============================================

export interface PublishJobData {
  connectionId: string;
  listingId: string;
  portal: Portal;
  options?: {
    featured?: boolean;
    highlighted?: boolean;
    urgent?: boolean;
  };
}

export interface UpdateJobData {
  connectionId: string;
  postId: string;
  portal: Portal;
  portalListingId: string;
  changes?: {
    price?: number;
    title?: string;
    description?: string;
  };
}

export interface DeleteJobData {
  connectionId: string;
  postId: string;
  portal: Portal;
  portalListingId: string;
}

export interface SyncJobData {
  connectionId: string;
  portal: Portal;
  syncType: 'leads' | 'analytics' | 'all';
  since?: string; // ISO date string
  portalListingId?: string;
}

export interface TokenRefreshJobData {
  connectionId: string;
  portal: Portal;
  refreshToken: string;
}

export type PortalJobData =
  | PublishJobData
  | UpdateJobData
  | DeleteJobData
  | SyncJobData
  | TokenRefreshJobData;

// ============================================
// QUEUE INSTANCES
// ============================================

let publishQueue: Queue<PublishJobData> | null = null;
let updateQueue: Queue<UpdateJobData> | null = null;
let deleteQueue: Queue<DeleteJobData> | null = null;
let syncQueue: Queue<SyncJobData> | null = null;
let tokenRefreshQueue: Queue<TokenRefreshJobData> | null = null;

/**
 * Initialize all queues
 * Call this at application startup
 */
export function initializeQueues() {
  if (!isRedisConfigured()) {
    console.warn('[Portal Queues] Redis not configured, queues disabled');
    return;
  }

  publishQueue = new Queue<PublishJobData>(QUEUE_NAMES.PUBLISH, {
    connection: REDIS_CONNECTION,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      priority: 1, // High priority
    },
  });

  updateQueue = new Queue<UpdateJobData>(QUEUE_NAMES.UPDATE, {
    connection: REDIS_CONNECTION,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      priority: 2,
    },
  });

  deleteQueue = new Queue<DeleteJobData>(QUEUE_NAMES.DELETE, {
    connection: REDIS_CONNECTION,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      priority: 3,
    },
  });

  syncQueue = new Queue<SyncJobData>(QUEUE_NAMES.SYNC, {
    connection: REDIS_CONNECTION,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      priority: 5, // Lower priority
    },
  });

  tokenRefreshQueue = new Queue<TokenRefreshJobData>(QUEUE_NAMES.TOKEN_REFRESH, {
    connection: REDIS_CONNECTION,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      priority: 0, // Highest priority - tokens must be valid
    },
  });

  console.log('[Portal Queues] Initialized');
}

/**
 * Close all queue connections
 * Call this at application shutdown
 */
export async function closeQueues() {
  await Promise.all([
    publishQueue?.close(),
    updateQueue?.close(),
    deleteQueue?.close(),
    syncQueue?.close(),
    tokenRefreshQueue?.close(),
  ]);

  publishQueue = null;
  updateQueue = null;
  deleteQueue = null;
  syncQueue = null;
  tokenRefreshQueue = null;

  console.log('[Portal Queues] Closed');
}

// ============================================
// JOB SCHEDULING
// ============================================

/**
 * Add a publish job to the queue
 */
export async function schedulePublish(data: PublishJobData): Promise<string | null> {
  if (!publishQueue) {
    console.warn('[Portal Queues] Publish queue not initialized');
    return null;
  }

  const job = await publishQueue.add(`publish-${data.portal}-${data.listingId}`, data, {
    jobId: `publish-${data.listingId}-${data.portal}-${Date.now()}`,
  });

  return job.id || null;
}

/**
 * Add an update job to the queue
 */
export async function scheduleUpdate(data: UpdateJobData): Promise<string | null> {
  if (!updateQueue) {
    console.warn('[Portal Queues] Update queue not initialized');
    return null;
  }

  const job = await updateQueue.add(`update-${data.portal}-${data.postId}`, data, {
    jobId: `update-${data.postId}-${Date.now()}`,
  });

  return job.id || null;
}

/**
 * Add a delete job to the queue
 */
export async function scheduleDelete(data: DeleteJobData): Promise<string | null> {
  if (!deleteQueue) {
    console.warn('[Portal Queues] Delete queue not initialized');
    return null;
  }

  const job = await deleteQueue.add(`delete-${data.portal}-${data.postId}`, data, {
    jobId: `delete-${data.postId}-${Date.now()}`,
  });

  return job.id || null;
}

/**
 * Add a sync job to the queue
 */
export async function scheduleSync(data: SyncJobData): Promise<string | null> {
  if (!syncQueue) {
    console.warn('[Portal Queues] Sync queue not initialized');
    return null;
  }

  const job = await syncQueue.add(`sync-${data.portal}-${data.connectionId}`, data, {
    jobId: `sync-${data.connectionId}-${data.syncType}-${Date.now()}`,
  });

  return job.id || null;
}

/**
 * Add a token refresh job to the queue
 */
export async function scheduleTokenRefresh(data: TokenRefreshJobData): Promise<string | null> {
  if (!tokenRefreshQueue) {
    console.warn('[Portal Queues] Token refresh queue not initialized');
    return null;
  }

  const job = await tokenRefreshQueue.add(`refresh-${data.portal}-${data.connectionId}`, data, {
    jobId: `refresh-${data.connectionId}-${Date.now()}`,
  });

  return job.id || null;
}

/**
 * Schedule recurring sync jobs for a connection
 */
export async function scheduleRecurringSync(
  connectionId: string,
  portal: Portal,
  intervalHours: number = 6
): Promise<void> {
  if (!syncQueue) {
    console.warn('[Portal Queues] Sync queue not initialized');
    return;
  }

  // Add a repeatable job
  await syncQueue.add(
    `recurring-sync-${portal}-${connectionId}`,
    {
      connectionId,
      portal,
      syncType: 'all',
    },
    {
      jobId: `recurring-${connectionId}`,
      repeat: {
        every: intervalHours * 60 * 60 * 1000, // Convert hours to ms
      },
    }
  );
}

/**
 * Cancel recurring sync jobs for a connection
 */
export async function cancelRecurringSync(connectionId: string): Promise<void> {
  if (!syncQueue) return;

  const repeatableJobs = await syncQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.id === `recurring-${connectionId}`) {
      await syncQueue.removeRepeatableByKey(job.key);
    }
  }
}

// ============================================
// QUEUE STATUS
// ============================================

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const stats: Record<string, { waiting: number; active: number; completed: number; failed: number }> = {};

  const queues = [
    { name: 'publish', queue: publishQueue },
    { name: 'update', queue: updateQueue },
    { name: 'delete', queue: deleteQueue },
    { name: 'sync', queue: syncQueue },
    { name: 'tokenRefresh', queue: tokenRefreshQueue },
  ];

  for (const { name, queue } of queues) {
    if (queue) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);

      stats[name] = { waiting, active, completed, failed };
    }
  }

  return stats;
}

/**
 * Get job by ID from any queue
 */
export async function getJob(jobId: string): Promise<Job | null> {
  const queues = [publishQueue, updateQueue, deleteQueue, syncQueue, tokenRefreshQueue];

  for (const queue of queues) {
    if (queue) {
      const job = await queue.getJob(jobId);
      if (job) return job;
    }
  }

  return null;
}

// ============================================
// HELPERS
// ============================================

function isRedisConfigured(): boolean {
  return !!(env.REDIS_HOST || env.REDIS_URL);
}

/**
 * Map job type to queue
 */
export function getQueueForJobType(jobType: PortalSyncJobType): Queue | null {
  switch (jobType) {
    case 'publish':
      return publishQueue;
    case 'update':
      return updateQueue;
    case 'delete':
      return deleteQueue;
    case 'sync_leads':
    case 'sync_analytics':
      return syncQueue;
    case 'refresh_token':
      return tokenRefreshQueue;
    default:
      return null;
  }
}
