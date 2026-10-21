'use client';

import { useState, useEffect } from 'react';
import type { WeeklyAnalysisData } from '@/types/weekly-analysis';
import { fetchWeeklyAnalysis } from '@/lib/ai-client';
import { Card } from '@/components/ui/Card';
import { AlertTriangle, Flame, Lightbulb, TrendingUp, Trophy, type LucideIcon } from 'lucide-react';
import { cx } from '@/lib/cx';

const CARGA_STYLE: Record<WeeklyAnalysisData['carga_percibida'], string> = {
  baja: 'bg-cooldown/12 text-cooldown',
  moderada: 'bg-warmup/12 text-warmup',
  alta: 'bg-metcon/12 text-metcon',
  excesiva: 'bg-accent-solid text-on-accent',
};

function AnalysisList({ title, icon: Icon, items, tone }: { title: string; icon: LucideIcon; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl bg-raised/50 p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className={cx('h-4 w-4', tone)} aria-hidden="true" />
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-fg/90">
            <span className={cx('mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current', tone)} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CoachHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-red-500 to-orange-500 text-neutral-950">
        <Flame className="h-4 w-4" aria-hidden="true" />
      </span>
      <h2 className="font-display text-lg font-semibold">Análisis de la semana</h2>
      <span className="text-xs text-muted">· Coach IA</span>
      {children}
    </div>
  );
}

export default function WeeklyAnalysisSection() {
  const [analysis, setAnalysis] = useState<WeeklyAnalysisData | null>(null);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await fetchWeeklyAnalysis();
        setFeedbackCount(result.feedbackCount);
        setAnalysis(result.analysis);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Card className="flex flex-col gap-4" aria-busy="true">
        <CoachHeader />
        <div className="flex flex-col gap-2" aria-hidden="true">
          <span className="h-3 w-full rounded-full bg-raised motion-safe:animate-pulse" />
          <span className="h-3 w-4/5 rounded-full bg-raised motion-safe:animate-pulse" />
          <span className="h-3 w-3/5 rounded-full bg-raised motion-safe:animate-pulse" />
        </div>
        <p className="sr-only" role="status">Cargando el análisis de la semana</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col gap-2">
        <CoachHeader />
        <p className="text-sm text-muted" role="alert">
          No pudimos cargar el análisis de esta semana. Si ya usaste tus análisis del día, vuelve mañana.
        </p>
      </Card>
    );
  }

  if (feedbackCount === 0 || !analysis) {
    return (
      <Card className="flex flex-col gap-2">
        <CoachHeader />
        <p className="text-sm text-muted">
          Registra el resultado de tus entrenamientos de esta semana y aquí aparece el análisis de tu coach.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 bg-linear-to-br from-accent-soft to-surface to-70%">
      <CoachHeader>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted">{feedbackCount} sesiones</span>
          <span className={cx('rounded-full px-2.5 py-1 text-xs font-semibold', CARGA_STYLE[analysis.carga_percibida])}>
            Carga {analysis.carga_percibida}
          </span>
        </span>
      </CoachHeader>

      <p className="text-[15px] leading-relaxed">{analysis.resumen_semanal}</p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <AnalysisList title="Logros" icon={Trophy} items={analysis.logros} tone="text-warmup" />
        <AnalysisList title="Recomendaciones" icon={Lightbulb} items={analysis.recomendaciones_proxima_semana} tone="text-strength" />
        <AnalysisList title="Áreas de atención" icon={AlertTriangle} items={analysis.areas_atencion} tone="text-metcon" />
        <AnalysisList title="Tendencias" icon={TrendingUp} items={analysis.tendencias} tone="text-cooldown" />
      </div>

      <p className="text-sm italic text-muted">“{analysis.nota_motivacional}”</p>
    </Card>
  );
}
