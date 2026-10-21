import { createClient } from '@/lib/supabase/client';
import { FREE_WEEKLY_WODS, startOfWeekMexico, type PriceKey } from '@/lib/plans';

export interface MySubscription {
  status: string;
  price_key: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
}

export interface PlanState {
  paid: boolean;
  fundadorEligible: boolean;
  subscription: MySubscription | null;
}

/** La API respondió 402: la función es del plan Básico. */
export class PlanRequiredError extends Error {}

/** Evento que abre la hoja "Esto es parte de Básico" (la escucha PlanGate). */
export const PLAN_REQUIRED_EVENT = 'forgia:plan-required';

export function requestPlan(message?: string) {
  window.dispatchEvent(new CustomEvent(PLAN_REQUIRED_EVENT, { detail: { message } }));
}

export async function getPlanState(): Promise<PlanState> {
  const supabase = createClient();
  const [paid, fundador, sub] = await Promise.all([
    supabase.rpc('has_paid_plan'),
    supabase.rpc('fundador_eligible'),
    supabase
      .from('subscriptions')
      .select('status, price_key, current_period_end, trial_end, cancel_at_period_end')
      .maybeSingle(),
  ]);
  return {
    paid: Boolean(paid.data),
    fundadorEligible: Boolean(fundador.data),
    subscription: (sub.data as MySubscription | null) ?? null,
  };
}

/** WODs con IA que le quedan esta semana a un usuario sin plan. */
export async function getFreeWodsLeft(userId: string): Promise<number> {
  const { count } = await createClient()
    .from('usage_tracking')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'generate_wod')
    .gte('created_at', startOfWeekMexico().toISOString());
  return Math.max(0, FREE_WEEKLY_WODS - (count ?? 0));
}

async function redirectFrom(path: string, body?: unknown): Promise<void> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) throw new Error(data.error || 'No se pudo continuar. Intenta de nuevo.');
  window.location.href = data.url;
}

export function startCheckout(price: PriceKey) {
  return redirectFrom('/api/billing/checkout', { price });
}

export function openBillingPortal() {
  return redirectFrom('/api/billing/portal');
}
