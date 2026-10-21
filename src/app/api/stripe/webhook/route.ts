import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

// Sincroniza las suscripciones de Stripe con la tabla `subscriptions`.
// Eventos: checkout.session.completed y customer.subscription.created|updated|deleted.

function toISO(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function syncSubscription(subscription: Stripe.Subscription, fallbackUserId?: string) {
  const supabase = createAdminClient();
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  let userId = subscription.metadata?.user_id || fallbackUserId;
  if (!userId) {
    const { data } = await supabase.from('subscriptions').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) {
    console.error('stripe-webhook: suscripción sin usuario', subscription.id);
    return;
  }

  const item = subscription.items.data[0];
  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      source: 'stripe',
      plan: 'basico',
      price_key: item?.price.lookup_key ?? subscription.metadata?.price_key ?? null,
      status: subscription.status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      current_period_end: toISO(item?.current_period_end),
      trial_end: toISO(subscription.trial_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw new Error(`upsert subscriptions: ${error.message}`);
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) return NextResponse.json({ error: 'Sin firma.' }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const id = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          await syncSubscription(await stripe.subscriptions.retrieve(id), session.client_reference_id ?? undefined);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object);
        break;
    }
  } catch (error) {
    // 500 para que Stripe reintente
    console.error('stripe-webhook:', event.type, error);
    return NextResponse.json({ error: 'Error al procesar el evento.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
