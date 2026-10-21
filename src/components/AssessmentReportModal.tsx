'use client';

import { useId, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { AssessmentSelfReport, LevelAssessment } from '@/types/assessment';
import type { BenchmarkWod } from '@/types/assessment';
import { completeAssessment } from '@/lib/ai-client';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { TextField, TextAreaField } from '@/components/ui/Field';
import { PillRadioGroup } from '@/components/ChoiceControls';

interface AssessmentReportModalProps {
  open: boolean;
  assessment: LevelAssessment;
  benchmark: BenchmarkWod;
  onComplete: (result: { assessment: LevelAssessment; levelChanged: boolean }) => void;
  onClose: () => void;
}

const COMPLETED_OPTIONS = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
] as const;

const MODE_OPTIONS = [
  { value: 'Rx', label: 'Rx' },
  { value: 'Scaled', label: 'Scaled' },
] as const;

export default function AssessmentReportModal({
  open,
  assessment,
  benchmark,
  onComplete,
  onClose,
}: AssessmentReportModalProps) {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [totalTime, setTotalTime] = useState('');
  const [roundsOrReps, setRoundsOrReps] = useState('');
  const [rxOrScaled, setRxOrScaled] = useState<'Rx' | 'Scaled'>('Rx');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const formId = useId();
  const submitHintId = useId();

  const isAmrap = benchmark.wod.metcon.type?.toLowerCase().includes('amrap');

  const canSubmit = completed !== null && !submitting;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    const selfReport: AssessmentSelfReport = {
      completed: completed!,
      total_time_minutes: totalTime ? Number(totalTime) : null,
      rounds_or_reps: roundsOrReps.trim() || null,
      rx_or_scaled: rxOrScaled,
      notes: notes.trim() || null,
    };

    try {
      const result = await completeAssessment(assessment.id, selfReport);
      onComplete(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar resultado.');
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Reportar resultado"
      description={benchmark.title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={completed === null}
            loading={submitting}
            aria-describedby={completed === null ? submitHintId : undefined}
          >
            {submitting ? 'Enviando…' : 'Enviar resultado'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <PillRadioGroup
          legend="¿Completaste el WOD?"
          options={COMPLETED_OPTIONS}
          value={completed === null ? null : completed ? 'si' : 'no'}
          onChange={(v) => setCompleted(v === 'si')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Tiempo total (minutos)"
            type="number"
            inputMode="decimal"
            min={0}
            max={60}
            value={totalTime}
            onChange={(e) => setTotalTime(e.target.value)}
            placeholder="Ej: 5"
          />
          {isAmrap && (
            <TextField
              label="Rondas + reps"
              type="text"
              value={roundsOrReps}
              onChange={(e) => setRoundsOrReps(e.target.value)}
              placeholder="Ej: 14+3"
            />
          )}
        </div>

        <PillRadioGroup
          legend="Modalidad"
          options={MODE_OPTIONS}
          value={rxOrScaled}
          onChange={setRxOrScaled}
          className="sm:max-w-xs"
        />

        <TextAreaField
          label="Notas"
          hint="Opcional"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="¿Cómo te sentiste? ¿Algún detalle relevante?"
          rows={3}
        />

        <p className="rounded-2xl bg-ground p-3 text-sm text-muted">
          <span className="font-semibold text-fg">Criterio para pasar:</span> {benchmark.passingCriteria}
        </p>

        {completed === null && (
          <p id={submitHintId} className="text-xs text-muted">
            Indica si completaste el WOD para poder enviar tu resultado.
          </p>
        )}
      </form>
    </Dialog>
  );
}
