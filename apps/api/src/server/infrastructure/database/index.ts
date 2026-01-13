import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '@/config/env';

// Connection for queries
const queryClient = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Drizzle instance with schema
export const db = drizzle(queryClient, {
  schema,
  logger: env.NODE_ENV === 'development',
});

// Export types
export type Database = typeof db;
export * from './schema';
