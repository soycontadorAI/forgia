import { ChevronDown, ChevronRight, CirclePlay } from 'lucide-react';
import type { WodSection } from '@/types/wod';
import { cx } from '@/lib/cx';

interface LiveSectionViewProps {
  section: WodSection;
  /** Índice del movimiento actual dentro de la sección */
  movementIndex: number;
  onNextMovement: () => void;
  /** Clase de color de la sección para el "Ahora" (ej. text-metcon) */
  accentClass: string;
}

export function getSectionItems(section: WodSection): string[] {
  return section.movements || section.parts || section.details || [];
}

/** Tarjeta del movimiento actual + la sección completa desplegable. */
const LiveSectionView: React.FC<LiveSectionViewProps> = ({ section, movementIndex, onNextMovement, accentClass }) => {
  const items = getSectionItems(section);
  const hasItems = items.length > 0;
  const index = hasItems ? movementIndex % items.length : 0;
  const current = hasItems ? items[index] : section.description || section.title;
  const next = items.length > 1 ? items[(index + 1) % items.length] : null;

  return (
    <section aria-label="Movimiento actual" className="rounded-3xl bg-surface">
      <div className="flex items-center gap-3 p-3">
        {/* Espacio reservado para el video demo del movimiento */}
        <div
          aria-hidden="true"
          className="flex size-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-neutral-600 bg-raised text-muted sm:size-[84px]"
        >
          <CirclePlay className="h-5 w-5" />
          <span className="text-[11px]">Demo</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cx('text-xs font-medium', accentClass)}>
            {hasItems && items.length > 1 ? `Ahora · ${index + 1} de ${items.length}` : 'Ahora'}
          </span>
          <span className="line-clamp-2 font-display text-xl leading-tight font-semibold tracking-tight text-fg">{current}</span>
          {next && <span className="truncate text-[13px] text-muted">Después: {next}</span>}
        </div>

        {items.length > 1 && (
          <button
            type="button"
            onClick={onNextMovement}
            aria-label="Siguiente movimiento"
            title="Siguiente movimiento"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-raised text-fg transition-colors hover:bg-neutral-700 active:scale-95 motion-reduce:active:scale-100"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {(items.length > 1 || section.notes) && (
        <details className="group border-t border-line">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-medium text-muted transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
            {items.length > 1 ? `Ver sección completa (${items.length})` : 'Ver notas'}
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="flex max-h-56 flex-col gap-3 overflow-y-auto px-4 pb-4">
            {items.length > 1 && (
              <ol className="flex flex-col gap-2">
                {items.map((item, i) => (
                  <li key={i} className={cx('flex gap-3 text-sm', i === index ? 'font-semibold text-fg' : 'text-muted')}>
                    <span className="w-5 shrink-0 text-right font-mono tabular-nums">{i + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            )}
            {section.notes && (
              <p className="rounded-xl bg-warmup/10 px-3 py-2 text-sm text-fg">
                <span className="font-semibold text-warmup">{section.notesLabel || 'Notas'}: </span>
                {section.notes}
              </p>
            )}
          </div>
        </details>
      )}
    </section>
  );
};

export default LiveSectionView;
