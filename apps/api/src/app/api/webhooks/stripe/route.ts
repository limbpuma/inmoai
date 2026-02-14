import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@/config/env';
import {
  stripe,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from '@/server/services/stripe';

export async function POST(req: NextRequest) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    // Security: Only log detailed errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Webhook signature verification failed:', err);
    } else {
      console.error('Webhook signature verification failed');
    }
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        // Handle successful payment - log only safe identifiers
        if (process.env.NODE_ENV === 'development') {
          const invoice = event.data.object as Stripe.Invoice;
          // eslint-disable-next-line no-console
          console.log('Payment succeeded:', { id: invoice.id, customerId: invoice.customer });
        }
        break;

      case 'invoice.payment_failed':
        // Handle failed payment - log only safe identifiers
        if (process.env.NODE_ENV === 'development') {
          const invoice = event.data.object as Stripe.Invoice;
          // eslint-disable-next-line no-console
          console.log('Payment failed:', { id: invoice.id, customerId: invoice.customer });
        }
        break;

      default:
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log(`Unhandled event type: ${event.type}`);
        }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Security: Only log detailed errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error processing webhook:', error);
    } else {
      console.error('Error processing webhook:', error instanceof Error ? error.message : 'Unknown error');
    }
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
