'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { PLAN_REQUIRED_EVENT } from '@/lib/billing';
import { TRIAL_DAYS } from '@/lib/plans';
import { Dialog } from '@/components/ui/Dialog';
import { Button, ButtonLink } from '@/components/ui/Button';
import { BASICO_FEATURES, FeatureList } from '@/components/billing/PlanFeatures';

/** Hoja "Esto es parte de Básico": se abre cuando una ruta responde 402. */
export default function PlanGate() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setMessage(detail?.message || 'Esta función es parte del plan Básico.');
    };
    window.addEventListener(PLAN_REQUIRED_EVENT, handler);
    return () => window.removeEventListener(PLAN_REQUIRED_EVENT, handler);
  }, []);

  const close = () => setMessage(null);

  return (
    <Dialog
      open={message !== null}
      onClose={close}
      title="Esto es parte de Básico"
      description={message ?? undefined}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Ahora no
          </Button>
          <ButtonLink href="/app/planes" onClick={close} icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}>
            Ver planes
          </ButtonLink>
        </>
      }
    >
      <div className="flex flex-col gap-3 rounded-2xl bg-ground p-4">
        <FeatureList items={BASICO_FEATURES} />
        <p className="text-sm text-muted">Desde $67 al mes en el plan anual. Los primeros {TRIAL_DAYS} días son gratis.</p>
      </div>
    </Dialog>
  );
}
