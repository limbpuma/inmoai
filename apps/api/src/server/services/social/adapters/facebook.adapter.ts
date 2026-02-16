/**
 * Facebook Adapter
 * Handles Facebook Graph API integration for posting to Pages
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

export class FacebookAdapter extends BaseSocialAdapter {
  readonly platform = 'facebook' as const;

  readonly limits: PlatformLimits = {
    maxContentLength: 63206,
    maxHashtags: 30,
    maxImages: 10,
    maxVideoLengthSeconds: 240 * 60, // 4 hours
    imageAspectRatio: '1.91:1',
    supportedMediaTypes: ['image', 'video', 'carousel'],
    supportsScheduling: true,
    supportsLinks: true,
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
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_read_user_content',
      'public_profile',
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
      throw new Error(`Facebook OAuth error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    // Exchange for long-lived token
    const longLivedToken = await this.exchangeForLongLivedToken(data.access_token);

    return {
      accessToken: longLivedToken.accessToken,
      expiresAt: longLivedToken.expiresAt,
      tokenType: 'bearer',
      scope: data.scope?.split(','),
    };
  }

  private async exchangeForLongLivedToken(shortLivedToken: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params}`);

    if (!response.ok) {
      throw new Error('Failed to exchange for long-lived token');
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days default
    };
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    // Facebook long-lived tokens don't use refresh tokens
    // They need to be re-exchanged before expiry
    return this.exchangeForLongLivedToken(refreshToken);
  }

  async revokeAccess(accessToken: string): Promise<void> {
    const response = await fetch(`${GRAPH_API_BASE}/me/permissions`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to revoke Facebook access');
    }
  }

  // ============================================
  // POSTING METHODS
  // ============================================

  async publishPost(connection: SocialConnection, post: PostData): Promise<PublishResult> {
    const pageId = connection.pageId;
    const pageToken = connection.pageAccessToken || connection.accessToken;

    if (!pageId || !pageToken) {
      return this.errorResult('No page connected', 'NO_PAGE');
    }

    try {
      const content = this.formatPostContent(post);

      // Determine endpoint based on media type
      let endpoint: string;
      let body: Record<string, unknown>;

      if (post.mediaUrls && post.mediaUrls.length > 0) {
        if (post.mediaType === 'video') {
          // Video post
          endpoint = `${GRAPH_API_BASE}/${pageId}/videos`;
          body = {
            file_url: post.mediaUrls[0],
            description: content,
          };
        } else if (post.mediaUrls.length > 1) {
          // Multi-image post (carousel)
          const photoIds = await this.uploadMultiplePhotos(pageId, pageToken, post.mediaUrls);
          endpoint = `${GRAPH_API_BASE}/${pageId}/feed`;
          body = {
            message: content,
            attached_media: photoIds.map((id) => ({ media_fbid: id })),
          };
        } else {
          // Single image post
          endpoint = `${GRAPH_API_BASE}/${pageId}/photos`;
          body = {
            url: post.mediaUrls[0],
            message: content,
          };
        }
      } else {
        // Text-only post
        endpoint = `${GRAPH_API_BASE}/${pageId}/feed`;
        body = {
          message: content,
          link: post.link,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pageToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        return this.errorResult(
          data.error?.message || 'Failed to publish post',
          data.error?.code?.toString()
        );
      }

      const postId = data.id || data.post_id;

      return {
        success: true,
        platformPostId: postId,
        postUrl: `https://www.facebook.com/${postId}`,
      };
    } catch (error) {
      return this.errorResult(
        error instanceof Error ? error.message : 'Unknown error',
        'PUBLISH_ERROR'
      );
    }
  }

  private async uploadMultiplePhotos(
    pageId: string,
    pageToken: string,
    urls: string[]
  ): Promise<string[]> {
    const photoIds: string[] = [];

    for (const url of urls) {
      const response = await fetch(`${GRAPH_API_BASE}/${pageId}/photos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pageToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          published: false, // Upload but don't publish yet
        }),
      });

      const data = await response.json();
      if (data.id) {
        photoIds.push(data.id);
      }
    }

    return photoIds;
  }

  async schedulePost(
    connection: SocialConnection,
    post: PostData,
    scheduledAt: Date
  ): Promise<ScheduleResult> {
    const pageId = connection.pageId;
    const pageToken = connection.pageAccessToken || connection.accessToken;

    if (!pageId || !pageToken) {
      return { success: false, error: 'No page connected' };
    }

    // Facebook requires scheduled time to be between 10 minutes and 75 days from now
    const minTime = Date.now() + 10 * 60 * 1000;
    const maxTime = Date.now() + 75 * 24 * 60 * 60 * 1000;

    if (scheduledAt.getTime() < minTime || scheduledAt.getTime() > maxTime) {
      return {
        success: false,
        error: 'Scheduled time must be between 10 minutes and 75 days from now',
      };
    }

    try {
      const content = this.formatPostContent(post);
      const publishTime = Math.floor(scheduledAt.getTime() / 1000);

      const body: Record<string, unknown> = {
        message: content,
        published: false,
        scheduled_publish_time: publishTime,
      };

      if (post.link) {
        body.link = post.link;
      }

      const response = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pageToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error?.message || 'Failed to schedule post' };
      }

      return {
        success: true,
        scheduledId: data.id,
        scheduledAt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deletePost(connection: SocialConnection, platformPostId: string): Promise<void> {
    const pageToken = connection.pageAccessToken || connection.accessToken;

    const response = await fetch(`${GRAPH_API_BASE}/${platformPostId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${pageToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || 'Failed to delete post');
    }
  }

  // ============================================
  // ANALYTICS METHODS
  // ============================================

  async getPostAnalytics(
    connection: SocialConnection,
    platformPostId: string
  ): Promise<PostAnalytics> {
    const pageToken = connection.pageAccessToken || connection.accessToken;

    const fields = 'impressions,reach,engaged_users,reactions.summary(true),comments.summary(true),shares';

    const response = await fetch(
      `${GRAPH_API_BASE}/${platformPostId}/insights?metric=${fields}`,
      {
        headers: {
          Authorization: `Bearer ${pageToken}`,
        },
      }
    );

    if (!response.ok) {
      // Try getting basic metrics if insights fail
      const basicResponse = await fetch(
        `${GRAPH_API_BASE}/${platformPostId}?fields=reactions.summary(true),comments.summary(true),shares`,
        {
          headers: {
            Authorization: `Bearer ${pageToken}`,
          },
        }
      );

      if (!basicResponse.ok) {
        throw new Error('Failed to get post analytics');
      }

      const basicData = await basicResponse.json();

      return {
        likes: basicData.reactions?.summary?.total_count || 0,
        comments: basicData.comments?.summary?.total_count || 0,
        shares: basicData.shares?.count || 0,
        updatedAt: new Date(),
      };
    }

    const data = await response.json();

    const metrics: Record<string, number> = {};
    for (const insight of data.data || []) {
      metrics[insight.name] = insight.values?.[0]?.value || 0;
    }

    return {
      impressions: metrics.post_impressions || metrics.impressions,
      reach: metrics.post_reach || metrics.reach,
      engagement: metrics.post_engaged_users || metrics.engaged_users,
      likes: metrics.reactions,
      comments: metrics.comments,
      shares: metrics.shares,
      updatedAt: new Date(),
    };
  }

  async getAccountAnalytics(
    connection: SocialConnection,
    dateRange: DateRange
  ): Promise<AccountAnalytics> {
    const pageId = connection.pageId;
    const pageToken = connection.pageAccessToken || connection.accessToken;

    if (!pageId || !pageToken) {
      throw new Error('No page connected');
    }

    const since = Math.floor(dateRange.from.getTime() / 1000);
    const until = Math.floor(dateRange.to.getTime() / 1000);

    const response = await fetch(
      `${GRAPH_API_BASE}/${pageId}/insights?metric=page_fans,page_engaged_users,page_impressions&since=${since}&until=${until}`,
      {
        headers: {
          Authorization: `Bearer ${pageToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get account analytics');
    }

    const data = await response.json();

    const metrics: Record<string, number[]> = {};
    for (const insight of data.data || []) {
      metrics[insight.name] = insight.values?.map((v: { value: number }) => v.value) || [];
    }

    const fans = metrics.page_fans || [];
    const currentFollowers = fans[fans.length - 1] || 0;
    const previousFollowers = fans[0] || currentFollowers;

    return {
      followers: currentFollowers,
      followersGrowth: currentFollowers - previousFollowers,
      avgEngagementRate:
        metrics.page_engaged_users && metrics.page_impressions
          ? (metrics.page_engaged_users.reduce((a, b) => a + b, 0) /
              metrics.page_impressions.reduce((a, b) => a + b, 0)) *
            100
          : undefined,
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
    const pageId = connection.pageId;
    const pageToken = connection.pageAccessToken || connection.accessToken;

    if (!pageId || !pageToken) {
      throw new Error('No page connected');
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/${pageId}?fields=id,name,username,link,picture,fan_count`,
      {
        headers: {
          Authorization: `Bearer ${pageToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get account info');
    }

    const data = await response.json();

    return {
      id: data.id,
      username: data.username || data.id,
      displayName: data.name,
      profileUrl: data.link,
      avatarUrl: data.picture?.data?.url,
      followers: data.fan_count,
    };
  }

  // ============================================
  // HELPER: GET USER PAGES
  // ============================================

  /**
   * Get list of pages the user manages
   * Used during connection setup
   */
  async getUserPages(userAccessToken: string): Promise<
    Array<{
      id: string;
      name: string;
      accessToken: string;
      category: string;
    }>
  > {
    const response = await fetch(`${GRAPH_API_BASE}/me/accounts`, {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user pages');
    }

    const data = await response.json();

    return (data.data || []).map(
      (page: { id: string; name: string; access_token: string; category: string }) => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category,
      })
    );
  }
}

// Export singleton instance
export const facebookAdapter = new FacebookAdapter();
