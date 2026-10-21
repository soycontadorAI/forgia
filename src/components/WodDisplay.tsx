import type { PartialWod, WodSectionKey } from '@/types/wod';
import WodSectionCard, { SECTION_STYLES, WodSectionSkeleton } from './WodSectionCard';
import { estimateSectionMinutes } from '@/lib/wod-time';
import { cx } from '@/lib/cx';

const SECTION_ORDER: WodSectionKey[] = ['warmUp', 'strengthSkill', 'metcon', 'coolDown'];

interface WodDisplayProps {
  wod: PartialWod;
  /** Fecha del WOD; por defecto hoy. `null` la oculta (plantillas de la biblioteca). */
  date?: Date | string | null;
  /** Durante el streaming: las secciones que faltan se muestran como lugar reservado */
  streaming?: boolean;
}

const WodDisplay: React.FC<WodDisplayProps> = ({ wod, streaming = false, date }) => {
  const dateStr = date === null ? null : new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(date ? new Date(date) : new Date());
  const minutes = SECTION_ORDER.map((key) => estimateSectionMinutes(wod[key], key));
  const total = minutes.reduce((sum, m) => sum + m, 0);

  // Una sección ya llegó cuando tiene título; la última en llegar se sigue escribiendo
  const arrived = SECTION_ORDER.filter((key) => wod[key]?.title);

  return (
    <div className="flex flex-col gap-4" aria-busy={streaming || undefined}>
      <div className="rounded-3xl bg-surface p-4 motion-safe:animate-fade-in-up sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {dateStr && <p className="text-xs text-muted">{dateStr}</p>}
            {wod.title ? (
              <h2 className="print-title font-display text-3xl font-bold leading-tight tracking-tight text-fg">{wod.title}</h2>
            ) : (
              <span className="mt-2 block h-8 w-48 rounded-full bg-raised motion-safe:animate-pulse" aria-hidden="true" />
            )}
          </div>
          <span className="shrink-0 rounded-full bg-raised px-3 py-1.5 font-mono text-xs text-fg">~{total} min</span>
        </div>

        <div className="mt-4 flex h-2 gap-1" role="img" aria-label={`Duración estimada por sección: ${SECTION_ORDER.map((key, i) => `${SECTION_STYLES[key].label} ${minutes[i]} minutos`).join(', ')}`}>
          {SECTION_ORDER.map((key, i) => (
            <span
              key={key}
              className={cx('rounded-full transition-opacity', SECTION_STYLES[key].dot, !wod[key]?.title && 'opacity-25')}
              style={{ flexGrow: minutes[i] }}
            />
          ))}
        </div>
      </div>

      {SECTION_ORDER.map((key, i) => {
        const section = wod[key];
        if (section?.title) {
          return <WodSectionCard key={key} section={section} sectionType={key} animationDelay={streaming ? undefined : `${i * 75}ms`} />;
        }
        return streaming ? <WodSectionSkeleton key={key} sectionType={key} /> : null;
      })}

      {streaming && (
        <p className="sr-only" aria-live="polite">
          {arrived.length === 0 ? 'Generando tu WOD' : `Listo: ${arrived.map((key) => SECTION_STYLES[key].label).join(', ')}`}
        </p>
      )}
    </div>
  );
};

export default WodDisplay;
