'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getWeekConsistency, RESULT_SAVED_EVENT, type WeekConsistency } from '@/lib/consistency';
import { Card, Eyebrow } from '@/components/ui/Card';
import { cx } from '@/lib/cx';

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function statusMessage(w: WeekConsistency): string {
  const missing = w.goal - w.daysThisWeek;
  if (missing <= 0) {
    return w.streakWeeks > 1
      ? `Meta cumplida. Llevas ${w.streakWeeks} semanas seguidas.`
      : 'Meta de la semana cumplida.';
  }
  if (w.trainedToday) return `Hoy ya entrenaste. Te ${missing === 1 ? 'falta' : 'faltan'} ${plural(missing, 'día', 'días')} esta semana.`;
  if (missing > w.daysLeft) return 'Esta semana ya no alcanza para la meta, pero entrenar hoy igual suma.';
  return `Hoy no has entrenado. Te ${missing === 1 ? 'falta' : 'faltan'} ${plural(missing, 'día', 'días')} y ${w.daysLeft === 1 ? 'queda' : 'quedan'} ${plural(w.daysLeft, 'día', 'días')}.`;
}

/** Meta semanal (días con resultado registrado) y racha de semanas cumplidas. */
export default function WeekStrip() {
  const { user, profile } = useAuth();
  const [week, setWeek] = useState<WeekConsistency | null>(null);
  const goal = profile?.training_frequency ?? null;

  const load = useCallback(() => {
    if (!user) return;
    getWeekConsistency(user.id, goal)
      .then(setWeek)
      .catch(() => {
        // Sin la tira de la semana si falla: el resto de Hoy sigue funcionando
      });
  }, [user, goal]);

  useEffect(() => {
    load();
    window.addEventListener(RESULT_SAVED_EVENT, load);
    return () => window.removeEventListener(RESULT_SAVED_EVENT, load);
  }, [load]);

  if (!week) return null;

  const met = week.daysThisWeek >= week.goal;

  return (
    <Card className="mb-6 flex flex-col gap-4" role="region" aria-labelledby="week-strip-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow id="week-strip-title">Tu semana</Eyebrow>
          <p className="font-display text-2xl font-bold tracking-tight">
            {week.daysThisWeek}
            <span className="text-muted"> de {week.goal} días</span>
          </p>
        </div>
        {week.streakWeeks > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {plural(week.streakWeeks, 'semana', 'semanas')}
          </span>
        )}
      </div>

      <ol className="grid grid-cols-7 gap-1.5" aria-label="Días de esta semana">
        {week.days.map((done, i) => {
          const isToday = i === week.todayIndex;
          const isFuture = i > week.todayIndex;
          return (
            <li key={i} className="flex flex-col items-center gap-1.5">
              <span
                className={cx(
                  'flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold',
                  done ? 'bg-accent-solid text-on-accent' : isToday ? 'border-2 border-accent text-accent' : 'bg-raised text-muted',
                  isFuture && !done && 'opacity-50'
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : DAY_LABELS[i]}
              </span>
              <span className="sr-only">
                {DAY_NAMES[i]}
                {isToday ? ' (hoy)' : ''}: {done ? 'entrenaste' : isFuture ? 'pendiente' : 'sin entrenar'}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cx('text-sm', met ? 'text-cooldown' : 'text-muted')} role="status">
          {statusMessage(week)}
        </p>
        <Link href="/app/perfil" className="text-xs text-muted underline underline-offset-2 hover:text-fg">
          Cambiar meta
        </Link>
      </div>
    </Card>
  );
}
