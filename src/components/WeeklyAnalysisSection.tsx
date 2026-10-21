'use client';

import { useState, useEffect } from 'react';
import type { WeeklyAnalysisData } from '@/types/weekly-analysis';
import { fetchWeeklyAnalysis } from '@/lib/ai-client';
import Spinner from '@/components/Spinner';
import { BarChart3, Trophy, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';

const cargaBadge: Record<string, string> = {
  baja: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  moderada: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  alta: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  excesiva: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};


function AnalysisCard({
  title,
  icon,
  items,
  borderColor,
  dotColor,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  borderColor: string;
  dotColor: string;
}) {
  return (
    <div className={`rounded-xl border ${borderColor} bg-white dark:bg-neutral-900 p-4`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <span className={`size-1.5 rounded-full ${dotColor} mt-2 shrink-0`} />
            {item}
          </li>
        ))}
      </ul>
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
      <div className="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-red-500" />
          Análisis Semanal
        </h2>
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error || feedbackCount === 0) {
    return (
      <div className="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-red-500" />
          Análisis Semanal
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-6">
          No hay feedback registrado esta semana. Registra tus resultados para obtener un análisis.
        </p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="mt-8 pt-8 border-t border-neutral-200 dark:border-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-red-500" />
          Análisis Semanal
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{feedbackCount} sesiones</span>
          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${cargaBadge[analysis.carga_percibida] ?? ''}`}>
            Carga {analysis.carga_percibida}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10 p-4 mb-4">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{analysis.resumen_semanal}</p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <AnalysisCard
          title="Logros"
          icon={<Trophy className="h-4 w-4 text-emerald-500" />}
          items={analysis.logros}
          borderColor="border-emerald-200 dark:border-emerald-800/50"
          dotColor="bg-emerald-500"
        />
        <AnalysisCard
          title="Áreas de Atención"
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          items={analysis.areas_atencion}
          borderColor="border-amber-200 dark:border-amber-800/50"
          dotColor="bg-amber-500"
        />
        <AnalysisCard
          title="Recomendaciones"
          icon={<Lightbulb className="h-4 w-4 text-blue-500" />}
          items={analysis.recomendaciones_proxima_semana}
          borderColor="border-blue-200 dark:border-blue-800/50"
          dotColor="bg-blue-500"
        />
        <AnalysisCard
          title="Tendencias"
          icon={<TrendingUp className="h-4 w-4 text-red-500" />}
          items={analysis.tendencias}
          borderColor="border-red-200 dark:border-red-800/50"
          dotColor="bg-red-500"
        />
      </div>

      {/* Motivational note */}
      <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 p-4 text-center">
        <p className="text-sm italic text-neutral-600 dark:text-neutral-400">
          &ldquo;{analysis.nota_motivacional}&rdquo;
        </p>
      </div>
    </div>
  );
}
