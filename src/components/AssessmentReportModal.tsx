'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { AssessmentSelfReport, LevelAssessment } from '@/types/assessment';
import type { BenchmarkWod } from '@/types/assessment';
import { completeAssessment } from '@/lib/ai-client';
import SegmentedButton from '@/components/ui/SegmentedButton';
import Spinner from '@/components/Spinner';

interface AssessmentReportModalProps {
  assessment: LevelAssessment;
  benchmark: BenchmarkWod;
  onComplete: (result: { assessment: LevelAssessment; levelChanged: boolean }) => void;
  onClose: () => void;
}

export default function AssessmentReportModal({
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


  const isAmrap = benchmark.wod.metcon.type?.toLowerCase().includes('amrap');

  const canSubmit = completed !== null && !submitting;

  const handleSubmit = async () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Reportar Resultado
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {benchmark.title}
          </p>
        </div>

        {/* Completed? */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            ¿Completaste el WOD? <span className="text-red-500">*</span>
          </label>
          <SegmentedButton
            options={['Sí', 'No']}
            selected={completed === null ? '' : completed ? 'Sí' : 'No'}
            onSelect={(v) => setCompleted(v === 'Sí')}
          />
        </div>

        {/* Time */}
        <div>
          <label htmlFor="assessment-time" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Tiempo total (minutos)
          </label>
          <input
            id="assessment-time"
            type="number"
            min={0}
            max={60}
            value={totalTime}
            onChange={(e) => setTotalTime(e.target.value)}
            placeholder="Ej: 5"
            className="w-full sm:w-32 px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-red-500 focus:border-red-500 text-sm"
          />
        </div>

        {/* Rounds/Reps (for AMRAP) */}
        {isAmrap && (
          <div>
            <label htmlFor="assessment-rounds" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Rondas + Reps
            </label>
            <input
              id="assessment-rounds"
              type="text"
              value={roundsOrReps}
              onChange={(e) => setRoundsOrReps(e.target.value)}
              placeholder="Ej: 14+3"
              className="w-full sm:w-40 px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>
        )}

        {/* Rx / Scaled */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Modalidad
          </label>
          <SegmentedButton
            options={['Rx', 'Scaled']}
            selected={rxOrScaled}
            onSelect={(v) => setRxOrScaled(v as 'Rx' | 'Scaled')}
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="assessment-notes" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Notas (opcional)
          </label>
          <textarea
            id="assessment-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="¿Cómo te sentiste? ¿Algún detalle relevante?"
            rows={3}
            className="w-full px-3 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-red-500 focus:border-red-500 text-sm"
          />
        </div>

        {/* Passing criteria reminder */}
        <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 p-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold">Criterio para pasar:</span> {benchmark.passingCriteria}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Spinner />
                Enviando...
              </>
            ) : (
              'Enviar Resultado'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
