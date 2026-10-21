'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getProgressSummary, type ProgressSummary } from '@/lib/progress';
import { RecordTrendChart, StatTile, WeeklyLoadChart } from '@/components/progress/ProgressCharts';
import { Card } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import WeeklyAnalysisSection from '@/components/WeeklyAnalysisSection';

export default function ProgresoResumenPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProgressSummary(user.id)
      .then(setSummary)
      .catch((e) => {
        console.error('Error loading progress summary:', e);
        setError(true);
      });
  }, [user]);

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <Card>
          <p className="text-sm text-muted" role="alert">
            No pudimos cargar tu progreso. Revisa tu conexión y vuelve a abrir esta sección.
          </p>
        </Card>
      ) : !summary ? (
        <div className="grid grid-cols-3 gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-[72px] rounded-3xl bg-surface motion-safe:animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <StatTile value={String(summary.thisWeek.sessions)} label="sesiones esta semana" />
            <StatTile value={summary.thisWeek.avgDifficulty?.toFixed(1) ?? '—'} label="dificultad prom." />
            <StatTile
              value={summary.thisWeek.sessions ? `${summary.thisWeek.rx}:${summary.thisWeek.scaled}` : '—'}
              label="Rx : Scaled"
            />
          </div>

          <WeeklyLoadChart weeks={summary.weeks} />

          {summary.trend ? (
            <RecordTrendChart trend={summary.trend} />
          ) : (
            <Card className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted" aria-hidden="true" />
                <h2 className="text-sm font-semibold">Tendencia de tus records</h2>
              </div>
              <p className="text-sm text-muted">
                Registra al menos dos 1RM del mismo movimiento y aquí verás cómo va subiendo.
              </p>
              <ButtonLink href="/app/progreso/records" variant="secondary" size="sm">
                Ir a Records
              </ButtonLink>
            </Card>
          )}
        </>
      )}

      <WeeklyAnalysisSection />
    </div>
  );
}
