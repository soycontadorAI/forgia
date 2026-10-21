'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, ClipboardCheck, Clock, Play, Trash2, Trophy } from 'lucide-react';
import type { WodTemplate, TemplateResult } from '@/types/wod-template';
import { useAuth } from '@/contexts/AuthContext';
import { getResultsForTemplate, deleteTemplateResult } from '@/lib/template-results';
import WodDisplay from '@/components/WodDisplay';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, Eyebrow } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import TemplateResultForm from './TemplateResultForm';
import { CATEGORY_LABELS, SCORING_LABELS, formatResultDate, formatScore, pickPersonalRecord } from './template-format';

const LiveWorkoutOverlay = dynamic(() => import('@/components/live/LiveWorkoutOverlay'), { ssr: false });

type ResultsStatus = 'loading' | 'ready' | 'error';

interface TemplateDetailViewProps {
  template: WodTemplate;
}

export default function TemplateDetailView({ template }: TemplateDetailViewProps) {
  const { user } = useAuth();
  const [results, setResults] = useState<TemplateResult[]>([]);
  const [status, setStatus] = useState<ResultsStatus>('loading');
  const [showResultForm, setShowResultForm] = useState(false);
  // Cada apertura del formulario lo monta de nuevo, con los campos limpios
  const [formSession, setFormSession] = useState(0);
  const [showLiveMode, setShowLiveMode] = useState(false);
  const [liveWorkoutTime, setLiveWorkoutTime] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TemplateResult | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Subirlo vuelve a pedir el historial (reintento o resultado nuevo)
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getResultsForTemplate(user.id, template.id).then(
      (data) => {
        if (cancelled) return;
        setResults(data);
        setStatus('ready');
      },
      (err) => {
        console.error('Error loading results:', err);
        if (!cancelled) setStatus('error');
      }
    );
    return () => {
      cancelled = true;
    };
  }, [user, template.id, reloadKey]);

  const retry = () => {
    setStatus('loading');
    setReloadKey((k) => k + 1);
  };

  const personalRecord = useMemo(() => pickPersonalRecord(results), [results]);

  const openResultForm = () => {
    setFormSession((n) => n + 1);
    setShowResultForm(true);
  };

  const closeResultForm = () => {
    setShowResultForm(false);
    setLiveWorkoutTime(null);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteTemplateResult(pendingDelete.id);
      setResults((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      toast.success('Resultado eliminado.');
      setPendingDelete(null);
    } catch (err) {
      console.error('Error deleting result:', err);
      toast.error('No se pudo eliminar el resultado.');
    } finally {
      setIsDeleting(false);
    }
  };

  const format = template.wod.metcon.type || SCORING_LABELS[template.scoringType];

  return (
    <>
      <div className="flex flex-col gap-5">
        <Link
          href="/app/biblioteca"
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-full px-2 text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Biblioteca
        </Link>

        <header className="flex flex-col gap-2">
          <Eyebrow className="font-mono uppercase tracking-[0.08em]">{CATEGORY_LABELS[template.category]} WOD</Eyebrow>
          <h1 className="font-display text-4xl font-bold tracking-tight">{template.name}</h1>
          <p className="text-[15px] leading-relaxed text-muted">{template.description}</p>
          <ul className="mt-1 flex flex-wrap gap-2" aria-label="Datos del WOD">
            <li className="rounded-full bg-surface px-3 py-1.5 font-mono text-xs">{format}</li>
            <li className="rounded-full bg-surface px-3 py-1.5 text-xs">{template.difficulty}</li>
            <li className="flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 font-mono text-xs">
              <Clock className="h-3 w-3 text-muted" aria-hidden="true" />~{template.estimatedMinutes} min
            </li>
          </ul>
        </header>

        {status === 'ready' && personalRecord && (
          <Card className="flex items-center gap-4 bg-linear-to-br from-accent-soft to-surface to-70%">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex flex-1 flex-col">
              <span className="text-xs text-muted">Tu marca a batir</span>
              <span className="font-display text-3xl font-bold leading-tight tracking-tight">
                {formatScore(personalRecord)}{' '}
                <span className="font-sans text-sm font-medium text-muted">{personalRecord.rx_or_scaled}</span>
              </span>
            </div>
            <span className="text-right text-xs text-muted">
              {results.length} {results.length === 1 ? 'intento' : 'intentos'}
            </span>
          </Card>
        )}

        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="text-xs font-medium text-muted">Estándar Rx</h2>
            <dl className="mt-2 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted">Hombres</dt>
                <dd className="font-mono text-sm text-fg">{template.rxStandard.men}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted">Mujeres</dt>
                <dd className="font-mono text-sm text-fg">{template.rxStandard.women}</dd>
              </div>
            </dl>
          </div>
          <div className="border-t border-line pt-3">
            <h2 className="text-xs font-medium text-muted">Equipo</h2>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {template.equipmentRequired.map((item) => (
                <li key={item} className="rounded-full bg-raised px-2.5 py-1 text-xs text-fg">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button size="lg" icon={<Play className="h-5 w-5" aria-hidden="true" />} onClick={() => setShowLiveMode(true)}>
            Iniciar entrenamiento
          </Button>
          <Button
            variant="secondary"
            size="lg"
            icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
            onClick={openResultForm}
            disabled={!user}
          >
            Registrar resultado
          </Button>
        </div>

        <WodDisplay wod={template.wod} date={null} />

        <section aria-labelledby="historial-titulo" className="flex flex-col gap-3">
          <h2 id="historial-titulo" className="font-display text-xl font-semibold tracking-tight">
            Tu historial
          </h2>
          <ResultsHistory
            status={status}
            results={results}
            personalRecordId={personalRecord?.id ?? null}
            onRetry={retry}
            onDelete={setPendingDelete}
            onRegister={openResultForm}
          />
        </section>
      </div>

      {showLiveMode && (
        <LiveWorkoutOverlay
          wod={template.wod}
          onFinish={(result) => {
            setShowLiveMode(false);
            setLiveWorkoutTime(result.totalMinutes);
            openResultForm();
          }}
          onCancel={() => setShowLiveMode(false)}
        />
      )}

      {user && (
        <TemplateResultForm
          key={formSession}
          open={showResultForm}
          template={template}
          userId={user.id}
          initialTime={liveWorkoutTime}
          onSaved={() => {
            closeResultForm();
            setReloadKey((k) => k + 1);
          }}
          onClose={closeResultForm}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        title="¿Eliminar este resultado?"
        description={
          pendingDelete
            ? `${formatScore(pendingDelete)} ${pendingDelete.rx_or_scaled} del ${formatResultDate(pendingDelete.created_at)}. No se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
      />
    </>
  );
}

interface ResultsHistoryProps {
  status: ResultsStatus;
  results: TemplateResult[];
  personalRecordId: string | null;
  onRetry: () => void;
  onDelete: (result: TemplateResult) => void;
  onRegister: () => void;
}

function ResultsHistory({ status, results, personalRecordId, onRetry, onDelete, onRegister }: ResultsHistoryProps) {
  if (status === 'loading') {
    return (
      <Card padding="none" className="px-4 py-1" aria-busy="true">
        <span className="sr-only">Cargando tu historial…</span>
        {[0, 1].map((i) => (
          <div key={i} className="flex min-h-15 items-center gap-3 border-b border-line last:border-b-0" aria-hidden="true">
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="h-4 w-20 animate-pulse rounded bg-raised" />
              <span className="h-3 w-28 animate-pulse rounded bg-raised" />
            </div>
          </div>
        ))}
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card padding="sm" role="alert" className="flex items-center gap-3 pl-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <p className="flex-1 text-sm">No pudimos cargar tu historial.</p>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted">
          Aún no registras este WOD. Hazlo y anota tu marca: la próxima vez tendrás un número que batir.
        </p>
        <Button variant="secondary" size="sm" onClick={onRegister}>
          Registrar resultado
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="none" className="px-4 py-1">
      <ul>
        {results.map((result) => (
          <li key={result.id} className="flex min-h-15 items-center gap-3 border-b border-line py-2 last:border-b-0">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="flex items-center gap-2">
                <span className="font-display text-lg font-bold">{formatScore(result)}</span>
                <span className="text-xs text-muted">{result.rx_or_scaled}</span>
                {result.id === personalRecordId && (
                  <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                    <Trophy className="h-3 w-3" aria-hidden="true" />
                    PR
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted">
                {formatResultDate(result.created_at)}
                {result.notes && ` · ${result.notes}`}
              </p>
            </div>
            <IconButton label={`Eliminar resultado del ${formatResultDate(result.created_at)}`} onClick={() => onDelete(result)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>
    </Card>
  );
}
