import { createClient } from '@/lib/supabase/client';

/** Elimina la cuenta y todos sus datos. Deja la sesión local cerrada. */
export async function deleteAccount(): Promise<void> {
  const response = await fetch('/api/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: 'ELIMINAR' }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'No se pudo eliminar tu cuenta. Intenta de nuevo.');
  }

  // El usuario ya no existe en Auth: basta con limpiar la sesión de este navegador
  await createClient().auth.signOut({ scope: 'local' }).catch(() => {});
}
