import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/api-auth';
import { parseJsonBody } from '@/lib/api-validation';
import { getStripe } from '@/lib/stripe';

const deleteAccountBodySchema = z.object({
  // Confirmación explícita: evita borrar la cuenta con una petición accidental
  confirm: z.literal('ELIMINAR'),
});

/**
 * Elimina la cuenta del usuario de la sesión y todos sus datos (cascada desde
 * auth.users en la función delete_own_account). Funciona con cookie (web) o
 * Bearer (app nativa).
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const parsed = await parseJsonBody(request, deleteAccountBodySchema);
  if (!parsed.ok) return parsed.response;

  // Una suscripción de Stripe seguiría cobrando aunque la cuenta ya no exista
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (subscription?.stripe_subscription_id && ['trialing', 'active', 'past_due', 'unpaid'].includes(subscription.status)) {
    try {
      await getStripe().subscriptions.cancel(subscription.stripe_subscription_id);
    } catch (error) {
      console.error('Error al cancelar la suscripción antes de eliminar la cuenta:', user.id, error);
      return NextResponse.json(
        { error: 'No se pudo cancelar tu suscripción. Intenta de nuevo o escríbenos.' },
        { status: 500 }
      );
    }
  }

  const { error } = await supabase.rpc('delete_own_account');
  if (error) {
    console.error('Error al eliminar cuenta:', user.id, error.message);
    return NextResponse.json(
      { error: 'No se pudo eliminar tu cuenta. Intenta de nuevo o escríbenos.' },
      { status: 500 }
    );
  }

  // La sesión ya no apunta a un usuario: se limpian las cookies. Puede fallar
  // del lado de Auth porque el usuario ya no existe; no cambia el resultado.
  await supabase.auth.signOut().catch(() => {});

  return NextResponse.json({ deleted: true });
}
