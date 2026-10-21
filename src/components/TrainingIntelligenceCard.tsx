'use client';

import { useState, useEffect } from 'react';
import { fetchTrainingIntelligence } from '@/lib/ai-client';
import type { TrainingIntelligenceResponse } from '@/app/api/training-intelligence/route';

const PHASE_LABELS: Record<string, string> = {
  build: 'BUILD',
  peak: 'PEAK',
  deload: 'DELOAD',
  recovery: 'RECOVERY',
};

const PHASE_COLORS: Record<string, string> = {
  build: 'text-blue-600 dark:text-blue-400',
  peak: 'text-amber-600 dark:text-amber-400',
  deload: 'text-emerald-600 dark:text-emerald-400',
  recovery: 'text-neutral-500 dark:text-neutral-400',
};

const BrainIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
    <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
    <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
    <path d="M6 18a4 4 0 0 1-1.967-.516" />
    <path d="M19.967 17.484A4 4 0 0 1 18 18" />
  </svg>
);

export default function TrainingIntelligenceCard() {
  const [data, setData] = useState<TrainingIntelligenceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('training-intelligence-collapsed') === 'true';
  });

  useEffect(() => {
    fetchTrainingIntelligence()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('training-intelligence-collapsed', String(next));
      return next;
    });
  };

  // Don't render if still loading or failed to load
  if (isLoading) {
    return (
      <div data-print-hide className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-neutral-300 dark:bg-neutral-600 rounded" />
          <div className="h-4 w-48 bg-neutral-300 dark:bg-neutral-600 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Not enough data state
  if (!data.hasEnoughData) {
    return (
      <div data-print-hide className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
          <BrainIcon className="shrink-0" />
          <div className="flex-1">
            <span className="text-sm">
              Genera y registra más entrenamientos para activar la inteligencia de periodización
            </span>
            <span className="ml-2 text-xs font-semibold text-red-500">
              {data.totalWods}/5
            </span>
          </div>
        </div>
      </div>
    );
  }

  const s = data.summary!;

  return (
    <div data-print-hide className="mb-6 bg-neutral-100 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-200/50 dark:hover:bg-neutral-700/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
          <BrainIcon className="shrink-0 text-red-500" />
          <span className="text-sm font-semibold">Inteligencia de Entrenamiento</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-neutral-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-3">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {s.weekPhase && (
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Fase</p>
                <p className={`text-sm font-bold ${PHASE_COLORS[s.weekPhase] ?? 'text-neutral-700 dark:text-neutral-300'}`}>
                  {PHASE_LABELS[s.weekPhase] ?? s.weekPhase}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Esta semana</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {s.sessionsThisWeek} {s.sessionsThisWeek === 1 ? 'sesión' : 'sesiones'}
                {s.avgDifficultyThisWeek !== null && (
                  <span className="text-neutral-500 dark:text-neutral-400 font-normal"> ({s.avgDifficultyThisWeek}/10)</span>
                )}
              </p>
            </div>
            {s.underrepresentedDomain && (
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Dominio bajo</p>
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">{s.underrepresentedDomain}</p>
              </div>
            )}
            {s.strengthSuggestion && (
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Fuerza sugerida</p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{s.strengthSuggestion}</p>
              </div>
            )}
          </div>

          {/* Deload warning */}
          {s.deloadWarning && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
              <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold">Deload recomendado — Reduce intensidad esta sesión</span>
            </div>
          )}

          {/* Bottom info */}
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>{s.avgSessionsPerWeek} sesiones/semana promedio</span>
            {s.daysSinceLastSession > 0 && (
              <span>Último entreno: hace {s.daysSinceLastSession} {s.daysSinceLastSession === 1 ? 'día' : 'días'}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
