import { useId } from 'react';
import { cx } from '@/lib/cx';
import { formatClock } from './live-utils';

const RADIUS = 120;
const STROKE = 14;
const VIEWBOX = 2 * RADIUS + 2 * STROKE + 2; // 270
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface LiveTimerDisplayProps {
  /** Segundos que muestra el reloj (restantes o transcurridos según el modo) */
  seconds: number;
  /** Texto del reloj; por defecto `seconds` formateado */
  display?: string;
  /** Fracción del anillo 0–1; `null` deja solo la pista */
  progress: number | null;
  /** Colores del anillo (variables CSS), de inicio a fin del degradado */
  colors: [string, string];
  /** Línea bajo el reloj, ej. "restantes de 14:00" */
  caption?: string | null;
  /** Últimos segundos de un intervalo: el reloj se pinta de acento */
  urgent?: boolean;
  isPaused?: boolean;
}

/** Anillo de progreso con el reloj grande al centro (dirección C "En vivo"). */
const LiveTimerDisplay: React.FC<LiveTimerDisplayProps> = ({
  seconds,
  display,
  progress,
  colors,
  caption,
  urgent = false,
  isPaused = false,
}) => {
  const gradientId = useId();
  const text = display ?? formatClock(seconds);
  const clamped = progress === null ? 0 : Math.min(1, Math.max(0, progress));
  const center = VIEWBOX / 2;

  return (
    <div className="relative mx-auto aspect-square w-[min(270px,34dvh,78vw)] min-w-[200px] shrink-0">
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: colors[0] }} />
            <stop offset="1" style={{ stopColor: colors[1] }} />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-raised" />
        {progress !== null && clamped > 0 && (
          <circle
            cx={center}
            cy={center}
            r={RADIUS}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
            className={cx('motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-linear', isPaused && 'opacity-50')}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
        <span
          role="timer"
          className={cx(
            'font-display font-bold leading-none tracking-[-0.04em] tabular-nums select-none',
            text.length > 5 ? 'text-[clamp(40px,7dvh,56px)]' : 'text-[clamp(56px,9.5dvh,76px)]',
            urgent ? 'text-accent motion-safe:animate-timer-pulse' : 'text-fg',
            isPaused && 'opacity-60'
          )}
        >
          {text}
        </span>
        {(isPaused || caption) && (
          <span className={cx('text-[13px]', isPaused ? 'font-semibold text-fg' : 'text-muted')}>
            {isPaused ? 'En pausa' : caption}
          </span>
        )}
      </div>
    </div>
  );
};

export default LiveTimerDisplay;
