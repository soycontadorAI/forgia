'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Crown, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getPlanState, openBillingPortal, startCheckout, type PlanState } from '@/lib/billing';
import { PRICES, TRIAL_DAYS, type PriceKey } from '@/lib/plans';
import { Card, Eyebrow } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import SegmentedButton from '@/components/ui/SegmentedButton';
import { BASICO_FEATURES, FREE_FEATURES, FeatureList } from '@/components/billing/PlanFeatures';

const BILLING_OPTIONS = ['Anual', 'Mensual'];

function formatDate(iso: string | null) {
  return iso ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(iso)) : '';
}

function subscriptionLine(state: PlanState): string {
  const sub = state.subscription;
  if (!sub) return 'Tienes acceso completo.';
  const price = sub.price_key && sub.price_key in PRICES ? PRICES[sub.price_key as PriceKey].label : 'Básico';
  if (sub.status === 'trialing' && sub.trial_end) return `${price} · prueba gratis hasta el ${formatDate(sub.trial_end)}.`;
  if (sub.cancel_at_period_end && sub.current_period_end) return `${price} · termina el ${formatDate(sub.current_period_end)}.`;
  if (sub.status === 'past_due') return `${price} · no pudimos cobrar tu último pago. Revisa tu método de pago.`;
  return sub.current_period_end ? `${price} · se renueva el ${formatDate(sub.current_period_end)}.` : price;
}

export default function PlanesPage() {
  const [state, setState] = useState<PlanState | null>(null);
  const [billing, setBilling] = useState('Anual');
  const [busy, setBusy] = useState<PriceKey | 'portal' | null>(null);
  // ?estado=listo llega al volver de Stripe Checkout. El primer render es el
  // spinner en servidor y cliente, así que leer la URL aquí no desajusta la hidratación.
  const [justSubscribed] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('estado'));

  const load = useCallback(() => getPlanState().then(setState), []);

  useEffect(() => {
    load().catch(() => toast.error('No pudimos cargar tu plan. Revisa tu conexión.'));
  }, [load]);

  // Al volver de Stripe, el webhook puede tardar unos segundos en activar el plan
  useEffect(() => {
    if (!justSubscribed) return;
    window.history.replaceState(null, '', window.location.pathname);
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      const next = await getPlanState().catch(() => null);
      if (next) setState(next);
      if (next?.paid || tries >= 10) clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [justSubscribed]);

  const checkout = async (price: PriceKey) => {
    setBusy(price);
    try {
      await startCheckout(price);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo abrir el pago.');
      setBusy(null);
    }
  };

  const portal = async () => {
    setBusy('portal');
    try {
      await openBillingPortal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo abrir la administración del plan.');
      setBusy(null);
    }
  };

  if (!state) {
    return (
      <div className="flex justify-center py-16" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
        <span className="sr-only">Cargando planes…</span>
      </div>
    );
  }

  const basicoKey: PriceKey = billing === 'Anual' ? 'basico_anual' : 'basico_mensual';
  const basico = PRICES[basicoKey];
  const trial = !state.subscription;

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-2 flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Planes</h1>
        <p className="text-sm text-muted">Entrena gratis o desbloquea todo el coach.</p>
      </header>

      {justSubscribed && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-cooldown/12 p-4 text-sm text-cooldown">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          {state.paid ? 'Listo, tu plan Básico está activo.' : 'Pago recibido. Estamos activando tu plan…'}
        </p>
      )}

      {state.paid ? (
        <Card className="flex flex-col gap-4">
          <div>
            <Eyebrow>Tu plan</Eyebrow>
            <p className="font-display text-2xl font-bold">Básico</p>
            <p className="mt-1 text-sm text-muted">{subscriptionLine(state)}</p>
          </div>
          <FeatureList items={BASICO_FEATURES} />
          {state.subscription && (
            <Button variant="secondary" onClick={portal} loading={busy === 'portal'} className="self-start">
              Administrar suscripción
            </Button>
          )}
        </Card>
      ) : (
        <>
          {state.fundadorEligible && (
            <Card className="flex flex-col gap-4 bg-linear-to-br from-accent-soft to-surface to-70% ring-1 ring-accent/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Eyebrow className="flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                    Precio Fundador
                  </Eyebrow>
                  <p className="font-display text-3xl font-bold">
                    ${PRICES.fundador_anual.amount}
                    <span className="text-base font-medium text-muted"> al año</span>
                  </p>
                  <p className="mt-1 text-sm text-muted">Todo Básico, a este precio mientras sigas suscrito. Para quienes llegaron primero.</p>
                </div>
              </div>
              <Button onClick={() => checkout('fundador_anual')} loading={busy === 'fundador_anual'} disabled={busy !== null} icon={<Crown className="h-4 w-4" aria-hidden="true" />}>
                {trial ? `Probar ${TRIAL_DAYS} días gratis` : 'Suscribirme'}
              </Button>
            </Card>
          )}

          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Eyebrow>Básico</Eyebrow>
                <p className="font-display text-3xl font-bold">
                  ${basico.amount}
                  <span className="text-base font-medium text-muted"> al {basico.interval}</span>
                </p>
                {billing === 'Anual' && <p className="text-sm text-muted">Equivale a $67 al mes · ahorras 33%</p>}
              </div>
              <div className="w-48">
                <SegmentedButton options={BILLING_OPTIONS} selected={billing} onSelect={setBilling} ariaLabel="Periodo de pago" />
              </div>
            </div>
            <FeatureList items={BASICO_FEATURES} />
            <Button
              variant={state.fundadorEligible ? 'secondary' : 'primary'}
              onClick={() => checkout(basicoKey)}
              loading={busy === basicoKey}
              disabled={busy !== null}
              icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
            >
              {trial ? `Probar ${TRIAL_DAYS} días gratis` : 'Suscribirme'}
            </Button>
          </Card>

          <Card className="flex flex-col gap-3">
            <div>
              <Eyebrow className="text-muted">Gratis</Eyebrow>
              <p className="text-sm text-muted">Lo que ya tienes sin pagar.</p>
            </div>
            <FeatureList items={FREE_FEATURES} muted />
          </Card>
        </>
      )}

      <p className="text-xs leading-relaxed text-muted">
        Precios en pesos mexicanos con IVA incluido. El pago lo procesa Stripe y se renueva solo; cancelas cuando quieras desde
        Cuenta y conservas el plan hasta el final del periodo pagado.
        {trial && ` La prueba de ${TRIAL_DAYS} días es para tu primera suscripción: si cancelas antes de que termine, no se te cobra.`}
      </p>
    </div>
  );
}
