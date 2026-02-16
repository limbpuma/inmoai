/**
 * TikTok Adapter
 * Handles TikTok Content Posting API integration
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

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';
const TIKTOK_AUTH_BASE = 'https://www.tiktok.com/v2/auth/authorize';

export class TikTokAdapter extends BaseSocialAdapter {
  readonly platform = 'tiktok' as const;

  readonly limits: PlatformLimits = {
    maxContentLength: 2200,
    maxHashtags: 10,
    maxImages: 0, // TikTok is video-only (or photo mode in some regions)
    maxVideoLengthSeconds: 10 * 60, // 10 minutes
    imageAspectRatio: '9:16', // Vertical video
    supportedMediaTypes: ['video'],
    supportsScheduling: false,
    supportsLinks: false,
  };

  private get clientKey(): string {
    return env.TIKTOK_CLIENT_KEY || '';
  }

  private get clientSecret(): string {
    return env.TIKTOK_CLIENT_SECRET || '';
  }

  // ============================================
  // OAUTH METHODS
  // ============================================

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const scopes = [
      'user.info.basic',
      'video.publish',
      'video.upload',
    ].join(',');

    const params = new URLSearchParams({
      client_key: this.clientKey,
      redirect_uri: redirectUri,
      state,
      scope: scopes,
      response_type: 'code',
    });

    return `${TIKTOK_AUTH_BASE}?${params}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`TikTok OAuth error: ${error.error_description || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
      tokenType: data.token_type,
      scope: data.scope?.split(','),
    };
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh TikTok token');
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    };
  }

  async revokeAccess(accessToken: string): Promise<void> {
    await fetch(`${TIKTOK_API_BASE}/oauth/revoke/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        token: accessToken,
      }).toString(),
    });
  }

  // ============================================
  // POSTING METHODS
  // ============================================

  async publishPost(connection: SocialConnection, post: PostData): Promise<PublishResult> {
    const accessToken = connection.accessToken;

    if (!accessToken) {
      return this.errorResult('TikTok account not connected', 'NO_ACCOUNT');
    }

    if (!post.mediaUrls || post.mediaUrls.length === 0 || post.mediaType !== 'video') {
      return this.errorResult('TikTok requires video content', 'NO_VIDEO');
    }

    try {
      const content = this.formatPostContent(post);
      const videoUrl = post.mediaUrls[0];

      // Step 1: Initialize video upload
      const initResponse = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: content.substring(0, 150), // TikTok title limit
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: videoUrl,
          },
        }),
      });

      const initData = await initResponse.json();

      if (!initResponse.ok || initData.error?.code) {
        return this.errorResult(
          initData.error?.message || 'Failed to initialize TikTok upload',
          initData.error?.code
        );
      }

      const publishId = initData.data?.publish_id;

      if (!publishId) {
        return this.errorResult('No publish ID received', 'NO_PUBLISH_ID');
      }

      // Step 2: Check publish status (TikTok processes asynchronously)
      const statusResult = await this.waitForPublishStatus(accessToken, publishId);

      if (!statusResult.success) {
        return statusResult;
      }

      return {
        success: true,
        platformPostId: publishId,
        postUrl: `https://www.tiktok.com/@${connection.platformUsername}/video/${publishId}`,
      };
    } catch (error) {
      return this.errorResult(
        error instanceof Error ? error.message : 'Unknown error',
        'PUBLISH_ERROR'
      );
    }
  }

  private async waitForPublishStatus(
    accessToken: string,
    publishId: string,
    maxAttempts = 30
  ): Promise<PublishResult> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `${TIKTOK_API_BASE}/post/publish/status/fetch/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ publish_id: publishId }),
        }
      );

      const data = await response.json();

      if (data.data?.status === 'PUBLISH_COMPLETE') {
        return {
          success: true,
          platformPostId: publishId,
        };
      }

      if (data.data?.status === 'FAILED') {
        return this.errorResult(
          data.data?.fail_reason || 'TikTok publishing failed',
          'PUBLISH_FAILED'
        );
      }

      // Wait 3 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    return this.errorResult('TikTok publishing timeout', 'TIMEOUT');
  }

  async schedulePost(
    connection: SocialConnection,
    post: PostData,
    scheduledAt: Date
  ): Promise<ScheduleResult> {
    return {
      success: false,
      error: 'TikTok API does not support scheduling. Post will be queued for scheduled time.',
    };
  }

  async deletePost(connection: SocialConnection, platformPostId: string): Promise<void> {
    // TikTok Content Posting API doesn't support deletion
    throw new Error('TikTok posts can only be deleted via the TikTok app');
  }

  // ============================================
  // ANALYTICS METHODS
  // ============================================

  async getPostAnalytics(
    connection: SocialConnection,
    platformPostId: string
  ): Promise<PostAnalytics> {
    const accessToken = connection.accessToken;

    const response = await fetch(`${TIKTOK_API_BASE}/video/query/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: {
          video_ids: [platformPostId],
        },
        fields: ['like_count', 'comment_count', 'share_count', 'view_count'],
      }),
    });

    if (!response.ok) {
      return { updatedAt: new Date() };
    }

    const data = await response.json();
    const video = data.data?.videos?.[0];

    return {
      likes: video?.like_count || 0,
      comments: video?.comment_count || 0,
      shares: video?.share_count || 0,
      videoViews: video?.view_count || 0,
      updatedAt: new Date(),
    };
  }

  async getAccountAnalytics(
    connection: SocialConnection,
    dateRange: DateRange
  ): Promise<AccountAnalytics> {
    const accessToken = connection.accessToken;

    const response = await fetch(`${TIKTOK_API_BASE}/user/info/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return {
        periodStart: dateRange.from,
        periodEnd: dateRange.to,
      };
    }

    const data = await response.json();

    return {
      followers: data.data?.user?.follower_count,
      totalPosts: data.data?.user?.video_count,
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
      const response = await fetch(`${TIKTOK_API_BASE}/user/info/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    const accessToken = connection.accessToken;

    if (!accessToken) {
      throw new Error('TikTok account not connected');
    }

    const response = await fetch(
      `${TIKTOK_API_BASE}/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get TikTok profile');
    }

    const data = await response.json();
    const user = data.data?.user;

    return {
      id: user?.open_id || user?.union_id,
      username: user?.display_name || 'TikTok User',
      displayName: user?.display_name,
      profileUrl: `https://www.tiktok.com/@${user?.display_name}`,
      avatarUrl: user?.avatar_url,
      followers: user?.follower_count,
    };
  }
}

// Export singleton instance
export const tiktokAdapter = new TikTokAdapter();
