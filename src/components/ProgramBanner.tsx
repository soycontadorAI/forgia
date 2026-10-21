'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { MonthlyProgram, ProgramSession } from '@/types/program';
import { getActiveProgram, getWodCountThisWeek, getCurrentWeekNumber } from '@/lib/programs';

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);

const ArrowRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

const intensityColor: Record<string, string> = {
  baja: 'text-emerald-500',
  moderada: 'text-amber-500',
  alta: 'text-red-500',
  'muy alta': 'text-red-600',
};

export default function ProgramBanner() {
  const [program, setProgram] = useState<MonthlyProgram | null>(null);
  const [currentSession, setCurrentSession] = useState<ProgramSession | null>(null);
  const [weekNumber, setWeekNumber] = useState(1);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const prog = await getActiveProgram(month, year);
        if (!prog) {
          setLoading(false);
          return;
        }

        setProgram(prog);
        const week = getCurrentWeekNumber();
        setWeekNumber(week);

        const currentWeek = prog.weeks.find((w) => w.number === week);
        if (!currentWeek) {
          setLoading(false);
          return;
        }

        setTotalSessions(currentWeek.sessions.length);
        const wodsThisWeek = await getWodCountThisWeek();
        const nextSessionIdx = Math.min(wodsThisWeek, currentWeek.sessions.length - 1);
        setSessionIndex(nextSessionIdx);
        setCurrentSession(currentWeek.sessions[nextSessionIdx]);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return null;

  // No program — show CTA
  if (!program) {
    return (
      <Link
        href="/app/progreso/programa"
        className="flex items-center justify-between gap-3 mb-6 p-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-red-500 dark:hover:border-red-500 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-hover:text-red-500 transition-colors" />
          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-red-500 transition-colors">
            Genera tu programa mensual
          </span>
        </div>
        <ArrowRightIcon className="h-4 w-4 text-neutral-400 group-hover:text-red-500 transition-colors" />
      </Link>
    );
  }

  const currentWeek = program.weeks.find((w) => w.number === weekNumber);

  return (
    <Link
      href="/app/progreso/programa"
      className="block mb-6 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-red-500/50 dark:hover:border-red-500/50 transition-colors bg-neutral-50 dark:bg-neutral-900/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CalendarIcon className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider text-red-500">
              Semana {weekNumber} · {currentWeek?.focus}
            </span>
          </div>
          {currentSession && (
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
              Sesión {sessionIndex + 1}/{totalSessions}: {currentSession.type} — {currentSession.emphasis}
            </p>
          )}
          {currentWeek && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Skill: {currentWeek.skillFocus}
              {currentSession && (
                <> · Intensidad: <span className={intensityColor[currentSession.intensity] ?? ''}>{currentSession.intensity}</span></>
              )}
            </p>
          )}
        </div>
        <ArrowRightIcon className="h-4 w-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-1" />
      </div>
    </Link>
  );
}
