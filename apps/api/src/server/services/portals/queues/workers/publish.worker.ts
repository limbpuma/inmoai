/**
 * Publish Worker
 * Handles publishing listings to external portals
 */

import { Worker, Job } from 'bullmq';
import { db } from '../../../../infrastructure/database';
import { portalPosts, portalSyncJobs, listings, listingImages, portalConnections } from '../../../../infrastructure/database/schema';
import { eq, and } from 'drizzle-orm';
import { getAdapter } from '../../registry';
import { decryptTokens } from '../../crypto';
import { listingToPortalData, type PortalImageData } from '../../types';
import type { PublishJobData } from '../index';
import { QUEUE_NAMES } from '../index';
import { env } from '../../../../../config/env';

const REDIS_CONNECTION = {
  host: env.REDIS_HOST || 'localhost',
  port: env.REDIS_PORT ? parseInt(env.REDIS_PORT, 10) : 6379,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB ? parseInt(env.REDIS_DB, 10) : 0,
};

/**
 * Process a publish job
 */
async function processPublishJob(job: Job<PublishJobData>): Promise<void> {
  const { connectionId, listingId, portal, options } = job.data;

  console.log(`[Publish Worker] Processing job ${job.id} - ${portal}/${listingId}`);

  // Update job record to processing
  await db
    .update(portalSyncJobs)
    .set({
      status: 'processing',
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(portalSyncJobs.bullmqJobId, job.id || ''));

  try {
    // Get connection with decrypted tokens
    const connection = await db.query.portalConnections.findFirst({
      where: eq(portalConnections.id, connectionId),
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.status !== 'active') {
      throw new Error(`Connection is ${connection.status}`);
    }

    // Get listing with images
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
      with: {
        images: true,
      },
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Get adapter
    const adapter = await getAdapter(portal);

    // Decrypt tokens
    const tokens = decryptTokens({
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
    });

    // Prepare listing data
    const portalListingData = listingToPortalData(listing);

    // Add images
    portalListingData.images = (listing.images || []).map((img, idx): PortalImageData => ({
      url: img.url,
      caption: img.caption || undefined,
      isMain: img.isPrimary || idx === 0,
      order: img.position ?? idx,
    }));

    // Publish to portal
    const result = await adapter.publishListing(
      {
        connectionId: connection.id,
        userId: connection.userId,
        portal: connection.portal,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: connection.tokenExpiresAt || undefined,
        portalAccountId: connection.portalAccountId || undefined,
      },
      portalListingData,
      options
    );

    if (!result.success) {
      throw new Error(result.error || 'Publish failed');
    }

    // Update or create portal post record
    const existingPost = await db.query.portalPosts.findFirst({
      where: and(
        eq(portalPosts.listingId, listingId),
        eq(portalPosts.portal, portal)
      ),
    });

    const contentHash = adapter.generateContentHash(portalListingData);

    if (existingPost) {
      await db
        .update(portalPosts)
        .set({
          status: 'published',
          portalListingId: result.portalListingId,
          portalUrl: result.portalUrl,
          publishedAt: new Date(),
          expiresAt: result.expiresAt,
          lastSyncedPrice: listing.price?.toString(),
          lastSyncedAt: new Date(),
          contentHash,
          errorMessage: null,
          errorCode: null,
          retryCount: 0,
          lastStatusChange: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(portalPosts.id, existingPost.id));
    } else {
      await db.insert(portalPosts).values({
        connectionId,
        listingId,
        portal,
        status: 'published',
        portalListingId: result.portalListingId,
        portalUrl: result.portalUrl,
        publishedAt: new Date(),
        expiresAt: result.expiresAt,
        lastSyncedPrice: listing.price?.toString(),
        lastSyncedAt: new Date(),
        contentHash,
      });
    }

    // Update job record to completed
    await db
      .update(portalSyncJobs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        result: {
          portalListingId: result.portalListingId,
          portalUrl: result.portalUrl,
        },
        updatedAt: new Date(),
      })
      .where(eq(portalSyncJobs.bullmqJobId, job.id || ''));

    // Update connection lead count
    await db
      .update(portalConnections)
      .set({
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(portalConnections.id, connectionId));

    console.log(`[Publish Worker] Completed job ${job.id} - Published to ${result.portalUrl}`);

  } catch (error) {
    console.error(`[Publish Worker] Failed job ${job.id}:`, error);

    // Update portal post with error
    await db
      .update(portalPosts)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retryCount: job.attemptsMade,
        nextRetryAt: job.attemptsMade < 3 ? new Date(Date.now() + 5000 * Math.pow(2, job.attemptsMade)) : null,
        lastStatusChange: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(portalPosts.listingId, listingId),
          eq(portalPosts.portal, portal)
        )
      );

    // Update job record to failed
    await db
      .update(portalSyncJobs)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        attempts: job.attemptsMade,
        updatedAt: new Date(),
      })
      .where(eq(portalSyncJobs.bullmqJobId, job.id || ''));

    throw error;
  }
}

/**
 * Create and start the publish worker
 */
export function createPublishWorker(): Worker<PublishJobData> {
  const worker = new Worker<PublishJobData>(
    QUEUE_NAMES.PUBLISH,
    processPublishJob,
    {
      connection: REDIS_CONNECTION,
      concurrency: 5, // Process up to 5 jobs concurrently
      limiter: {
        max: 10,
        duration: 1000, // Max 10 jobs per second
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Publish Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Publish Worker] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('[Publish Worker] Worker error:', error);
  });

  return worker;
}
