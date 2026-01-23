import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { env } from '@/config/env';
import { db } from '@/server/infrastructure/database';
import { users } from '@/server/infrastructure/database/schema';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

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
  },
  pro: {
    name: 'Pro',
    description: 'Para búsquedas serias',
    priceId: env.STRIPE_PRICE_ID_PRO,
    price: 9.99,
    features: [
      'Búsquedas ilimitadas',
      'Todos los filtros',
      'Alertas ilimitadas',
      'Análisis de fraude IA',
      'Historial completo',
      'Soporte prioritario',
    ],
  },
  agency: {
    name: 'Agency',
    description: 'Para profesionales',
    priceId: env.STRIPE_PRICE_ID_AGENCY,
    price: 49.99,
    features: [
      'Todo de Pro',
      'API Access',
      'Multi-usuario (5)',
      'Exportación de datos',
      'Integraciones CRM',
      'Soporte dedicado',
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
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
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

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
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

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
