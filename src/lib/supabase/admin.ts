import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente con la llave service_role: ignora RLS. Sólo para tareas de servidor
 * sin usuario en sesión (cron). Nunca importarlo desde código de cliente.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
