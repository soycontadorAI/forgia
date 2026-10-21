'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Flag, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Card, Eyebrow } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { getActiveProgramWithProgress, resumeProgram, type ActiveProgram, type ProgramProgress, type ResumeChoice } from '@/lib/programs';

const intensityColor: Record<string, string> = {
  baja: 'text-emerald-500',
  moderada: 'text-amber-500',
  alta: 'text-red-500',
  'muy alta': 'text-red-600',
};

/** Ruta que abre la confirmación para generar un programa nuevo. */
const NEW_PROGRAM_HREF = '/app/progreso/programa?nuevo=1';

export default function ProgramBanner() {
  const [program, setProgram] = useState<ActiveProgram | null>(null);
  const [progress, setProgress] = useState<ProgramProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ResumeChoice | null>(null);

  useEffect(() => {
    getActiveProgramWithProgress()
      .then((result) => {
        if (!result) return;
        setProgram(result.program);
        setProgress(result.progress);
      })
      .catch(() => {
        // Sin programa visible si falla: el resto de Hoy sigue funcionando
      })
      .finally(() => setLoading(false));
  }, []);

  const handleResume = async (choice: ResumeChoice) => {
    if (!program || !progress) return;
    setSaving(choice);
    try {
      await resumeProgram(program, progress, choice);
      const refreshed = await getActiveProgramWithProgress();
      if (refreshed) {
        setProgram(refreshed.program);
        setProgress(refreshed.progress);
      }
    } catch {
      toast.error('No se pudo actualizar tu programa. Intenta de nuevo.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return null;

  if (!program || !progress) {
    return (
      <Link
        href="/app/progreso/programa"
        className="group mb-6 flex items-center justify-between gap-3 rounded-3xl border border-dashed border-line p-4 transition-colors hover:border-accent"
      >
        <span className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-muted transition-colors group-hover:text-accent" aria-hidden="true" />
          <span className="text-sm font-medium text-muted transition-colors group-hover:text-accent">
            Genera tu programa de 4 semanas
          </span>
        </span>
        <ArrowRight className="h-4 w-4 text-muted transition-colors group-hover:text-accent" aria-hidden="true" />
      </Link>
    );
  }

  const week = program.weeks.find((w) => w.number === progress.weekNumber);
  const session = week?.sessions[progress.sessionIndex];
  const percent = progress.totalSessions > 0 ? Math.round((progress.totalCompleted / progress.totalSessions) * 100) : 0;

  if (progress.finished) {
    return (
      <Card className="mb-6">
        <Eyebrow className="flex items-center gap-1.5">
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          Programa completo
        </Eyebrow>
        <p className="mt-1 font-display text-lg font-semibold text-fg">
          Terminaste las {progress.totalSessions} sesiones.
        </p>
        <p className="mt-1 text-sm text-muted">
          Genera el siguiente bloque para seguir progresando con base en lo que ya entrenaste.
        </p>
        <ButtonLink href={NEW_PROGRAM_HREF} size="sm" className="mt-4" icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}>
          Generar siguiente programa
        </ButtonLink>
      </Card>
    );
  }

  if (progress.needsResume) {
    const days = progress.daysSinceLastSession;
    return (
      <Card className="mb-6" role="region" aria-labelledby="resume-title">
        <Eyebrow>Semana {progress.weekNumber} · Sesión {progress.sessionIndex + 1}</Eyebrow>
        <p id="resume-title" className="mt-1 font-display text-lg font-semibold text-fg">
          {progress.lastSessionAt && progress.lastSessionAt > program.started_at
            ? `Llevas ${days} días sin entrenar. ¿Cómo retomamos?`
            : `Tu programa empezó hace ${days} días. ¿Cómo arrancamos?`}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button
            size="sm"
            loading={saving === 'continue'}
            disabled={saving !== null}
            onClick={() => handleResume('continue')}
            icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          >
            Seguir donde me quedé
          </Button>
          {progress.sessionIndex > 0 && (
            <Button
              variant="secondary"
              size="sm"
              loading={saving === 'repeat_week'}
              disabled={saving !== null}
              onClick={() => handleResume('repeat_week')}
              icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
            >
              Repetir la semana
            </Button>
          )}
          <ButtonLink
            href={NEW_PROGRAM_HREF}
            variant="secondary"
            size="sm"
            aria-disabled={saving !== null || undefined}
            icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
          >
            Programa nuevo
          </ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <Link
      href="/app/progreso/programa"
      className="group mb-6 block rounded-3xl bg-surface p-4 transition-colors hover:bg-raised sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Eyebrow className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Semana {progress.weekNumber}
            {week?.focus && <> · {week.focus}</>}
          </Eyebrow>
          {session && (
            <p className="mt-1 truncate text-sm font-medium text-fg">
              Sesión {progress.sessionIndex + 1}/{week?.sessions.length}: {session.type} — {session.emphasis}
            </p>
          )}
          {week && (
            <p className="mt-0.5 text-xs text-muted">
              Skill: {week.skillFocus}
              {session && (
                <> · Intensidad: <span className={intensityColor[session.intensity] ?? ''}>{session.intensity}</span></>
              )}
            </p>
          )}
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-fg" aria-hidden="true" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.totalSessions}
          aria-valuenow={progress.totalCompleted}
          aria-label="Avance del programa"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <span className="font-mono text-xs text-muted">
          {progress.totalCompleted}/{progress.totalSessions}
        </span>
      </div>
    </Link>
  );
}
