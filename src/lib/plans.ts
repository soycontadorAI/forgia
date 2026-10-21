// Planes de Forgia. Precios en MXN con IVA incluido; deben coincidir con los
// precios de Stripe (lookup_key) de la cuenta Forgia.

export type PriceKey = 'basico_mensual' | 'basico_anual' | 'fundador_anual';

export const PRICE_KEYS: PriceKey[] = ['basico_mensual', 'basico_anual', 'fundador_anual'];

export const PRICES: Record<PriceKey, { label: string; amount: number; interval: 'mes' | 'año' }> = {
  basico_mensual: { label: 'Básico mensual', amount: 99, interval: 'mes' },
  basico_anual: { label: 'Básico anual', amount: 799, interval: 'año' },
  fundador_anual: { label: 'Fundador anual', amount: 649, interval: 'año' },
};

/** WODs con IA por semana (lunes a domingo, hora de México) sin plan de pago. */
export const FREE_WEEKLY_WODS = 2;

export const TRIAL_DAYS = 7;

export const PLAN_REQUIRED = 'plan_required';

export function isPriceKey(value: unknown): value is PriceKey {
  return typeof value === 'string' && (PRICE_KEYS as string[]).includes(value);
}

/** Lunes 00:00 de la semana en curso en la Ciudad de México, como instante UTC. */
export function startOfWeekMexico(now = new Date()): Date {
  // México no tiene horario de verano desde 2022: UTC-6 todo el año
  const local = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const day = local.getUTCDay();
  local.setUTCDate(local.getUTCDate() + (day === 0 ? -6 : 1 - day));
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + 6 * 60 * 60 * 1000);
}
