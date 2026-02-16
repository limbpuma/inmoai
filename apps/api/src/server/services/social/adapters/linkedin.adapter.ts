/**
 * LinkedIn Adapter
 * Handles LinkedIn API integration for posting
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

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';
const LINKEDIN_AUTH_BASE = 'https://www.linkedin.com/oauth/v2';

export class LinkedInAdapter extends BaseSocialAdapter {
  readonly platform = 'linkedin' as const;

  readonly limits: PlatformLimits = {
    maxContentLength: 3000,
    maxHashtags: 5,
    maxImages: 9,
    maxVideoLengthSeconds: 10 * 60, // 10 minutes
    imageAspectRatio: '1.91:1',
    supportedMediaTypes: ['image', 'video', 'carousel'],
    supportsScheduling: false, // LinkedIn API doesn't support scheduling
    supportsLinks: true,
  };

  private get clientId(): string {
    return env.LINKEDIN_CLIENT_ID || '';
  }

  private get clientSecret(): string {
    return env.LINKEDIN_CLIENT_SECRET || '';
  }

  // ============================================
  // OAUTH METHODS
  // ============================================

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const scopes = [
      'r_liteprofile',
      'r_emailaddress',
      'w_member_social',
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: scopes,
    });

    return `${LINKEDIN_AUTH_BASE}/authorization?${params}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(`${LINKEDIN_AUTH_BASE}/accessToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LinkedIn OAuth error: ${error.error_description || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      tokenType: data.token_type,
    };
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(`${LINKEDIN_AUTH_BASE}/accessToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh LinkedIn token');
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
    // LinkedIn doesn't have a revoke endpoint
    // Token will expire naturally
    console.log('LinkedIn tokens cannot be revoked programmatically');
  }

  // ============================================
  // POSTING METHODS
  // ============================================

  async publishPost(connection: SocialConnection, post: PostData): Promise<PublishResult> {
    const accessToken = connection.accessToken;
    const authorId = connection.platformUserId;

    if (!accessToken || !authorId) {
      return this.errorResult('LinkedIn account not connected', 'NO_ACCOUNT');
    }

    try {
      const content = this.formatPostContent(post);

      // Build the share content
      const shareContent: Record<string, unknown> = {
        author: `urn:li:person:${authorId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      // Add media if present
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        if (post.mediaType === 'image' || !post.mediaType) {
          const mediaAssets = await this.uploadImages(authorId, accessToken, post.mediaUrls);

          shareContent.specificContent = {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: content },
              shareMediaCategory: mediaAssets.length > 1 ? 'IMAGE' : 'IMAGE',
              media: mediaAssets.map((asset) => ({
                status: 'READY',
                media: asset,
              })),
            },
          };
        }
      } else if (post.link) {
        // Article share
        shareContent.specificContent = {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'ARTICLE',
            media: [
              {
                status: 'READY',
                originalUrl: post.link,
              },
            ],
          },
        };
      }

      const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(shareContent),
      });

      const data = await response.json();

      if (!response.ok) {
        return this.errorResult(
          data.message || 'Failed to publish to LinkedIn',
          data.status?.toString()
        );
      }

      // Extract post ID from response header or body
      const postId = response.headers.get('x-restli-id') || data.id;

      return {
        success: true,
        platformPostId: postId,
        postUrl: `https://www.linkedin.com/feed/update/${postId}`,
      };
    } catch (error) {
      return this.errorResult(
        error instanceof Error ? error.message : 'Unknown error',
        'PUBLISH_ERROR'
      );
    }
  }

  private async uploadImages(
    authorId: string,
    accessToken: string,
    imageUrls: string[]
  ): Promise<string[]> {
    const assets: string[] = [];

    for (const imageUrl of imageUrls.slice(0, this.limits.maxImages)) {
      // Register upload
      const registerResponse = await fetch(`${LINKEDIN_API_BASE}/assets?action=registerUpload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${authorId}`,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        }),
      });

      if (!registerResponse.ok) continue;

      const registerData = await registerResponse.json();
      const uploadUrl =
        registerData.value?.uploadMechanism?.[
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
        ]?.uploadUrl;
      const asset = registerData.value?.asset;

      if (!uploadUrl || !asset) continue;

      // Download image and upload to LinkedIn
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg',
        },
        body: imageBuffer,
      });

      assets.push(asset);
    }

    return assets;
  }

  async schedulePost(
    connection: SocialConnection,
    post: PostData,
    scheduledAt: Date
  ): Promise<ScheduleResult> {
    return {
      success: false,
      error: 'LinkedIn API does not support scheduling. Post will be queued for scheduled time.',
    };
  }

  async deletePost(connection: SocialConnection, platformPostId: string): Promise<void> {
    const accessToken = connection.accessToken;

    const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts/${platformPostId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete LinkedIn post');
    }
  }

  // ============================================
  // ANALYTICS METHODS
  // ============================================

  async getPostAnalytics(
    connection: SocialConnection,
    platformPostId: string
  ): Promise<PostAnalytics> {
    const accessToken = connection.accessToken;

    const response = await fetch(
      `${LINKEDIN_API_BASE}/socialActions/${platformPostId}?projection=(likesSummary,commentsSummary)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return { updatedAt: new Date() };
    }

    const data = await response.json();

    return {
      likes: data.likesSummary?.totalLikes || 0,
      comments: data.commentsSummary?.totalFirstLevelComments || 0,
      updatedAt: new Date(),
    };
  }

  async getAccountAnalytics(
    connection: SocialConnection,
    dateRange: DateRange
  ): Promise<AccountAnalytics> {
    // LinkedIn analytics require special permissions
    return {
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
      const response = await fetch(`${LINKEDIN_API_BASE}/me`, {
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
      throw new Error('LinkedIn account not connected');
    }

    const response = await fetch(
      `${LINKEDIN_API_BASE}/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get LinkedIn profile');
    }

    const data = await response.json();

    const profilePicture = data.profilePicture?.['displayImage~']?.elements?.find(
      (e: { data: { 'com.linkedin.digitalmedia.mediaartifact.StillImage': { storageSize: { width: number } } } }) =>
        e.data?.['com.linkedin.digitalmedia.mediaartifact.StillImage']?.storageSize?.width >= 100
    );

    return {
      id: data.id,
      username: data.id,
      displayName: `${data.localizedFirstName} ${data.localizedLastName}`,
      profileUrl: `https://www.linkedin.com/in/${data.id}`,
      avatarUrl: profilePicture?.identifiers?.[0]?.identifier,
    };
  }
}

// Export singleton instance
export const linkedinAdapter = new LinkedInAdapter();
