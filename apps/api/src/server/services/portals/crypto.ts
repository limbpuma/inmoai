/**
 * Crypto utilities for Portal token encryption
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';
import { env } from '../../../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * Key should be a 64-character hex string (32 bytes)
 */
function getEncryptionKey(): Buffer {
  const key = env.PORTAL_ENCRYPTION_KEY;

  if (!key) {
    // In development, use a derived key from JWT secret
    // In production, PORTAL_ENCRYPTION_KEY must be set
    if (env.NODE_ENV === 'production') {
      throw new Error('PORTAL_ENCRYPTION_KEY must be set in production');
    }

    // Derive key from JWT secret for development
    const jwtSecret = env.JWT_SECRET || 'development-secret-key';
    return crypto.scryptSync(jwtSecret, 'inmoai-portal-salt', KEY_LENGTH);
  }

  // Validate key format
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('PORTAL_ENCRYPTION_KEY must be a 64-character hex string');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string value
 * Returns base64-encoded ciphertext with IV and auth tag prepended
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv (hex) + authTag (hex) + encrypted (hex)
  // Using hex throughout for consistency
  const combined = iv.toString('hex') + authTag.toString('hex') + encrypted;

  return Buffer.from(combined, 'hex').toString('base64');
}

/**
 * Decrypt a string value
 * Expects base64-encoded input with IV and auth tag prepended
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();

  // Decode from base64 to hex
  const combined = Buffer.from(ciphertext, 'base64').toString('hex');

  // Extract components
  const ivHex = combined.slice(0, IV_LENGTH * 2);
  const authTagHex = combined.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2);
  const encryptedHex = combined.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt OAuth tokens object
 */
export function encryptTokens(tokens: {
  accessToken: string;
  refreshToken?: string;
}): {
  accessToken: string;
  refreshToken?: string;
} {
  return {
    accessToken: encrypt(tokens.accessToken),
    refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
  };
}

/**
 * Decrypt OAuth tokens object
 */
export function decryptTokens(encryptedTokens: {
  accessToken: string;
  refreshToken?: string | null;
}): {
  accessToken: string;
  refreshToken?: string;
} {
  return {
    accessToken: decrypt(encryptedTokens.accessToken),
    refreshToken: encryptedTokens.refreshToken ? decrypt(encryptedTokens.refreshToken) : undefined,
  };
}

/**
 * Generate a secure random state parameter for OAuth
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a state parameter for storage/comparison
 */
export function hashOAuthState(state: string): string {
  return crypto.createHash('sha256').update(state).digest('hex');
}

/**
 * Generate a secure random encryption key
 * Use this to generate PORTAL_ENCRYPTION_KEY for production
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}
