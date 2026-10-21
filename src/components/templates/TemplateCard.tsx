import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import type { TemplateResult } from '@/types/wod-template';
import { CATEGORY_LABELS, formatScore, type TemplateSummary } from './template-format';

interface TemplateCardProps {
  template: TemplateSummary;
  lastResult?: TemplateResult | null;
  /** Mientras llegan los resultados del usuario se muestra un hueco en vez del último registro */
  resultsLoading?: boolean;
  /** Si falló la carga no se afirma "Sin registro"; el aviso de error va arriba de la lista */
  resultsUnavailable?: boolean;
}

export default function TemplateCard({ template, lastResult, resultsLoading = false, resultsUnavailable = false }: TemplateCardProps) {
  return (
    <Link
      href={`/app/biblioteca/${template.id}`}
      className="group flex h-full flex-col gap-3 rounded-3xl bg-surface p-4 transition-colors hover:bg-raised sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          {CATEGORY_LABELS[template.category]}
        </span>
        <span className="truncate rounded-full bg-raised px-2.5 py-1 font-mono text-xs text-fg group-hover:bg-ground">
          {template.format}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-bold tracking-tight text-fg">{template.name}</h2>
        <p className="line-clamp-2 text-sm leading-snug text-muted">{template.description}</p>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
        <div className="flex flex-col gap-0.5 text-xs text-muted">
          <span>{template.difficulty}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />~{template.estimatedMinutes} min
          </span>
        </div>

        <div className="flex items-center gap-1">
          {resultsLoading ? (
            <span className="h-9 w-16 animate-pulse rounded-xl bg-raised" aria-hidden="true" />
          ) : lastResult ? (
            <div className="flex flex-col items-end">
              <span className="text-[11px] text-muted">Último</span>
              <span className="font-display text-lg font-bold leading-tight text-fg">
                {formatScore(lastResult)}{' '}
                <span className="font-sans text-xs font-medium text-muted">{lastResult.rx_or_scaled}</span>
              </span>
            </div>
          ) : resultsUnavailable ? null : (
            <span className="text-xs text-muted">Sin registro</span>
          )}
          <ChevronRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
