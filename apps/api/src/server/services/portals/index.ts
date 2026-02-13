/**
 * Portal Services - Public API
 *
 * Autoposting system for publishing listings to external real estate portals
 */

// Types
export * from './types';

// Adapter registry
export { getAdapter, getAllPortalInfo, getPortalInfo, getPortalsByCapability, isPortalAvailable, getAvailablePortals } from './registry';

// Crypto utilities
export { encrypt, decrypt, encryptTokens, decryptTokens, generateOAuthState, hashOAuthState } from './crypto';

// Queue system
export {
  initializeQueues,
  closeQueues,
  schedulePublish,
  scheduleUpdate,
  scheduleDelete,
  scheduleSync,
  scheduleTokenRefresh,
  scheduleRecurringSync,
  cancelRecurringSync,
  getQueueStats,
  getJob,
  QUEUE_NAMES,
  type PublishJobData,
  type UpdateJobData,
  type DeleteJobData,
  type SyncJobData,
  type TokenRefreshJobData,
} from './queues';

// Base adapter for extending
export { BasePortalAdapter } from './base.adapter';
