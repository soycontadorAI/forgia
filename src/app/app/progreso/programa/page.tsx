'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { MonthlyProgram, ProgramWeek, ProgramSession } from '@/types/program';
import { getActiveProgram, getWodCountThisWeek, getCurrentWeekNumber } from '@/lib/programs';
import { generateProgram } from '@/lib/ai-client';
import Spinner from '@/components/Spinner';
import LevelAssessmentCard from '@/components/LevelAssessmentCard';

// --- SVG Icons ---

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);

const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const LOADING_PHRASES = [
  'Diseñando tu mesociclo personalizado...',
  'Planificando las próximas 4 semanas...',
  'Calculando volumen e intensidad...',
  'Organizando sesiones de entrenamiento...',
  'Periodizando como un coach de élite...',
];

const intensityBadge: Record<string, string> = {
  baja: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  moderada: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  alta: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'muy alta': 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const weekAccent: Record<number, string> = {
  1: 'border-l-blue-500',
  2: 'border-l-amber-500',
  3: 'border-l-red-500',
  4: 'border-l-emerald-500',
};

function SessionCard({ session, isCompleted, isCurrent }: { session: ProgramSession; isCompleted: boolean; isCurrent: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        isCurrent
          ? 'bg-red-50 dark:bg-red-900/10 ring-1 ring-red-500/30'
          : isCompleted
            ? 'bg-neutral-50 dark:bg-neutral-800/30 opacity-60'
            : 'bg-white dark:bg-neutral-800/50'
      }`}
    >
      {/* Session number */}
      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${
        isCompleted
          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
          : isCurrent
            ? 'bg-red-500 text-white'
            : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
      }`}>
        {isCompleted ? <CheckCircleIcon className="h-4 w-4" /> : session.order}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{session.type}</span>
          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${intensityBadge[session.intensity] ?? 'bg-neutral-100 text-neutral-600'}`}>
            {session.intensity}
          </span>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">{session.emphasis}</p>
      </div>
    </div>
  );
}

function WeekCard({ week, isCurrentWeek, completedSessions }: { week: ProgramWeek; isCurrentWeek: boolean; completedSessions: number }) {
  const [expanded, setExpanded] = useState(isCurrentWeek);

  return (
    <div
      className={`rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden border-l-4 ${weekAccent[week.number] ?? 'border-l-neutral-400'} ${
        isCurrentWeek ? 'ring-1 ring-red-500/20' : ''
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              Semana {week.number}
            </span>
            {isCurrentWeek && (
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                Actual
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {week.focus} · Skill: {week.skillFocus}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isCurrentWeek && (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              {completedSessions}/{week.sessions.length}
            </span>
          )}
          <svg
            className={`h-4 w-4 text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Sessions */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {week.sessions.map((session) => (
            <SessionCard
              key={session.order}
              session={session}
              isCompleted={isCurrentWeek && session.order <= completedSessions}
              isCurrent={isCurrentWeek && session.order === completedSessions + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProgramaPage() {
  const [program, setProgram] = useState<MonthlyProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [currentWeek, setCurrentWeek] = useState(1);
  const [wodsThisWeek, setWodsThisWeek] = useState(0);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const now = new Date();
        const prog = await getActiveProgram(now.getMonth() + 1, now.getFullYear());
        setProgram(prog);
        setCurrentWeek(getCurrentWeekNumber());
        const count = await getWodCountThisWeek();
        setWodsThisWeek(count);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Rotate loading phrases
  useEffect(() => {
    if (!generating) {
      setLoadingPhraseIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [generating]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const result = await generateProgram();
      setProgram(result);
      setCurrentWeek(getCurrentWeekNumber());
      const count = await getWodCountThisWeek();
      setWodsThisWeek(count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar el programa.');
    } finally {
      setGenerating(false);
    }
  }, []);

  const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date());
  const year = new Date().getFullYear();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
            Programa Mensual
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 capitalize">
            {monthName} {year}
          </p>
        </div>
        {program && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border-2 border-red-500 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <RefreshIcon className="h-4 w-4" />
            Regenerar
          </button>
        )}
      </div>

      {/* Level Assessment */}
      <LevelAssessmentCard />

      {/* Generating state */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Spinner />
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400 min-h-6 transition-opacity duration-300">
            {LOADING_PHRASES[loadingPhraseIndex]}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!generating && !program && (
        <div className="text-center py-16">
          <CalendarIcon className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
          <h3 className="text-lg font-medium text-neutral-500 dark:text-neutral-400 mb-2">
            Sin programa activo
          </h3>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-8 max-w-md mx-auto">
            Genera un programa de 4 semanas personalizado con progresión, variedad de sesiones y skill focus semanal.
          </p>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-bold uppercase tracking-wider text-white bg-red-500 rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-neutral-900"
          >
            <CalendarIcon className="h-5 w-5" />
            Generar Programa
          </button>
        </div>
      )}

      {/* Program grid */}
      {!generating && program && (
        <div className="space-y-4">
          {program.weeks.map((week) => (
            <WeekCard
              key={week.number}
              week={week}
              isCurrentWeek={week.number === currentWeek}
              completedSessions={week.number === currentWeek ? wodsThisWeek : 0}
            />
          ))}
        </div>
      )}

      {/* Weekly analysis */}
    </div>
  );
}
