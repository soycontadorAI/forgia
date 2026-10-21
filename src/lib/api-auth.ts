import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient as createCookieClient } from '@/lib/supabase/server';
import { checkRateLimit, type RateLimitedAction, type RateLimitResult } from '@/lib/rate-limit';

const RATE_LIMIT_MESSAGES: Record<RateLimitedAction, string> = {
  generate_wod: 'Has alcanzado el límite diario de generación de WODs. Intenta de nuevo mañana.',
  generate_program: 'Has alcanzado el límite diario de generación de programas. Intenta de nuevo mañana.',
  weekly_analysis: 'Has alcanzado el límite diario de análisis. Intenta de nuevo mañana.',
  chat: 'Has alcanzado el límite diario de mensajes del Coach IA. Intenta de nuevo mañana.',
  assessment: 'Has alcanzado el límite diario de evaluaciones. Intenta de nuevo mañana.',
};

export interface AuthContext {
  user: User;
  supabase: SupabaseClient;
  rateLimit: RateLimitResult | null;
}

export type AuthResult =
  | ({ ok: true } & AuthContext)
  | { ok: false; response: NextResponse };

interface RequireUserOptions {
  rateLimit?: RateLimitedAction;
  authMessage?: string;
  /** Exige profiles.ai_consent_at: la ruta envía datos del usuario a Anthropic */
  aiConsent?: boolean;
}

export const AI_CONSENT_REQUIRED = 'ai_consent_required';

/**
 * Autentica la petición vía cookie de sesión (web) o header
 * `Authorization: Bearer <jwt>` (clientes nativos), y opcionalmente
 * aplica el rate limit diario de la acción indicada.
 */
export async function requireUser(
  request: Request,
  options: RequireUserOptions = {}
): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  let supabase: SupabaseClient;
  let user: User | null = null;

  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (!error) user = data.user;
  } else {
    supabase = await createCookieClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error) user = data.user;
  }

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: options.authMessage ?? 'No autorizado. Inicia sesión para continuar.' },
        { status: 401 }
      ),
    };
  }

  // Antes del rate limit: una petición sin permiso no consume la cuota
  if (options.aiConsent) {
    const { data: consent } = await supabase
      .from('profiles')
      .select('ai_consent_at')
      .eq('id', user.id)
      .single();
    if (!consent?.ai_consent_at) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: 'Para usar el coach con IA necesitas permitir que tus datos de entrenamiento se envíen a Anthropic.',
            code: AI_CONSENT_REQUIRED,
          },
          { status: 403 }
        ),
      };
    }
  }

  let rateLimit: RateLimitResult | null = null;
  if (options.rateLimit) {
    rateLimit = await checkRateLimit(supabase, user.id, options.rateLimit);
    if (!rateLimit.allowed) {
      return { ok: false, response: rateLimitExceededResponse(options.rateLimit, rateLimit) };
    }
  }

  return { ok: true, user, supabase, rateLimit };
}

/**
 * Respuesta 429 estándar. Exportada para rutas que aplican el rate limit
 * después de autenticar (p. ej. cuando una respuesta en caché no lo consume).
 */
export function rateLimitExceededResponse(
  action: RateLimitedAction,
  rateLimit: RateLimitResult
): NextResponse {
  return NextResponse.json(
    { error: RATE_LIMIT_MESSAGES[action], remaining: 0, limit: rateLimit.limit },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': '0',
      },
    }
  );
}

/**
 * Headers estándar de rate limit para respuestas exitosas.
 * `remaining` descuenta la petición en curso (checkRateLimit corre antes
 * de que trackUsage registre el consumo).
 */
export function rateLimitHeaders(rateLimit: RateLimitResult | null): Record<string, string> {
  if (!rateLimit) return {};
  return {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(Math.max(0, rateLimit.remaining - 1)),
  };
}
