/**
 * Vitest global test setup
 * Runs before all test suites
 */
import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/inmoai_test';
process.env.NEXTAUTH_SECRET = 'test-secret-for-vitest-only';
process.env.NEXTAUTH_URL = 'http://localhost:9091';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Mock the database module globally
vi.mock('@/server/infrastructure/database', () => ({
  db: {
    query: {
      users: { findFirst: vi.fn(), findMany: vi.fn() },
      listings: { findFirst: vi.fn(), findMany: vi.fn() },
      escrow: { findFirst: vi.fn(), findMany: vi.fn() },
      serviceProviders: { findFirst: vi.fn(), findMany: vi.fn() },
      agentSessions: { findFirst: vi.fn(), findMany: vi.fn() },
      agentTransactions: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => []),
          orderBy: vi.fn(() => []),
        })),
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => []),
            })),
          })),
        })),
      })),
    })),
    selectDistinct: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => []),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => [{ id: 'test-id' }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => [{ id: 'test-id' }]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
    transaction: vi.fn(async (fn: Function) => fn({
      query: {
        users: { findFirst: vi.fn() },
        escrow: { findFirst: vi.fn() },
      },
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => [{ id: 'test-id' }]),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => [{ id: 'test-id' }]),
        })),
      })),
    })),
  },
}));

// Mock env config
vi.mock('@/config/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/inmoai_test',
    NEXTAUTH_SECRET: 'test-secret',
    NEXTAUTH_URL: 'http://localhost:9091',
    GEMINI_API_KEY: 'test-gemini-key',
    OPENAI_API_KEY: 'test-openai-key',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    STRIPE_PRICE_ID_FREE: 'price_free',
    STRIPE_PRICE_ID_PRO: 'price_pro',
    STRIPE_PRICE_ID_AGENCY: 'price_agency',
    STRIPE_PRICE_ID_PROVIDER_PREMIUM: 'price_provider_premium',
    STRIPE_PRICE_ID_PROVIDER_ENTERPRISE: 'price_provider_enterprise',
    QDRANT_URL: '',
    QDRANT_API_KEY: '',
    REDIS_URL: '',
    R2_ACCOUNT_ID: '',
    R2_ACCESS_KEY_ID: '',
    R2_SECRET_ACCESS_KEY: '',
    R2_BUCKET_NAME: '',
    RESEND_API_KEY: '',
    SENTRY_DSN: '',
  },
}));
