'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AlertCircle, Library } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { TemplateResult } from '@/types/wod-template';
import { getBestResults } from '@/lib/template-results';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cx } from '@/lib/cx';
import TemplateCard from './TemplateCard';
import { LIBRARY_FILTERS, type LibraryFilter, type TemplateSummary } from './template-format';

type ResultsStatus = 'loading' | 'ready' | 'error';

function parseFilter(value: string | null): LibraryFilter {
  return LIBRARY_FILTERS.find((f) => f.value === value)?.value ?? 'todos';
}

interface TemplateLibraryProps {
  templates: TemplateSummary[];
}

export default function TemplateLibrary({ templates }: TemplateLibraryProps) {
  const { user, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // El filtro vive en la URL: sobrevive al ir al detalle y regresar con "atrás"
  const filter = parseFilter(searchParams.get('categoria'));

  const [lastResults, setLastResults] = useState<Map<string, TemplateResult>>(new Map());
  const [status, setStatus] = useState<ResultsStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getBestResults(user.id).then(
      (results) => {
        if (cancelled) return;
        setLastResults(results);
        setStatus('ready');
      },
      (err) => {
        console.error('Error loading best results:', err);
        if (!cancelled) setStatus('error');
      }
    );
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  const retry = () => {
    setStatus('loading');
    setReloadKey((k) => k + 1);
  };

  const selectFilter = (value: LibraryFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'todos') params.delete('categoria');
    else params.set('categoria', value);
    const query = params.toString();
    // replaceState se sincroniza con useSearchParams sin pedir otra vez la página al servidor
    window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);
  };

  const counts = useMemo(() => {
    const map = new Map<LibraryFilter, number>();
    for (const f of LIBRARY_FILTERS) {
      map.set(f.value, f.category ? templates.filter((t) => t.category === f.category).length : templates.length);
    }
    return map;
  }, [templates]);

  const visible = useMemo(() => {
    const category = LIBRARY_FILTERS.find((f) => f.value === filter)?.category;
    return category ? templates.filter((t) => t.category === category) : templates;
  }, [filter, templates]);

  const resultsLoading = status === 'loading' && (authLoading || !!user);

  return (
    <div className="flex flex-col gap-4">
      <FilterChips selected={filter} counts={counts} onSelect={selectFilter} />

      {status === 'error' && (
        <Card padding="sm" role="alert" className="flex items-center gap-3 pl-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <p className="flex-1 text-sm text-fg">No pudimos cargar tus resultados.</p>
          <Button variant="secondary" size="sm" onClick={retry}>
            Reintentar
          </Button>
        </Card>
      )}

      {visible.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visible.map((template) => (
            <li key={template.id}>
              <TemplateCard
                template={template}
                lastResult={lastResults.get(template.id) ?? null}
                resultsLoading={resultsLoading}
                resultsUnavailable={status === 'error'}
              />
            </li>
          ))}
        </ul>
      ) : (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-raised text-muted">
            <Library className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm text-muted">No hay WODs en esta categoría.</p>
          <Button variant="secondary" size="sm" onClick={() => selectFilter('todos')}>
            Ver todos
          </Button>
        </Card>
      )}
    </div>
  );
}

interface FilterChipsProps {
  selected: LibraryFilter | null;
  counts?: Map<LibraryFilter, number>;
  onSelect?: (value: LibraryFilter) => void;
}

/** Chips de categoría (botones conmutables). Sin `onSelect` se pintan inertes, como esqueleto. */
export function FilterChips({ selected, counts, onSelect }: FilterChipsProps) {
  return (
    <div role="group" aria-label="Categoría" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {LIBRARY_FILTERS.map((f) => {
        const active = selected === f.value;
        const count = counts?.get(f.value);
        return (
          <button
            key={f.value}
            type="button"
            aria-pressed={active}
            disabled={!onSelect}
            onClick={() => onSelect?.(f.value)}
            className={cx(
              'flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors',
              active ? 'border-fg bg-fg font-semibold text-ground' : 'border-line text-fg hover:bg-surface'
            )}
          >
            {f.label}
            {count !== undefined && (
              <span className={cx('font-mono text-xs', active ? 'text-ground/70' : 'text-muted')}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
