import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/api-auth';
import { parseJsonBody } from '@/lib/api-validation';

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
