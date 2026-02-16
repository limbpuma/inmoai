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
 * PRICING MODEL v3 - Agentic Anti-Fragile
 *
 * PRINCIPIOS ESTRATÉGICOS:
 * 1. Regalar lo que IA commoditiza (búsqueda, análisis básico)
 * 2. Cobrar por OUTCOMES, no por acceso (transacciones, no créditos)
 * 3. El valor está en el TRUST LAYER (Escrow, Reviews verificados)
 * 4. Los agentes IA son CLIENTES de nuestra API, no competidores
 *
 * REVENUE MIX OBJETIVO (post-pivot):
 * - 40% Subscriptions (Pro + Agency)
 * - 30% API/MCP consumption (AI agents)
 * - 20% Transaction Fees (Escrow 0.5% + Marketplace 10%)
 * - 10% Premium verifications + Directory
 */
export const PLANS = {
  free: {
    name: 'Explorador',
    description: 'Descubre el poder de la verificacion inmobiliaria con IA.',
    priceId: env.STRIPE_PRICE_ID_FREE || null,
    price: 0,
    features: [
      '30 busquedas/mes con IA',
      '1 verificacion catastral/mes',
      '3 detecciones de fraude/mes',
      'Analisis de mercado basico',
      '1 alerta de precio',
    ],
    limits: {
      searchesPerMonth: 30,
      semanticSearches: 3,
      cadastreVerifications: 1,
      fraudDetections: 3,
      alerts: 1,
      priceHistoryDays: 30,
      aiCreditsPerMonth: 100,
    },
  },
  pro: {
    name: 'Profesional',
    description: 'Verificaciones y herramientas avanzadas para decisiones informadas',
    priceId: env.STRIPE_PRICE_ID_PRO,
    price: 49,
    features: [
      '500 busquedas/mes con IA',
      '50 verificaciones catastrales/mes',
      '100 detecciones de fraude/mes',
      'Historial de precios completo',
      'Exportar a PDF/Excel',
      '10 alertas de precio',
      'Soporte prioritario',
    ],
    limits: {
      searchesPerMonth: 500,
      semanticSearches: 200,
      cadastreVerifications: 50,
      fraudDetections: 100,
      alerts: 10,
      priceHistoryDays: -1,
      exports: -1,
      aiCreditsPerMonth: 2000,
    },
  },
  agency: {
    name: 'Agencia',
    description: 'Automatizacion completa para equipos inmobiliarios',
    priceId: env.STRIPE_PRICE_ID_AGENCY,
    price: 149,
    features: [
      'Todo de Profesional',
      '2.000 busquedas/mes',
      '200 verificaciones catastrales',
      'Autoposting en redes sociales',
      'Dashboard de analytics',
      'Gestion de leads centralizada',
      'API Access (1.000 calls/mes)',
      'Soporte 24/7',
    ],
    limits: {
      searchesPerMonth: 2000,
      semanticSearches: 1000,
      cadastreVerifications: 200,
      fraudDetections: 500,
      alerts: 50,
      priceHistoryDays: -1,
      exports: -1,
      users: -1,
      apiRequestsPerMonth: 1000,
      aiCreditsPerMonth: 10000,
    },
  },
} as const;

/**
 * TRANSACTION FEES - Core Revenue Model
 *
 * Este es el modelo anti-frágil: cobramos por OUTCOMES, no por acceso.
 * Un cierre de venta (€600) = 120 meses de suscripción Pro.
 */
export const TRANSACTION_FEES = {
  // Escrow - Trust Layer
  property_sale: 0.003, // 0.3% → €600 en venta de €200K
  property_rent: 0.005, // 0.5% renta anual → €60 en alquiler €1K/mes

  // Marketplace - Network Effects
  service_completion: 0.10, // 10% → €500 en reforma de €5K
  lead_fee: 5, // €5 por lead cualificado a proveedor

  // Custom/Enterprise
  custom: 0.05, // 5% negociable
} as const;

/**
 * AI Operation Costs (interno, no expuesto a usuarios)
 *
 * Post-paradigma: estos costos son NUESTROS, no del usuario.
 * La IA es un COST CENTER que habilita transacciones (PROFIT CENTER).
 */
export const AI_OPERATION_COSTS = {
  // Bajo costo - incluir gratis
  search_basic: 1,
  search_ai_enhanced: 3,
  fraud_detection: 5,

  // Medio costo - incluir en Free con límite
  valuation_estimate: 10,
  market_analysis: 15,

  // Alto costo - incluir en Pro/Agency
  listing_improvement: 20,
  agent_conversation: 3,
  document_analysis: 25,
} as const;

// Backwards compatibility alias
export const AI_CREDIT_COSTS = AI_OPERATION_COSTS;

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
