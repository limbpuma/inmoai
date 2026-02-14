/**
 * Wrapper to load env before running seed
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

// Dynamic import to ensure env is loaded first
async function main() {
  const { seedMarketplace } = await import('./seed-marketplace-fn');
  await seedMarketplace();
}

main().catch(console.error);
