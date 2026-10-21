import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/api-auth';
import { parseJsonBody } from '@/lib/api-validation';
import { PRICE_KEYS, TRIAL_DAYS, type PriceKey } from '@/lib/plans';
import { getStripe, priceIdFor } from '@/lib/stripe';

const bodySchema = z.object({
  price: z.enum(PRICE_KEYS as [PriceKey, ...PriceKey[]]),
});

/** Abre Stripe Checkout para suscribirse. Devuelve la URL a la que redirigir. */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;
  const priceKey = parsed.data.price;

  const [{ data: existing }, { data: paid }, { data: fundadorOk }] = await Promise.all([
    supabase.from('subscriptions').select('stripe_customer_id, status').eq('user_id', user.id).maybeSingle(),
    supabase.rpc('has_paid_plan'),
    priceKey === 'fundador_anual' ? supabase.rpc('fundador_eligible') : Promise.resolve({ data: true }),
  ]);

  if (paid && existing && ['trialing', 'active', 'past_due'].includes(existing.status)) {
    return NextResponse.json({ error: 'Ya tienes un plan activo. Adminístralo desde Cuenta.' }, { status: 409 });
  }
  if (!fundadorOk) {
    return NextResponse.json({ error: 'El precio Fundador ya no está disponible.' }, { status: 403 });
  }

  const origin = request.nextUrl.origin;
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: await priceIdFor(priceKey), quantity: 1 }],
      client_reference_id: user.id,
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: user.email }),
      subscription_data: {
        metadata: { user_id: user.id, price_key: priceKey },
        // La prueba gratis es sólo para quien nunca ha tenido suscripción
        ...(existing ? {} : { trial_period_days: TRIAL_DAYS }),
      },
      metadata: { user_id: user.id, price_key: priceKey },
      allow_promotion_codes: true,
      locale: 'es-419',
      success_url: `${origin}/app/planes?estado=listo`,
      cancel_url: `${origin}/app/planes`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error al crear checkout:', error);
    return NextResponse.json({ error: 'No se pudo abrir el pago. Intenta de nuevo.' }, { status: 500 });
  }
}
