import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/infrastructure/database';
import { serviceProviders } from '@/server/infrastructure/database/schema';
import { sql } from 'drizzle-orm';
import { env } from '@/config/env';

/**
 * Monthly reset of leadsThisMonth counter for all providers.
 *
 * Call via cron job on the 1st of each month:
 * - Vercel Cron: add to vercel.json
 * - External: GET /api/cron/reset-leads?key=CRON_SECRET
 *
 * Protected by CRON_SECRET env var to prevent unauthorized calls.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const urlKey = req.nextUrl.searchParams.get('key');
  const cronSecret = env.CRON_SECRET;

  // Verify authorization: Vercel cron header OR query key
  const isVercelCron = authHeader === `Bearer ${cronSecret}`;
  const isKeyAuth = cronSecret && urlKey === cronSecret;

  if (!isVercelCron && !isKeyAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await db
    .update(serviceProviders)
    .set({ leadsThisMonth: 0, updatedAt: new Date() })
    .where(sql`${serviceProviders.leadsThisMonth} > 0`)
    .returning({ id: serviceProviders.id });

  return NextResponse.json({
    success: true,
    resetCount: result.length,
    timestamp: new Date().toISOString(),
  });
}
