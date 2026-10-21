import { ArrowLeft, SearchX } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function TemplateNotFound() {
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-raised text-muted">
        <SearchX className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="font-display text-2xl font-bold tracking-tight">No encontramos ese WOD</h1>
      <p className="max-w-xs text-sm text-muted">Puede que el enlace esté incompleto o que el WOD ya no esté en la biblioteca.</p>
      <ButtonLink href="/app/biblioteca" variant="secondary" size="sm" icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
        Ir a la biblioteca
      </ButtonLink>
    </Card>
  );
}
