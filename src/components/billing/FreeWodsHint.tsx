'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getFreeWodsLeft, getPlanState } from '@/lib/billing';
import { FREE_WEEKLY_WODS } from '@/lib/plans';

/** "Te quedan N de 2 WODs gratis esta semana" bajo el botón de generar (sólo sin plan). */
export default function FreeWodsHint({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // El uso se registra justo después de responder: se espera un momento
    const timer = setTimeout(async () => {
      const plan = await getPlanState().catch(() => null);
      if (cancelled || !plan || plan.paid) return;
      const remaining = await getFreeWodsLeft(user.id).catch(() => null);
      if (!cancelled) setLeft(remaining);
    }, refreshKey === 0 ? 0 : 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user, refreshKey]);

  if (left === null) return null;

  return (
    <p className="text-center text-xs text-muted">
      {left > 0
        ? `Te ${left === 1 ? 'queda 1' : `quedan ${left}`} de ${FREE_WEEKLY_WODS} WODs gratis esta semana.`
        : 'Ya usaste tus WODs gratis de esta semana.'}{' '}
      <Link href="/app/planes" className="text-accent underline underline-offset-2">
        Ilimitados con Básico
      </Link>
    </p>
  );
}
