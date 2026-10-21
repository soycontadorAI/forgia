import Stripe from 'stripe';
import type { PriceKey } from '@/lib/plans';

// Servidor solamente. La cuenta de Stripe es la de Forgia (MXN).

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Falta STRIPE_SECRET_KEY');
  client ??= new Stripe(key);
  return client;
}

const priceIds = new Map<PriceKey, string>();

/** ID del precio activo con ese lookup_key (se cachea por instancia). */
export async function priceIdFor(key: PriceKey): Promise<string> {
  const cached = priceIds.get(key);
  if (cached) return cached;
  const { data } = await getStripe().prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (!data[0]) throw new Error(`No hay precio activo con lookup_key ${key}`);
  priceIds.set(key, data[0].id);
  return data[0].id;
}
