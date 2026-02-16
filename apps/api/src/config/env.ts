import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Database
    DATABASE_URL: z.string().url(),

    // Redis
    REDIS_URL: z.string().optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // Vector DB
    QDRANT_URL: z.string().url().optional(),
    QDRANT_API_KEY: z.string().optional(),

    // AI
    GEMINI_API_KEY: z.string().min(1),
    OPENAI_API_KEY: z.string().optional(),

    // Auth
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Scraping
    PROXY_API_KEY: z.string().optional(),
    PROXY_API_URL: z.string().url().optional(),

    // Storage
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),

    // Email
    RESEND_API_KEY: z.string().optional(),

    // Stripe (optional in development)
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_ID_FREE: z.string().optional(),
    STRIPE_PRICE_ID_PRO: z.string().optional(),
    STRIPE_PRICE_ID_AGENCY: z.string().optional(),

    // Rate Limiting
    RATE_LIMIT_REQUESTS_PER_HOUR: z.coerce.number().default(100),

    // Portals - Autoposting System
    APP_URL: z.string().url().optional(),
    PORTAL_ENCRYPTION_KEY: z.string().min(32).optional(),
    JWT_SECRET: z.string().min(32).optional(),

    // Redis for BullMQ
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.string().optional(),

    // Portal OAuth Credentials
    IDEALISTA_CLIENT_ID: z.string().optional(),
    IDEALISTA_CLIENT_SECRET: z.string().optional(),
    FOTOCASA_CLIENT_ID: z.string().optional(),
    FOTOCASA_CLIENT_SECRET: z.string().optional(),
    HABITACLIA_CLIENT_ID: z.string().optional(),
    HABITACLIA_CLIENT_SECRET: z.string().optional(),
    PISOS_CLIENT_ID: z.string().optional(),
    PISOS_CLIENT_SECRET: z.string().optional(),
    MILANUNCIOS_CLIENT_ID: z.string().optional(),
    MILANUNCIOS_CLIENT_SECRET: z.string().optional(),

    // Social Media OAuth
    FACEBOOK_APP_ID: z.string().optional(),
    FACEBOOK_APP_SECRET: z.string().optional(),
    LINKEDIN_CLIENT_ID: z.string().optional(),
    LINKEDIN_CLIENT_SECRET: z.string().optional(),
    TIKTOK_CLIENT_KEY: z.string().optional(),
    TIKTOK_CLIENT_SECRET: z.string().optional(),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    QDRANT_URL: process.env.QDRANT_URL,
    QDRANT_API_KEY: process.env.QDRANT_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    PROXY_API_KEY: process.env.PROXY_API_KEY,
    PROXY_API_URL: process.env.PROXY_API_URL,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID_FREE: process.env.STRIPE_PRICE_ID_FREE,
    STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO,
    STRIPE_PRICE_ID_AGENCY: process.env.STRIPE_PRICE_ID_AGENCY,
    RATE_LIMIT_REQUESTS_PER_HOUR: process.env.RATE_LIMIT_REQUESTS_PER_HOUR,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,

    // Portals
    APP_URL: process.env.APP_URL,
    PORTAL_ENCRYPTION_KEY: process.env.PORTAL_ENCRYPTION_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DB: process.env.REDIS_DB,
    IDEALISTA_CLIENT_ID: process.env.IDEALISTA_CLIENT_ID,
    IDEALISTA_CLIENT_SECRET: process.env.IDEALISTA_CLIENT_SECRET,
    FOTOCASA_CLIENT_ID: process.env.FOTOCASA_CLIENT_ID,
    FOTOCASA_CLIENT_SECRET: process.env.FOTOCASA_CLIENT_SECRET,
    HABITACLIA_CLIENT_ID: process.env.HABITACLIA_CLIENT_ID,
    HABITACLIA_CLIENT_SECRET: process.env.HABITACLIA_CLIENT_SECRET,
    PISOS_CLIENT_ID: process.env.PISOS_CLIENT_ID,
    PISOS_CLIENT_SECRET: process.env.PISOS_CLIENT_SECRET,
    MILANUNCIOS_CLIENT_ID: process.env.MILANUNCIOS_CLIENT_ID,
    MILANUNCIOS_CLIENT_SECRET: process.env.MILANUNCIOS_CLIENT_SECRET,

    // Social Media OAuth
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
    TIKTOK_CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY,
    TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
