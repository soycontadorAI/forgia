'use client';

import { useState, useEffect, useId } from 'react';
import { toast } from 'sonner';
import { AlertCircle, X } from 'lucide-react';
import type { Wod, WorkoutFeedback, WorkoutFeedbackInput, RxOrScaled } from '@/types/wod';
import type { LiveWorkoutResult } from '@/components/live/LiveWorkoutOverlay';
import { useModalFocus } from '@/components/live/useModalFocus';
import { saveFeedback } from '@/lib/wods';
import { Button, IconButton } from '@/components/ui/Button';
import { TextField, TextAreaField } from '@/components/ui/Field';
import { cx } from '@/lib/cx';
import { trackFeedbackSubmitted } from '@/lib/analytics';

interface WorkoutFeedbackFormProps {
  wod: Wod;
  wodId?: string | null;
  userId: string;
  onSaved: (feedback: WorkoutFeedback) => void;
  onClose: () => void;
  initialTotalTime?: number | null;
  /** Datos de la sesión en vivo (timestamps reales y tiempos por sección) */
  session?: LiveWorkoutResult | null;
}

const difficultyLabels: Record<number, string> = {
  1: 'Muy fácil',
  2: 'Fácil',
  3: 'Fácil',
  4: 'Moderado',
  5: 'Moderado',
  6: 'Moderado',
  7: 'Difícil',
  8: 'Difícil',
  9: 'Brutal',
  10: 'Brutal',
};

const DIFFICULTY_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const RX_OPTIONS: { value: RxOrScaled; hint: string }[] = [
  { value: 'Rx', hint: 'Pesos y movimientos como se escribieron' },
  { value: 'Scaled', hint: 'Con ajustes de carga o movimientos' },
];

/** Opción de radio con el input nativo oculto y un área táctil de 48px. */
const OPTION_INPUT = 'peer sr-only';
const OPTION_FACE = cx(
  'flex w-full cursor-pointer items-center justify-center rounded-2xl border border-line bg-surface text-fg transition-colors',
  'hover:bg-raised',
  'peer-checked:border-transparent peer-checked:bg-accent-solid peer-checked:text-on-accent peer-checked:hover:bg-accent-solid',
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-flare'
);

export default function WorkoutFeedbackForm({ wod, wodId, userId, onSaved, onClose, initialTotalTime, session }: WorkoutFeedbackFormProps) {
  const [difficulty, setDifficulty] = useState(5);
  const [totalTime, setTotalTime] = useState(initialTotalTime ? String(Math.round(initialTotalTime)) : '');
  const [rxOrScaled, setRxOrScaled] = useState<RxOrScaled>('Rx');
  const [notes, setNotes] = useState(() => (session?.metconScore ? `Resultado del metcon: ${session.metconScore}` : ''));
  const [isSaving, setIsSaving] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const titleId = useId();
  const difficultyName = useId();
  const rxName = useId();
  const rootRef = useModalFocus<HTMLDivElement>(onClose);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const minutes = totalTime ? parseInt(totalTime, 10) : null;
    if (minutes !== null && (Number.isNaN(minutes) || minutes < 1 || minutes > 180)) {
      setTimeError('Escribe un tiempo entre 1 y 180 minutos, o déjalo vacío.');
      return;
    }
    setTimeError(null);
    setSaveError(null);

    setIsSaving(true);
    try {
      const input: WorkoutFeedbackInput = {
        wod_id: wodId ?? null,
        wod_snapshot: wod,
        difficulty_rating: difficulty,
        total_time_minutes: minutes,
        rx_or_scaled: rxOrScaled,
        notes: notes.trim() || null,
        started_at: session?.startedAt ?? null,
        ended_at: session?.endedAt ?? null,
        section_times:
          session && Object.keys(session.sectionTimes).length > 0
            ? session.sectionTimes
            : null,
      };

      const saved = await saveFeedback(userId, input);
      trackFeedbackSubmitted(difficulty, rxOrScaled);
      toast.success('Resultado registrado correctamente.');
      onSaved(saved);
    } catch (err) {
      console.error('Error saving feedback:', err);
      setSaveError('No se pudo guardar el resultado. Revisa tu conexión e inténtalo de nuevo; tus datos siguen aquí.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ground text-fg outline-none"
    >
      <header className="sticky top-0 z-10 shrink-0 bg-ground/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-2xl font-bold tracking-tight">
              Registrar resultado
            </h2>
            <p className="truncate text-sm text-muted">{wod.title}</p>
          </div>
          <IconButton label="Cerrar" variant="secondary" onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-7 px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        {/* Dificultad: grupo de radios 1–10 */}
        <fieldset>
          {/* float: la leyenda se comporta como bloque normal y cabe el valor a la derecha */}
          <legend className="float-left mb-3 flex w-full items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-fg">Dificultad percibida</span>
            <span className="font-semibold text-accent" aria-hidden="true">
              {difficulty}/10 · {difficultyLabels[difficulty]}
            </span>
          </legend>
          <div className="clear-both grid grid-cols-5 gap-2">
            {DIFFICULTY_VALUES.map((value) => (
              <label key={value} className="relative">
                <input
                  type="radio"
                  name={difficultyName}
                  value={value}
                  checked={difficulty === value}
                  onChange={() => setDifficulty(value)}
                  aria-label={`${value} de 10, ${difficultyLabels[value]}`}
                  className={OPTION_INPUT}
                />
                <span className={cx(OPTION_FACE, 'h-12 font-display text-lg font-semibold tabular-nums')} aria-hidden="true">
                  {value}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted" aria-hidden="true">
            <span>Fácil</span>
            <span>Moderado</span>
            <span>Brutal</span>
          </div>
        </fieldset>

        {/* Modalidad: Rx o Scaled */}
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-fg">Modalidad</legend>
          <div className="grid grid-cols-2 gap-2">
            {RX_OPTIONS.map((option) => (
              <label key={option.value} className="relative">
                <input
                  type="radio"
                  name={rxName}
                  value={option.value}
                  checked={rxOrScaled === option.value}
                  onChange={() => setRxOrScaled(option.value)}
                  className={OPTION_INPUT}
                />
                <span className={cx(OPTION_FACE, 'min-h-12 flex-col gap-0.5 px-3 py-2.5')}>
                  <span className="font-display text-base font-semibold">{option.value}</span>
                  <span className="text-center text-xs leading-snug opacity-80">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <TextField
          label="Tiempo total (min)"
          hint="Opcional"
          type="number"
          inputMode="numeric"
          min={1}
          max={180}
          value={totalTime}
          onChange={(e) => {
            setTotalTime(e.target.value);
            if (timeError) setTimeError(null);
          }}
          placeholder="Ej: 45"
          error={timeError ?? undefined}
        />

        <TextAreaField
          label="Notas"
          hint="Opcional. Cómo te sentiste, qué escalaste, cargas usadas."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: Me costaron mucho los pull-ups, tuve que escalar a ring rows..."
          rows={4}
        />

        <div className="mt-auto flex flex-col gap-3">
          {saveError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-fg">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <p>{saveError}</p>
            </div>
          )}
          <Button type="submit" size="lg" fullWidth loading={isSaving}>
            {isSaving ? 'Guardando…' : saveError ? 'Reintentar' : 'Guardar resultado'}
          </Button>
        </div>
      </form>
    </div>
  );
}
