import type { Metadata } from 'next';
import AppShell from './AppShell';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/profile';

export const metadata: Metadata = {
  title: {
    template: '%s | Forgia',
    default: 'Forgia',
  },
};

/**
 * Lee el perfil en el servidor para que la app pinte sin esperar el
 * round trip de auth + perfil en el cliente. `undefined` = no se pudo leer
 * y el cliente lo carga como antes; `null` = el usuario aún no tiene perfil.
 */
async function getInitialProfile(): Promise<Profile | null | undefined> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (!userId) return undefined;

    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) return undefined;
    return (profile as Profile | null) ?? null;
  } catch {
    return undefined;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const initialProfile = await getInitialProfile();
  return <AppShell initialProfile={initialProfile}>{children}</AppShell>;
}
