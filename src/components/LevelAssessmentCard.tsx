'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { getLatestAssessment, shouldSuggestAssessment } from '@/lib/assessments';
import { getBenchmarkForLevel } from '@/lib/assessment-benchmarks';
import { startAssessment } from '@/lib/gemini';
import type { LevelAssessment, BenchmarkWod } from '@/types/assessment';
import { toast } from 'sonner';
import WodDisplay from '@/components/WodDisplay';
import type { ExperienceLevel } from '@/types/profile';

const AssessmentReportModal = dynamic(() => import('@/components/AssessmentReportModal'), { ssr: false });
const LevelUpCelebration = dynamic(() => import('@/components/LevelUpCelebration'), { ssr: false });

// Icons
const ShieldIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
);

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="6 9 12 15 18 9"/></svg>
);

const statusBadge: Record<string, { label: string; classes: string }> = {
  passed: { label: 'Aprobado', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  failed: { label: 'No superado', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  pending: { label: 'Pendiente', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

export default function LevelAssessmentCard() {
  const { profile, refreshProfile } = useAuth();
  const [latestAssessment, setLatestAssessment] = useState<LevelAssessment | null>(null);
  const [suggest, setSuggest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showWod, setShowWod] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [celebration, setCelebration] = useState<ExperienceLevel | null>(null);


  const benchmark: BenchmarkWod | null = profile?.experience_level
    ? getBenchmarkForLevel(profile.experience_level)
    : null;

  useEffect(() => {
    const load = async () => {
      try {
        const [assessment, shouldSuggest] = await Promise.all([
          getLatestAssessment(),
          shouldSuggestAssessment(),
        ]);
        setLatestAssessment(assessment);
        setSuggest(shouldSuggest);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleStart = useCallback(async () => {
    if (!benchmark) return;
    setStarting(true);
    try {
      const assessment = await startAssessment(benchmark.id);
      setLatestAssessment(assessment);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar evaluación.');
    } finally {
      setStarting(false);
    }
  }, [benchmark]);

  const handleComplete = useCallback(
    (result: { assessment: LevelAssessment; levelChanged: boolean }) => {
      setLatestAssessment(result.assessment);
      setShowReportModal(false);
      if (result.levelChanged) {
        setCelebration(result.assessment.to_level);
        refreshProfile();
      }
    },
    [refreshProfile]
  );

  // Don't show if level is Avanzado (max level) or no benchmark exists
  if (!benchmark || profile?.experience_level === 'Avanzado') return null;
  if (loading) return null;

  const hasPendingAssessment = latestAssessment?.status === 'pending';
  const hasRecentResult = latestAssessment && latestAssessment.status !== 'pending';

  return (
    <>
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 shrink-0">
            <ShieldIcon className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Evaluación de Nivel
              </h3>
              {suggest && !hasPendingAssessment && !hasRecentResult && (
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Sugerido
                </span>
              )}
              {hasRecentResult && (
                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${statusBadge[latestAssessment.status].classes}`}>
                  {statusBadge[latestAssessment.status].label}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {hasPendingAssessment
                ? `${benchmark.title} — Completa el benchmark y reporta tu resultado.`
                : hasRecentResult && latestAssessment.status === 'passed'
                  ? `Subiste a ${latestAssessment.to_level}. Tu programa se ajustará automáticamente.`
                  : hasRecentResult && latestAssessment.status === 'failed'
                    ? `No alcanzaste el criterio. Sigue entrenando y vuelve a intentarlo cuando estés listo.`
                    : `Pasa de ${benchmark.fromLevel} a ${benchmark.toLevel} completando un benchmark WOD.`
              }
            </p>
          </div>
        </div>

        {/* Pending assessment: show benchmark WOD */}
        {hasPendingAssessment && (
          <div className="px-4 pb-4 space-y-3">
            {/* Toggle WOD details */}
            <button
              onClick={() => setShowWod(!showWod)}
              className="w-full flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-medium transition-colors"
            >
              <span>{showWod ? 'Ocultar WOD' : 'Ver WOD de evaluación'}</span>
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${showWod ? 'rotate-180' : ''}`} />
            </button>

            {showWod && (
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
                <WodDisplay wod={benchmark.wod} />
              </div>
            )}

            {/* Passing criteria */}
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-semibold">Criterio:</span> {benchmark.passingCriteria}
              </p>
            </div>

            {/* Report result button */}
            <button
              onClick={() => setShowReportModal(true)}
              className="w-full py-2.5 text-sm font-bold uppercase tracking-wider text-white bg-red-500 rounded-lg hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all duration-200"
            >
              Reportar Resultado
            </button>
          </div>
        )}

        {/* No pending assessment: CTA to start */}
        {!hasPendingAssessment && (
          <div className="px-4 pb-4">
            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full py-2.5 text-sm font-semibold rounded-lg border-2 border-red-500 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {starting ? 'Iniciando...' : hasRecentResult && latestAssessment.status === 'failed' ? 'Reintentar Evaluación' : 'Evalúa tu Nivel'}
            </button>
          </div>
        )}
      </div>

      {/* Report modal */}
      {showReportModal && hasPendingAssessment && (
        <AssessmentReportModal
          assessment={latestAssessment}
          benchmark={benchmark}
          onComplete={handleComplete}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Level up celebration */}
      {celebration && (
        <LevelUpCelebration
          newLevel={celebration}
          onClose={() => setCelebration(null)}
        />
      )}
    </>
  );
}
