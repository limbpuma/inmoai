/**
 * Instagram Adapter
 * Handles Instagram Graph API integration (via Facebook Business)
 * Requires Facebook Page connected to Instagram Professional account
 */

import { env } from '@/config/env';
import type { SocialConnection } from '@/server/infrastructure/database/schema';
import {
  BaseSocialAdapter,
  type OAuthTokens,
  type PostData,
  type PublishResult,
  type ScheduleResult,
  type PostAnalytics,
  type AccountAnalytics,
  type DateRange,
  type PlatformLimits,
} from './base.adapter';

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class InstagramAdapter extends BaseSocialAdapter {
  readonly platform = 'instagram' as const;

  readonly limits: PlatformLimits = {
    maxContentLength: 2200,
    maxHashtags: 30,
    maxImages: 10,
    maxVideoLengthSeconds: 90, // Reels max
    imageAspectRatio: '1:1', // Also supports 4:5, 1.91:1
    supportedMediaTypes: ['image', 'video', 'carousel'],
    supportsScheduling: true,
    supportsLinks: false, // Links only in bio
  };

  private get appId(): string {
    return env.FACEBOOK_APP_ID || '';
  }

  private get appSecret(): string {
    return env.FACEBOOK_APP_SECRET || '';
  }

  // ============================================
  // OAUTH METHODS
  // ============================================

  getAuthorizationUrl(redirectUri: string, state: string): string {
    // Instagram uses Facebook OAuth with instagram-specific scopes
    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ].join(',');

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      state,
      scope: scopes,
      response_type: 'code',
    });

    return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Instagram OAuth error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    // Exchange for long-lived token
    const longLivedParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: data.access_token,
    });

    const longLivedResponse = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${longLivedParams}`);
    const longLivedData = await longLivedResponse.json();

    return {
      accessToken: longLivedData.access_token,
      expiresAt: longLivedData.expires_in
        ? new Date(Date.now() + longLivedData.expires_in * 1000)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      tokenType: 'bearer',
    };
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: refreshToken,
    });

    const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params}`);
    const data = await response.json();

    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  async revokeAccess(accessToken: string): Promise<void> {
    await fetch(`${GRAPH_API_BASE}/me/permissions`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  // ============================================
  // POSTING METHODS
  // ============================================

  async publishPost(connection: SocialConnection, post: PostData): Promise<PublishResult> {
    // Instagram requires the Instagram Business Account ID
    const igUserId = connection.platformUserId;
    const accessToken = connection.pageAccessToken || connection.accessToken;

    if (!igUserId || !accessToken) {
      return this.errorResult('Instagram account not connected', 'NO_ACCOUNT');
    }

    if (!post.mediaUrls || post.mediaUrls.length === 0) {
      return this.errorResult('Instagram requires media (image or video)', 'NO_MEDIA');
    }

    try {
      const content = this.formatPostContent(post);

      let containerId: string;

      if (post.mediaUrls.length > 1) {
        // Carousel post
        containerId = await this.createCarouselContainer(igUserId, accessToken, post.mediaUrls, content);
      } else if (post.mediaType === 'video') {
        // Video/Reel post
        containerId = await this.createVideoContainer(igUserId, accessToken, post.mediaUrls[0], content);
      } else {
        // Single image post
        containerId = await this.createImageContainer(igUserId, accessToken, post.mediaUrls[0], content);
      }

      // Publish the container
      const publishResponse = await fetch(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creation_id: containerId }),
      });

      const publishData = await publishResponse.json();

      if (!publishResponse.ok) {
        return this.errorResult(
          publishData.error?.message || 'Failed to publish',
          publishData.error?.code?.toString()
        );
      }

      // Get the permalink
      const mediaResponse = await fetch(
        `${GRAPH_API_BASE}/${publishData.id}?fields=permalink`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const mediaData = await mediaResponse.json();

      return {
        success: true,
        platformPostId: publishData.id,
        postUrl: mediaData.permalink,
      };
    } catch (error) {
      return this.errorResult(
        error instanceof Error ? error.message : 'Unknown error',
        'PUBLISH_ERROR'
      );
    }
  }

  private async createImageContainer(
    igUserId: string,
    accessToken: string,
    imageUrl: string,
    caption: string
  ): Promise<string> {
    const response = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to create media container');
    }

    return data.id;
  }

  private async createVideoContainer(
    igUserId: string,
    accessToken: string,
    videoUrl: string,
    caption: string
  ): Promise<string> {
    const response = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        caption,
        media_type: 'REELS',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to create video container');
    }

    // Wait for video processing
    await this.waitForMediaProcessing(data.id, accessToken);

    return data.id;
  }

  private async createCarouselContainer(
    igUserId: string,
    accessToken: string,
    mediaUrls: string[],
    caption: string
  ): Promise<string> {
    // First, create individual media containers
    const childIds: string[] = [];

    for (const url of mediaUrls.slice(0, this.limits.maxImages)) {
      const isVideo = url.match(/\.(mp4|mov|avi)$/i);

      const response = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [isVideo ? 'video_url' : 'image_url']: url,
          is_carousel_item: true,
          ...(isVideo ? { media_type: 'VIDEO' } : {}),
        }),
      });

      const data = await response.json();
      if (data.id) {
        if (isVideo) {
          await this.waitForMediaProcessing(data.id, accessToken);
        }
        childIds.push(data.id);
      }
    }

    // Create carousel container
    const response = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        caption,
        children: childIds,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to create carousel container');
    }

    return data.id;
  }

  private async waitForMediaProcessing(
    containerId: string,
    accessToken: string,
    maxAttempts = 30
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `${GRAPH_API_BASE}/${containerId}?fields=status_code`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();

      if (data.status_code === 'FINISHED') {
        return;
      }

      if (data.status_code === 'ERROR') {
        throw new Error('Media processing failed');
      }

      // Wait 2 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('Media processing timeout');
  }

  async schedulePost(
    connection: SocialConnection,
    post: PostData,
    scheduledAt: Date
  ): Promise<ScheduleResult> {
    // Instagram Content Publishing API doesn't support native scheduling
    // We would need to store this and publish via a cron job
    return {
      success: false,
      error: 'Instagram scheduling requires InmoAI queue system. Post will be queued for scheduled time.',
    };
  }

  async deletePost(connection: SocialConnection, platformPostId: string): Promise<void> {
    // Instagram doesn't allow deleting posts via API
    // Can only archive or delete via the app
    throw new Error('Instagram posts can only be deleted via the Instagram app');
  }

  // ============================================
  // ANALYTICS METHODS
  // ============================================

  async getPostAnalytics(
    connection: SocialConnection,
    platformPostId: string
  ): Promise<PostAnalytics> {
    const accessToken = connection.pageAccessToken || connection.accessToken;

    const fields = 'like_count,comments_count,impressions,reach,saved,shares';

    const response = await fetch(
      `${GRAPH_API_BASE}/${platformPostId}/insights?metric=${fields}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      // Try basic metrics
      const basicResponse = await fetch(
        `${GRAPH_API_BASE}/${platformPostId}?fields=like_count,comments_count`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const basicData = await basicResponse.json();

      return {
        likes: basicData.like_count || 0,
        comments: basicData.comments_count || 0,
        updatedAt: new Date(),
      };
    }

    const data = await response.json();

    const metrics: Record<string, number> = {};
    for (const insight of data.data || []) {
      metrics[insight.name] = insight.values?.[0]?.value || 0;
    }

    return {
      impressions: metrics.impressions,
      reach: metrics.reach,
      likes: metrics.like_count,
      comments: metrics.comments_count,
      saves: metrics.saved,
      shares: metrics.shares,
      updatedAt: new Date(),
    };
  }

  async getAccountAnalytics(
    connection: SocialConnection,
    dateRange: DateRange
  ): Promise<AccountAnalytics> {
    const igUserId = connection.platformUserId;
    const accessToken = connection.pageAccessToken || connection.accessToken;

    if (!igUserId || !accessToken) {
      throw new Error('Instagram account not connected');
    }

    const since = Math.floor(dateRange.from.getTime() / 1000);
    const until = Math.floor(dateRange.to.getTime() / 1000);

    const response = await fetch(
      `${GRAPH_API_BASE}/${igUserId}/insights?metric=follower_count,impressions,reach&period=day&since=${since}&until=${until}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get account analytics');
    }

    const data = await response.json();

    const followerData = data.data?.find((d: { name: string }) => d.name === 'follower_count');
    const followers = followerData?.values?.slice(-1)[0]?.value || 0;
    const prevFollowers = followerData?.values?.[0]?.value || followers;

    return {
      followers,
      followersGrowth: followers - prevFollowers,
      periodStart: dateRange.from,
      periodEnd: dateRange.to,
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async validateConnection(connection: SocialConnection): Promise<boolean> {
    const token = connection.accessToken;
    if (!token) return false;

    if (this.isTokenExpired(connection)) return false;

    try {
      const response = await fetch(`${GRAPH_API_BASE}/me?access_token=${token}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAccountInfo(connection: SocialConnection): Promise<{
    id: string;
    username: string;
    displayName?: string;
    profileUrl?: string;
    avatarUrl?: string;
    followers?: number;
  }> {
    const igUserId = connection.platformUserId;
    const accessToken = connection.pageAccessToken || connection.accessToken;

    if (!igUserId || !accessToken) {
      throw new Error('Instagram account not connected');
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/${igUserId}?fields=id,username,name,profile_picture_url,followers_count`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get account info');
    }

    const data = await response.json();

    return {
      id: data.id,
      username: data.username,
      displayName: data.name,
      profileUrl: `https://instagram.com/${data.username}`,
      avatarUrl: data.profile_picture_url,
      followers: data.followers_count,
    };
  }

  /**
   * Get Instagram Business Account linked to a Facebook Page
   */
  async getInstagramAccount(
    pageId: string,
    pageAccessToken: string
  ): Promise<{ id: string; username: string } | null> {
    const response = await fetch(
      `${GRAPH_API_BASE}/${pageId}?fields=instagram_business_account{id,username}`,
      {
        headers: { Authorization: `Bearer ${pageAccessToken}` },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.instagram_business_account || null;
  }
}

// Export singleton instance
export const instagramAdapter = new InstagramAdapter();
