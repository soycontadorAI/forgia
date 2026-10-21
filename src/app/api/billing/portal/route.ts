import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { getStripe } from '@/lib/stripe';

/** Portal de Stripe para cambiar de plan, método de pago o cancelar. */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const { data } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data?.stripe_customer_id) {
    return NextResponse.json({ error: 'No tienes una suscripción para administrar.' }, { status: 404 });
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${request.nextUrl.origin}/app/cuenta`,
      locale: 'es-419',
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error al abrir el portal:', error);
    return NextResponse.json({ error: 'No se pudo abrir la administración del plan.' }, { status: 500 });
  }
}
