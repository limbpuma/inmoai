import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { env } from '@/config/env';
import { db } from '@/server/infrastructure/database';
import { users } from '@/server/infrastructure/database/schema';

// Stripe is optional in development - create client only if key exists
export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      // @ts-expect-error - API version may differ from installed types
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  : null;

export const isStripeEnabled = (): boolean => stripe !== null;

/**
 * PRICING MODEL v2 - Post-SaaSpocalypse
 *
 * Migración de per-seat a outcome-based:
 * - Pro: Créditos IA mensuales (evita margen negativo)
 * - Agency: Sin límite de usuarios, basado en volumen de operaciones
 * - B2B: Ya usa créditos (tabla agentApiKeys)
 */
export const PLANS = {
  free: {
    name: 'Free',
    description: 'Para empezar a explorar',
    priceId: env.STRIPE_PRICE_ID_FREE || null,
    price: 0,
    features: [
      '10 búsquedas al día',
      'Filtros básicos',
      'Alertas por email (1)',
    ],
    limits: {
      searchesPerDay: 10,
      aiCreditsPerMonth: 0,
      alerts: 1,
    },
  },
  pro: {
    name: 'Pro',
    description: 'Para búsquedas serias',
    priceId: env.STRIPE_PRICE_ID_PRO,
    price: 9.99,
    features: [
      '500 créditos IA/mes',
      'Todos los filtros',
      'Alertas ilimitadas',
      'Análisis de fraude IA',
      'Historial completo',
      'Soporte prioritario',
    ],
    limits: {
      searchesPerDay: -1, // unlimited
      aiCreditsPerMonth: 500,
      alerts: -1, // unlimited
    },
  },
  agency: {
    name: 'Agency',
    description: 'Para profesionales',
    priceId: env.STRIPE_PRICE_ID_AGENCY,
    price: 49.99,
    features: [
      'Todo de Pro',
      'API Access completo',
      'Usuarios ilimitados', // Changed from per-seat
      '5,000 créditos IA/mes',
      'Autoposting multi-portal',
      'Analytics avanzados',
      'Soporte dedicado 24/7',
    ],
    limits: {
      searchesPerDay: -1, // unlimited
      aiCreditsPerMonth: 5000,
      alerts: -1, // unlimited
      users: -1, // unlimited - NO PER-SEAT
      portals: 5,
    },
  },
} as const;

/**
 * AI Credit costs per operation
 * Used to calculate usage and enforce limits
 */
export const AI_CREDIT_COSTS = {
  search_basic: 1,
  search_ai_enhanced: 5,
  fraud_detection: 10,
  valuation_estimate: 15,
  listing_improvement: 20,
  market_analysis: 25,
  agent_conversation: 3, // per message
} as const;

export type PlanType = keyof typeof PLANS;

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  if (!stripe) {
    throw new Error('Stripe no está configurado. Añade STRIPE_SECRET_KEY en .env.local');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user.id,
      },
    });

    customerId = customer.id;

    // Save customer ID
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId));
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        userId: user.id,
      },
    },
    metadata: {
      userId: user.id,
    },
  });

  return session;
}

export async function createBillingPortalSession(
  userId: string,
  returnUrl: string
) {
  if (!stripe) {
    throw new Error('Stripe no está configurado. Añade STRIPE_SECRET_KEY en .env.local');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user?.stripeCustomerId) {
    throw new Error('No tienes una suscripción activa');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: returnUrl,
  });

  return session;
}

export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  // @ts-expect-error - current_period_end exists but types may vary
  const currentPeriodEnd = new Date((subscription.current_period_end ?? Date.now() / 1000) * 1000);

  // Determine role based on price
  let role: 'user' | 'premium' | 'agency' = 'user';
  if (priceId === env.STRIPE_PRICE_ID_AGENCY) {
    role = 'agency';
  } else if (priceId === env.STRIPE_PRICE_ID_PRO) {
    role = 'premium';
  }

  await db
    .update(users)
    .set({
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      role,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  // @ts-expect-error - current_period_end exists but types may vary
  const currentPeriodEnd = new Date((subscription.current_period_end ?? Date.now() / 1000) * 1000);

  // Determine role based on price
  let role: 'user' | 'premium' | 'agency' = 'user';
  if (priceId === env.STRIPE_PRICE_ID_AGENCY) {
    role = 'agency';
  } else if (priceId === env.STRIPE_PRICE_ID_PRO) {
    role = 'premium';
  }

  await db
    .update(users)
    .set({
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: currentPeriodEnd,
      role,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  await db
    .update(users)
    .set({
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      role: 'user',
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function getSubscriptionStatus(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      stripeSubscriptionId: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
      role: true,
    },
  });

  if (!user) {
    return null;
  }

  const isActive =
    user.stripeCurrentPeriodEnd &&
    new Date(user.stripeCurrentPeriodEnd) > new Date();

  return {
    subscriptionId: user.stripeSubscriptionId,
    priceId: user.stripePriceId,
    currentPeriodEnd: user.stripeCurrentPeriodEnd,
    role: user.role,
    isActive,
  };
}
