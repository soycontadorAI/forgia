'use client';

import { useState, useMemo } from 'react';
import type { SavedWod, WorkoutFeedback } from '@/types/wod';
import { groupWodsByDate, getCalendarDays, dateToKey, formatMonthYear, DAY_NAMES_SHORT } from '@/lib/dateUtils';
import WodDisplay from '@/components/WodDisplay';
import CopyWodButton from '@/components/CopyWodButton';
import PrintWodButton from '@/components/PrintWodButton';
import Spinner from '@/components/Spinner';
import { Flame, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface CalendarViewProps {
  savedWods: SavedWod[];
  feedbackMap: Record<string, WorkoutFeedback | null>;
  loadingFeedback: Record<string, boolean>;
  expandedId: string | null;
  onExpand: (wodId: string) => void;
  onDelete: (id: string) => void;
  onRegisterFeedback: (saved: SavedWod) => void;
  wodsWithFeedback: Set<string>;
}

// --- Helpers ---

function formatDateUppercase(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const formatted = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  return formatted.toUpperCase();
}

function getMetconSummary(wod: SavedWod['wod']): string {
  const type = wod.metcon.type || '';
  const duration = wod.metcon.duration || '';
  if (type && duration) {
    const numMatch = duration.match(/(\d+)/);
    return numMatch ? `${type} ${numMatch[1]}` : type;
  }
  return type || 'WOD';
}

function getMovementsSummary(wod: SavedWod['wod']): string {
  const movements = wod.metcon.movements || wod.metcon.parts || wod.metcon.details || [];
  if (movements.length === 0) return '';
  return movements.slice(0, 2).map(m => {
    const match = m.match(/^\d+[\s\w]*?\s+(.+)$/);
    return match ? match[1] : m;
  }).join(', ');
}

export default function CalendarView({
  savedWods,
  feedbackMap,
  loadingFeedback,
  expandedId,
  onExpand,
  onDelete,
  onRegisterFeedback,
  wodsWithFeedback,
}: CalendarViewProps) {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const wodsByDate = useMemo(() => groupWodsByDate(savedWods), [savedWods]);
  const calendarDays = useMemo(() => getCalendarDays(currentYear, currentMonth), [currentYear, currentMonth]);
  const todayKey = dateToKey(new Date());

  const { selectedDayWods, wodsInMonth } = useMemo(() => {
    const selected = selectedDateKey ? wodsByDate.get(selectedDateKey) ?? [] : [];
    let count = 0;
    for (const dayInfo of calendarDays) {
      if (dayInfo.isCurrentMonth) {
        count += (wodsByDate.get(dateToKey(dayInfo.date)) ?? []).length;
      }
    }
    return { selectedDayWods: selected, wodsInMonth: count };
  }, [selectedDateKey, wodsByDate, calendarDays]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDateKey(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDateKey(null);
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-150"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {formatMonthYear(currentYear, currentMonth)}
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors duration-150"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES_SHORT.map((name) => (
          <div key={name} className="text-center text-xs font-semibold text-neutral-500 dark:text-neutral-400 py-1 uppercase">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayInfo, idx) => {
          const key = dateToKey(dayInfo.date);
          const dayWods = wodsByDate.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDateKey;
          const hasWods = dayWods.length > 0;
          const hasFeedback = dayWods.some((w) => feedbackMap[w.id] != null || wodsWithFeedback.has(w.id));

          return (
            <button
              key={idx}
              onClick={() => hasWods && setSelectedDateKey(isSelected ? null : key)}
              disabled={!hasWods}
              className={`
                relative aspect-square flex flex-col items-center justify-center rounded-lg
                text-sm transition-colors duration-150
                ${!dayInfo.isCurrentMonth ? 'text-neutral-300 dark:text-neutral-600' : ''}
                ${dayInfo.isCurrentMonth && !hasWods ? 'text-neutral-500 dark:text-neutral-400 cursor-default' : ''}
                ${hasWods ? 'cursor-pointer font-bold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/50' : ''}
                ${isSelected ? 'bg-red-500/10 dark:bg-red-500/20 ring-2 ring-red-500' : ''}
                ${hasFeedback && !isSelected ? 'bg-emerald-50 dark:bg-emerald-500/10' : ''}
                ${isToday && !isSelected && !hasFeedback ? 'bg-neutral-100 dark:bg-neutral-800/50' : ''}
              `}
            >
              <span>{dayInfo.date.getDate()}</span>
              {hasWods && !hasFeedback && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayWods.slice(0, 3).map((_, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  ))}
                  {dayWods.length > 3 && (
                    <span className="text-[9px] text-red-500 font-bold leading-none">+</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Monthly summary */}
      <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
        {wodsInMonth} {wodsInMonth === 1 ? 'entrenamiento' : 'entrenamientos'} este mes
      </p>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-500" />
          <span>Sin feedback</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30" />
          <span>Feedback completado</span>
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDateKey && selectedDayWods.length > 0 && (
        <div className="animate-fade-in-up space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          {/* Date header */}
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {formatDateUppercase(selectedDateKey)}
          </p>

          {selectedDayWods.map((saved, wodIdx) => {
            const feedback = feedbackMap[saved.id];
            const hasFbLoaded = feedback != null;
            const hasFb = hasFbLoaded || wodsWithFeedback.has(saved.id);
            const metconSummary = getMetconSummary(saved.wod);
            const movementsSummary = getMovementsSummary(saved.wod);

            return (
              <div key={saved.id} className="space-y-4">
                {/* WOD title */}
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {saved.wod.title}
                </h3>

                {/* Metcon info line */}
                <div className="flex flex-col gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="font-medium">{metconSummary}</span>
                  </div>
                  {movementsSummary && (
                    <span>{movementsSummary}</span>
                  )}
                </div>

                {/* Feedback stats inline */}
                {hasFbLoaded && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    <span>Dificultad: <strong className="text-neutral-900 dark:text-white">{feedback!.difficulty_rating}/10</strong></span>
                    <span>&middot;</span>
                    <span className="font-medium text-neutral-900 dark:text-white bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-xs">
                      {feedback!.rx_or_scaled}
                    </span>
                    {feedback!.total_time_minutes && (
                      <>
                        <span>&middot;</span>
                        <span>{feedback!.total_time_minutes} min</span>
                      </>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onExpand(saved.id)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm font-semibold transition-colors"
                  >
                    {expandedId === saved.id ? 'Ocultar WOD' : 'Ver WOD completo'}
                  </button>
                  {hasFbLoaded ? (
                    <button
                      disabled
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold cursor-default border border-emerald-500/20"
                    >
                      Feedback registrado
                    </button>
                  ) : hasFb ? (
                    <button
                      onClick={() => onExpand(saved.id)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-500 text-red-500 hover:bg-red-500/10 text-sm font-semibold transition-colors"
                    >
                      Cargar Feedback
                    </button>
                  ) : (
                    <button
                      onClick={() => onRegisterFeedback(saved)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-500 text-red-500 hover:bg-red-500/10 text-sm font-semibold transition-colors"
                    >
                      Registrar feedback
                    </button>
                  )}
                </div>

                {/* Expanded WOD detail */}
                {expandedId === saved.id && (
                  <div className="animate-fade-in-up border-t border-neutral-200 dark:border-neutral-700 pt-4">
                    <WodDisplay wod={saved.wod} />
                    <div className="flex flex-wrap justify-center items-center gap-3 mt-6">
                      <CopyWodButton wod={saved.wod} />
                      <PrintWodButton />
                      <button
                        onClick={() => onDelete(saved.id)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Borrar
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading feedback */}
                {loadingFeedback[saved.id] && (
                  <div className="flex justify-center py-2">
                    <Spinner />
                  </div>
                )}

                {/* Separator between multiple WODs on same day */}
                {wodIdx < selectedDayWods.length - 1 && (
                  <div className="border-t border-neutral-200 dark:border-neutral-700" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
