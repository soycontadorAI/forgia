'use client';

import { useEffect, useState } from 'react';
import { Crown, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { getPlanState, openBillingPortal, type PlanState } from '@/lib/billing';
import { FREE_WEEKLY_WODS, PRICES, type PriceKey } from '@/lib/plans';
import { Button, ButtonLink } from '@/components/ui/Button';

/** Plan actual en Cuenta: Gratis con enlace a Planes, o Básico con el portal de Stripe. */
export default function CurrentPlan() {
  const [state, setState] = useState<PlanState | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    getPlanState().then(setState).catch(() => {});
  }, []);

  if (!state) return <div className="h-16 rounded-2xl bg-ground motion-safe:animate-pulse" aria-hidden="true" />;

  const sub = state.subscription;
  const priceLabel = sub?.price_key && sub.price_key in PRICES ? PRICES[sub.price_key as PriceKey].label : null;

  const portal = async () => {
    setOpening(true);
    try {
      await openBillingPortal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo abrir la administración del plan.');
      setOpening(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft">
          {state.paid ? <Crown className="h-5 w-5 text-accent" aria-hidden="true" /> : <Zap className="h-5 w-5 text-accent" aria-hidden="true" />}
        </span>
        <div className="flex flex-col">
          <span className="font-display text-base font-semibold">{state.paid ? priceLabel ?? 'Básico' : 'Gratis'}</span>
          <span className="text-sm text-muted">
            {state.paid
              ? sub?.status === 'trialing'
                ? 'En prueba gratis.'
                : sub?.cancel_at_period_end
                  ? 'Cancelado: sigue activo hasta el final del periodo.'
                  : 'WODs ilimitados, programa, Coach y análisis semanal.'
              : `${FREE_WEEKLY_WODS} WODs con IA por semana.`}
          </span>
        </div>
      </div>
      {state.paid ? (
        sub && (
          <Button variant="secondary" onClick={portal} loading={opening} className="shrink-0">
            Administrar suscripción
          </Button>
        )
      ) : (
        <ButtonLink href="/app/planes" className="shrink-0">
          Ver planes
        </ButtonLink>
      )}
    </div>
  );
}
