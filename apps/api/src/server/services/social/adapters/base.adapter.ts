/**
 * Base Social Platform Adapter
 * Defines the interface all social platform adapters must implement
 */

import type { SocialConnection, SocialPost, Listing } from '@/server/infrastructure/database/schema';

// ============================================
// TYPES
// ============================================

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'twitter';

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string[];
}

export interface PostData {
  content: string;
  hashtags?: string[];
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'carousel';
  link?: string;
  listing?: Partial<Listing>;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  postUrl?: string;
  error?: string;
  errorCode?: string;
}

export interface ScheduleResult {
  success: boolean;
  scheduledId?: string;
  scheduledAt?: Date;
  error?: string;
}

export interface PostAnalytics {
  impressions?: number;
  reach?: number;
  engagement?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  saves?: number;
  videoViews?: number;
  updatedAt: Date;
}

export interface AccountAnalytics {
  followers?: number;
  followersGrowth?: number;
  totalPosts?: number;
  avgEngagementRate?: number;
  topPosts?: Array<{
    postId: string;
    engagement: number;
  }>;
  periodStart: Date;
  periodEnd: Date;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface PlatformLimits {
  maxContentLength: number;
  maxHashtags: number;
  maxImages: number;
  maxVideoLengthSeconds?: number;
  imageAspectRatio?: string;
  supportedMediaTypes: ('image' | 'video' | 'carousel')[];
  supportsScheduling: boolean;
  supportsLinks: boolean;
}

// ============================================
// BASE ADAPTER INTERFACE
// ============================================

export interface SocialPlatformAdapter {
  readonly platform: SocialPlatform;
  readonly limits: PlatformLimits;

  // ============================================
  // OAUTH METHODS
  // ============================================

  /**
   * Get the OAuth authorization URL for connecting the platform
   */
  getAuthorizationUrl(redirectUri: string, state: string): string;

  /**
   * Exchange authorization code for access tokens
   */
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens>;

  /**
   * Refresh expired access tokens
   */
  refreshTokens(refreshToken: string): Promise<OAuthTokens>;

  /**
   * Revoke access (disconnect)
   */
  revokeAccess(accessToken: string): Promise<void>;

  // ============================================
  // POSTING METHODS
  // ============================================

  /**
   * Publish a post immediately
   */
  publishPost(connection: SocialConnection, post: PostData): Promise<PublishResult>;

  /**
   * Schedule a post for later
   */
  schedulePost(
    connection: SocialConnection,
    post: PostData,
    scheduledAt: Date
  ): Promise<ScheduleResult>;

  /**
   * Delete a published post
   */
  deletePost(connection: SocialConnection, platformPostId: string): Promise<void>;

  /**
   * Update a published post (if supported)
   */
  updatePost?(
    connection: SocialConnection,
    platformPostId: string,
    post: Partial<PostData>
  ): Promise<PublishResult>;

  // ============================================
  // ANALYTICS METHODS
  // ============================================

  /**
   * Get analytics for a specific post
   */
  getPostAnalytics(connection: SocialConnection, platformPostId: string): Promise<PostAnalytics>;

  /**
   * Get account-level analytics
   */
  getAccountAnalytics(connection: SocialConnection, dateRange: DateRange): Promise<AccountAnalytics>;

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Validate connection is still active
   */
  validateConnection(connection: SocialConnection): Promise<boolean>;

  /**
   * Get user/page info from the platform
   */
  getAccountInfo(connection: SocialConnection): Promise<{
    id: string;
    username: string;
    displayName?: string;
    profileUrl?: string;
    avatarUrl?: string;
    followers?: number;
  }>;
}

// ============================================
// ABSTRACT BASE ADAPTER
// ============================================

export abstract class BaseSocialAdapter implements SocialPlatformAdapter {
  abstract readonly platform: SocialPlatform;
  abstract readonly limits: PlatformLimits;

  // OAuth methods
  abstract getAuthorizationUrl(redirectUri: string, state: string): string;
  abstract exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens>;
  abstract refreshTokens(refreshToken: string): Promise<OAuthTokens>;
  abstract revokeAccess(accessToken: string): Promise<void>;

  // Posting methods
  abstract publishPost(connection: SocialConnection, post: PostData): Promise<PublishResult>;
  abstract schedulePost(
    connection: SocialConnection,
    post: PostData,
    scheduledAt: Date
  ): Promise<ScheduleResult>;
  abstract deletePost(connection: SocialConnection, platformPostId: string): Promise<void>;

  // Analytics methods
  abstract getPostAnalytics(
    connection: SocialConnection,
    platformPostId: string
  ): Promise<PostAnalytics>;
  abstract getAccountAnalytics(
    connection: SocialConnection,
    dateRange: DateRange
  ): Promise<AccountAnalytics>;

  // Utility methods
  abstract validateConnection(connection: SocialConnection): Promise<boolean>;
  abstract getAccountInfo(connection: SocialConnection): Promise<{
    id: string;
    username: string;
    displayName?: string;
    profileUrl?: string;
    avatarUrl?: string;
    followers?: number;
  }>;

  /**
   * Helper: Check if connection token is expired
   */
  protected isTokenExpired(connection: SocialConnection): boolean {
    if (!connection.tokenExpiresAt) return false;
    const expiresAt = new Date(connection.tokenExpiresAt);
    const now = new Date();
    // Consider expired if less than 5 minutes remaining
    return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;
  }

  /**
   * Helper: Build a standard error result
   */
  protected errorResult(message: string, code?: string): PublishResult {
    return {
      success: false,
      error: message,
      errorCode: code,
    };
  }

  /**
   * Helper: Truncate content to platform limits
   */
  protected truncateContent(content: string, maxLength?: number): string {
    const limit = maxLength ?? this.limits.maxContentLength;
    if (content.length <= limit) return content;
    return content.substring(0, limit - 3) + '...';
  }

  /**
   * Helper: Limit hashtags to platform max
   */
  protected limitHashtags(hashtags: string[]): string[] {
    return hashtags.slice(0, this.limits.maxHashtags);
  }

  /**
   * Helper: Format post content with hashtags
   */
  protected formatPostContent(post: PostData): string {
    let content = post.content;

    // Add hashtags if present
    if (post.hashtags && post.hashtags.length > 0) {
      const tags = this.limitHashtags(post.hashtags)
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
        .join(' ');
      content = `${content}\n\n${tags}`;
    }

    return this.truncateContent(content);
  }
}
