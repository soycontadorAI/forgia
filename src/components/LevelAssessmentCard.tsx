'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getLatestAssessment, shouldSuggestAssessment } from '@/lib/assessments';
import { getBenchmarkForLevel } from '@/lib/assessment-benchmarks';
import { startAssessment } from '@/lib/ai-client';
import type { LevelAssessment, BenchmarkWod } from '@/types/assessment';
import { toast } from 'sonner';
import WodDisplay from '@/components/WodDisplay';
import type { ExperienceLevel } from '@/types/profile';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cx } from '@/lib/cx';

const AssessmentReportModal = dynamic(() => import('@/components/AssessmentReportModal'), { ssr: false });
const LevelUpCelebration = dynamic(() => import('@/components/LevelUpCelebration'), { ssr: false });

const BADGE = 'rounded-full px-2.5 py-0.5 text-[11px] font-semibold';

const statusBadge: Record<string, { label: string; classes: string }> = {
  passed: { label: 'Aprobado', classes: 'bg-cooldown/12 text-cooldown' },
  failed: { label: 'No superado', classes: 'bg-accent-soft text-accent' },
  pending: { label: 'Pendiente', classes: 'bg-warmup/12 text-warmup' },
};

export default function LevelAssessmentCard() {
  const { profile, refreshProfile } = useAuth();
  const [latestAssessment, setLatestAssessment] = useState<LevelAssessment | null>(null);
  const [suggest, setSuggest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showWod, setShowWod] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  // El nivel se conserva mientras el diálogo se cierra para que devuelva el foco
  const [celebrationLevel, setCelebrationLevel] = useState<ExperienceLevel | null>(null);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const headingId = useId();
  const wodPanelId = useId();

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
        setCelebrationLevel(result.assessment.to_level);
        setCelebrationOpen(true);
        refreshProfile();
      }
    },
    [refreshProfile]
  );

  // La celebración puede quedar abierta aunque el nivel nuevo (Avanzado) oculte la tarjeta
  const celebration = celebrationLevel && (
    <LevelUpCelebration
      open={celebrationOpen}
      newLevel={celebrationLevel}
      onClose={() => setCelebrationOpen(false)}
    />
  );

  // Don't show if level is Avanzado (max level) or no benchmark exists
  if (!benchmark || profile?.experience_level === 'Avanzado') return celebration || null;
  if (loading) return null;

  const hasPendingAssessment = latestAssessment?.status === 'pending';
  const hasRecentResult = latestAssessment && latestAssessment.status !== 'pending';
  const isSuggested = suggest && !hasPendingAssessment && !hasRecentResult;

  return (
    <>
      <section aria-labelledby={headingId}>
        <Card className="flex flex-col gap-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
              <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={headingId} className="font-display text-lg font-semibold tracking-tight">
                  Evaluación de nivel
                </h2>
                {isSuggested && <span className={cx(BADGE, 'bg-warmup/12 text-warmup')}>Sugerido</span>}
                {hasRecentResult && (
                  <span className={cx(BADGE, statusBadge[latestAssessment.status].classes)}>
                    {statusBadge[latestAssessment.status].label}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted">
                {hasPendingAssessment
                  ? `${benchmark.title}: completa el benchmark y reporta tu resultado.`
                  : hasRecentResult && latestAssessment.status === 'passed'
                    ? `Subiste a ${latestAssessment.to_level}. Tu programa se ajustará automáticamente.`
                    : hasRecentResult && latestAssessment.status === 'failed'
                      ? 'No alcanzaste el criterio. Sigue entrenando y vuelve a intentarlo cuando estés listo.'
                      : `Pasa de ${benchmark.fromLevel} a ${benchmark.toLevel} completando un benchmark WOD.`}
              </p>
            </div>
          </div>

          {/* Pending assessment: show benchmark WOD */}
          {hasPendingAssessment && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowWod(!showWod)}
                aria-expanded={showWod}
                aria-controls={wodPanelId}
                className="flex min-h-11 w-full items-center justify-between rounded-2xl px-1 text-sm font-medium text-muted transition-colors hover:text-fg"
              >
                <span>{showWod ? 'Ocultar WOD' : 'Ver WOD de evaluación'}</span>
                <ChevronDown
                  className={cx('h-4 w-4 transition-transform', showWod && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>

              {showWod && (
                <div id={wodPanelId} className="border-t border-line pt-3">
                  <WodDisplay wod={benchmark.wod} />
                </div>
              )}

              <p className="rounded-2xl bg-warmup/12 p-3 text-sm text-fg">
                <span className="font-semibold text-warmup">Criterio:</span> {benchmark.passingCriteria}
              </p>

              <Button fullWidth onClick={() => setShowReportModal(true)}>
                Reportar resultado
              </Button>
            </div>
          )}

          {/* No pending assessment: CTA to start */}
          {!hasPendingAssessment && (
            <Button variant={isSuggested ? 'primary' : 'secondary'} fullWidth onClick={handleStart} loading={starting}>
              {starting
                ? 'Iniciando…'
                : hasRecentResult && latestAssessment.status === 'failed'
                  ? 'Reintentar evaluación'
                  : 'Evalúa tu nivel'}
            </Button>
          )}
        </Card>
      </section>

      {/* Report modal: montado mientras hay evaluación pendiente para que el diálogo
          pueda cerrarse (y devolver el foco) en lugar de desaparecer de golpe */}
      {hasPendingAssessment && (
        <AssessmentReportModal
          open={showReportModal}
          assessment={latestAssessment}
          benchmark={benchmark}
          onComplete={handleComplete}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {celebration}
    </>
  );
}
