/**
 * Social Platform Adapters Registry
 * Central registry for all social media platform adapters
 */

export * from './base.adapter';
export { facebookAdapter, FacebookAdapter } from './facebook.adapter';
export { instagramAdapter, InstagramAdapter } from './instagram.adapter';
export { linkedinAdapter, LinkedInAdapter } from './linkedin.adapter';
export { tiktokAdapter, TikTokAdapter } from './tiktok.adapter';

import type { SocialPlatform, SocialPlatformAdapter } from './base.adapter';
import { facebookAdapter } from './facebook.adapter';
import { instagramAdapter } from './instagram.adapter';
import { linkedinAdapter } from './linkedin.adapter';
import { tiktokAdapter } from './tiktok.adapter';

/**
 * Registry of all platform adapters
 */
const adapters: Record<SocialPlatform, SocialPlatformAdapter> = {
  facebook: facebookAdapter,
  instagram: instagramAdapter,
  linkedin: linkedinAdapter,
  tiktok: tiktokAdapter,
  twitter: facebookAdapter, // TODO: Implement Twitter adapter
};

/**
 * Get adapter for a specific platform
 */
export function getAdapter(platform: SocialPlatform): SocialPlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`No adapter found for platform: ${platform}`);
  }
  return adapter;
}

/**
 * Get all available platforms
 */
export function getAvailablePlatforms(): SocialPlatform[] {
  return Object.keys(adapters) as SocialPlatform[];
}

/**
 * Check if a platform is supported
 */
export function isPlatformSupported(platform: string): platform is SocialPlatform {
  return platform in adapters;
}
