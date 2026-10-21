'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { CalendarRange, Check, ChevronDown, RefreshCw } from 'lucide-react';
import type { ProgramWeek, ProgramSession } from '@/types/program';
import { getActiveProgramWithProgress, type ActiveProgram, type ProgramProgress } from '@/lib/programs';
import { generateProgram } from '@/lib/ai-client';
import Spinner from '@/components/Spinner';
import LevelAssessmentCard from '@/components/LevelAssessmentCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { cx } from '@/lib/cx';

// Lo que de verdad pasa mientras se genera el programa
const GENERATING_MESSAGES = [
  'Revisando tu nivel, objetivos y frecuencia',
  'Repartiendo volumen e intensidad en 4 semanas',
  'Eligiendo el skill de cada semana',
  'Ajustando la semana de deload',
];

const INTENSITY_STYLE: Record<string, string> = {
  baja: 'bg-cooldown/12 text-cooldown',
  moderada: 'bg-warmup/12 text-warmup',
  alta: 'bg-metcon/12 text-metcon',
  'muy alta': 'bg-accent-solid text-on-accent',
};

// Altura relativa de la intensidad planeada por semana (base, volumen, intensidad, deload)
const CURVE_Y = [56, 36, 14, 70];

function MesocycleCard({ weeks, currentWeek }: { weeks: ProgramWeek[]; currentWeek: number }) {
  const W = 320;
  const xs = weeks.map((_, i) => 30 + (i * (W - 60)) / Math.max(1, weeks.length - 1));
  const points = weeks.map((_, i) => `${xs[i]},${CURVE_Y[i] ?? 40}`).join(' ');

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold">Mesociclo de 4 semanas</h2>
      <svg viewBox={`0 0 ${W} 86`} className="h-20 w-full" role="img" aria-label={`Intensidad planeada: ${weeks.map((w) => `semana ${w.number}, ${w.focus}`).join('; ')}. Semana actual: ${currentWeek}.`}>
        <polyline points={points} fill="none" className="stroke-line" strokeWidth="2" strokeDasharray="4 4" />
        {weeks.map((w, i) => {
          const isCurrent = w.number === currentWeek;
          const isPast = w.number < currentWeek;
          return (
            <circle
              key={w.number}
              cx={xs[i]}
              cy={CURVE_Y[i] ?? 40}
              r={isCurrent ? 8 : 6}
              strokeWidth={isCurrent ? 5 : 2}
              className={cx(isCurrent ? 'fill-accent-solid stroke-accent-soft' : isPast ? 'fill-muted stroke-muted' : 'fill-raised stroke-line')}
            />
          );
        })}
      </svg>
      <div className="grid gap-1 text-center" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
        {weeks.map((w) => (
          <div key={w.number} className="flex flex-col">
            <span className={cx('text-xs', w.number === currentWeek ? 'text-accent' : 'text-muted')}>
              Sem {w.number}
              {w.number === currentWeek ? ' · actual' : ''}
            </span>
            <span className={cx('truncate text-[13px]', w.number === currentWeek ? 'font-semibold' : 'text-muted')}>{w.focus}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SessionRow({ session, isCompleted, isCurrent }: { session: ProgramSession; isCompleted: boolean; isCurrent: boolean }) {
  return (
    <li className={cx('flex min-h-14 items-center gap-3 border-b border-line py-2 last:border-b-0', isCompleted && 'opacity-60')}>
      <span
        className={cx(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          isCompleted ? 'bg-cooldown/15 text-cooldown' : isCurrent ? 'border-2 border-accent text-accent' : 'bg-raised text-muted'
        )}
      >
        {isCompleted ? <Check className="h-4 w-4" aria-label="Hecha" /> : session.order}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx('text-[15px]', isCurrent && 'font-semibold')}>{session.type}</span>
          <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', INTENSITY_STYLE[session.intensity] ?? 'bg-raised text-muted')}>
            {session.intensity}
          </span>
          {isCurrent && <span className="text-xs text-accent">Siguiente</span>}
        </div>
        <p className="truncate text-xs text-muted">{session.emphasis}</p>
      </div>
    </li>
  );
}

function WeekCard({ week, isCurrentWeek, completedSessions }: { week: ProgramWeek; isCurrentWeek: boolean; completedSessions: number }) {
  const [expanded, setExpanded] = useState(isCurrentWeek);
  const panelId = `semana-${week.number}`;

  return (
    <Card padding="none" className={cx('overflow-hidden', isCurrentWeek && 'ring-1 ring-accent/30')}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-raised/50"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold">Semana {week.number}</span>
            <span className="text-sm text-muted">· {week.focus}</span>
            {isCurrentWeek && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">Actual</span>}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">Skill: {week.skillFocus}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {(isCurrentWeek || completedSessions > 0) && (
            <span className="font-mono text-xs text-muted">
              {Math.min(completedSessions, week.sessions.length)}/{week.sessions.length}
            </span>
          )}
          <ChevronDown className={cx('h-4 w-4 text-muted transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
        </div>
      </button>

      {expanded && (
        <ul id={panelId} className="px-4 pb-2">
          {week.sessions.map((session) => (
            <SessionRow
              key={session.order}
              session={session}
              isCompleted={session.order <= completedSessions}
              isCurrent={isCurrentWeek && session.order === completedSessions + 1}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Sesiones completadas de cada semana según la posición en el programa. */
function completedInWeek(week: ProgramWeek, progress: ProgramProgress) {
  if (progress.finished || week.number < progress.weekNumber) return week.sessions.length;
  return week.number === progress.weekNumber ? progress.sessionIndex : 0;
}

export default function ProgramaPage() {
  const [program, setProgram] = useState<ActiveProgram | null>(null);
  const [progress, setProgress] = useState<ProgramProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const loadProgram = useCallback(async () => {
    const result = await getActiveProgramWithProgress();
    setProgram(result?.program ?? null);
    setProgress(result?.progress ?? null);
    return result;
  }, []);

  useEffect(() => {
    loadProgram()
      .then((result) => {
        // "Programa nuevo" desde Hoy llega con ?nuevo=1: se confirma aquí antes de reemplazarlo
        const params = new URLSearchParams(window.location.search);
        if (params.has('nuevo')) {
          window.history.replaceState(null, '', window.location.pathname);
          if (result) setConfirmRegenerate(true);
        }
      })
      .catch(() => toast.error('No pudimos cargar tu programa. Revisa tu conexión.'))
      .finally(() => setLoading(false));
  }, [loadProgram]);

  useEffect(() => {
    if (!generating) {
      setMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex((prev) => Math.min(prev + 1, GENERATING_MESSAGES.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [generating]);

  const handleGenerate = useCallback(async () => {
    setConfirmRegenerate(false);
    setGenerating(true);
    try {
      await generateProgram();
      await loadProgram();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar el programa.');
    } finally {
      setGenerating(false);
    }
  }, [loadProgram]);

  const startedLabel = program
    ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(new Date(program.started_at))
    : null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {program && progress
            ? `Desde el ${startedLabel} · ${progress.totalCompleted} de ${progress.totalSessions} sesiones`
            : 'Programa de 4 semanas'}
        </p>
        {program && !generating && (
          <Button variant="secondary" size="sm" onClick={() => setConfirmRegenerate(true)} icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}>
            Regenerar
          </Button>
        )}
      </div>

      {generating && (
        <Card className="flex flex-col items-center gap-3 py-12 text-center" role="status">
          <Spinner />
          <p className="text-sm text-muted">{GENERATING_MESSAGES[messageIndex]}…</p>
        </Card>
      )}

      {!generating && !program && (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <CalendarRange className="h-10 w-10 text-muted" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold">Sin programa activo</h2>
          <p className="max-w-sm text-sm text-muted">
            Genera tu mesociclo de 4 semanas: base, volumen, intensidad y deload. Avanzas cada vez que registras un resultado, sin importar qué día sea.
          </p>
          <Button onClick={handleGenerate} icon={<CalendarRange className="h-4 w-4" aria-hidden="true" />}>
            Generar programa
          </Button>
        </Card>
      )}

      {!generating && program && progress && (
        <>
          <MesocycleCard weeks={program.weeks} currentWeek={progress.weekNumber} />
          {program.weeks.map((week) => (
            <WeekCard
              key={week.number}
              week={week}
              isCurrentWeek={!progress.finished && week.number === progress.weekNumber}
              completedSessions={completedInWeek(week, progress)}
            />
          ))}
        </>
      )}

      <LevelAssessmentCard />

      <ConfirmDialog
        open={confirmRegenerate}
        onClose={() => setConfirmRegenerate(false)}
        onConfirm={handleGenerate}
        title="¿Regenerar el programa?"
        description="Empiezas un programa nuevo desde la sesión 1. Tus WODs y resultados no se borran."
        confirmLabel="Regenerar"
      />
    </div>
  );
}
