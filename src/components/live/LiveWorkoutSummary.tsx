import { useEffect, useCallback, useId } from 'react';
import confetti from 'canvas-confetti';
import { CircleCheckBig } from 'lucide-react';
import type { Wod, WodSectionKey } from '@/types/wod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cx } from '@/lib/cx';
import { SECTION_LABELS, SECTION_ORDER, SECTION_STYLES, formatClock } from './live-utils';

// Canvas propio sin Web Worker: la CSP (script-src) bloquea los workers blob:
// que usa la instancia global de canvas-confetti
let confettiInstance: confetti.CreateTypes | null = null;
function fireBurst(options: confetti.Options) {
  confettiInstance ??= confetti.create(undefined, { resize: true, useWorker: false, disableForReducedMotion: true });
  confettiInstance(options);
}

interface LiveWorkoutSummaryProps {
  wod: Wod;
  sectionTimes: Partial<Record<WodSectionKey, number>>;
  totalTimeSeconds: number;
  /** Resultado del metcon contado en vivo, ej. "7 rondas + 5 reps" */
  metconScore?: string | null;
  onContinue: () => void;
  onDiscard: () => void;
}

const LiveWorkoutSummary: React.FC<LiveWorkoutSummaryProps> = ({
  wod,
  sectionTimes,
  totalTimeSeconds,
  metconScore,
  onContinue,
  onDiscard,
}) => {
  const headingId = useId();

  const fireConfetti = useCallback(() => {
    const end = Date.now() + 600;
    const frame = () => {
      fireBurst({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 } });
      fireBurst({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  // Confeti al terminar el entrenamiento
  useEffect(() => {
    fireConfetti();
  }, [fireConfetti]);

  const handleContinue = () => {
    fireConfetti();
    setTimeout(onContinue, 700);
  };

  const completed = SECTION_ORDER.filter((key) => sectionTimes[key] !== undefined);

  return (
    <section
      aria-labelledby={headingId}
      className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-4 pt-[max(2rem,calc(env(safe-area-inset-top)+1rem))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-cooldown/15 text-cooldown">
          <CircleCheckBig className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 id={headingId} className="mt-2 font-display text-3xl font-bold tracking-tight text-fg">
          Entrenamiento completado
        </h1>
        <p className="text-sm text-muted">{wod.title}</p>
      </div>

      <Card className="flex flex-col items-center gap-1 py-6 text-center">
        <span className="text-sm text-muted">Tiempo total</span>
        <span className="font-display text-6xl leading-none font-bold tracking-[-0.04em] text-fg tabular-nums">
          {formatClock(totalTimeSeconds)}
        </span>
        {metconScore && (
          <span className="mt-3 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent">
            Metcon: {metconScore}
          </span>
        )}
      </Card>

      {completed.length > 0 && (
        <dl className="grid grid-cols-2 gap-2">
          {completed.map((key) => (
            <div key={key} className="flex flex-col-reverse gap-1 rounded-[18px] bg-surface p-3.5">
              <dt className="flex items-center gap-2 text-xs text-muted">
                <span className={cx('size-2 shrink-0 rounded-full', SECTION_STYLES[key].solid)} aria-hidden="true" />
                {SECTION_LABELS[key]}
              </dt>
              <dd className="font-display text-2xl font-bold text-fg tabular-nums">{formatClock(sectionTimes[key] ?? 0)}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <Button size="lg" fullWidth onClick={handleContinue}>
          Registrar resultado
        </Button>
        <Button variant="secondary" fullWidth onClick={onDiscard}>
          Descartar entrenamiento
        </Button>
      </div>
    </section>
  );
};

export default LiveWorkoutSummary;
