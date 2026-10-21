import { Suspense } from 'react';
import type { Metadata } from 'next';
import { WOD_TEMPLATES } from '@/lib/wod-templates';
import TemplateCard from '@/components/templates/TemplateCard';
import TemplateLibrary, { FilterChips } from '@/components/templates/TemplateLibrary';
import { toTemplateSummary } from '@/components/templates/template-format';

export const metadata: Metadata = {
  title: 'Biblioteca',
};

export default function BibliotecaPage() {
  // Solo viaja al cliente lo que pinta la tarjeta; el WOD completo se carga en el detalle
  const templates = WOD_TEMPLATES.map(toTemplateSummary);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Biblioteca</h1>
        <p className="text-sm text-muted">WODs clásicos de CrossFit. Registra tu marca y vuelve a atacarla.</p>
      </header>

      {/* useSearchParams (filtro en la URL) necesita un límite de Suspense */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <FilterChips selected="todos" />
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {templates.map((template) => (
                <li key={template.id}>
                  <TemplateCard template={template} resultsLoading />
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <TemplateLibrary templates={templates} />
      </Suspense>
    </div>
  );
}
