import { createClient } from '@/lib/supabase/client';

// Constancia: cuántos días entrenó el usuario esta semana contra su meta
// (training_frequency) y cuántas semanas seguidas la ha cumplido. Un día
// cuenta si tiene al menos un resultado registrado (WOD o plantilla).

export const DEFAULT_WEEKLY_GOAL = 3;
const STREAK_LOOKBACK_WEEKS = 26;

/** Se emite al guardar un resultado: la meta semanal de Hoy se recarga. */
export const RESULT_SAVED_EVENT = 'forgia:result-saved';

export function notifyResultSaved() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(RESULT_SAVED_EVENT));
}

export interface WeekConsistency {
  /** Lunes a domingo: true si ese día hay un resultado registrado */
  days: boolean[];
  /** Índice de hoy en `days` (0 = lunes) */
  todayIndex: number;
  trainedToday: boolean;
  daysThisWeek: number;
  goal: number;
  /** Semanas seguidas cumpliendo la meta; la semana en curso suma al cumplirla y nunca rompe la racha */
  streakWeeks: number;
  /** Días que quedan en la semana, contando hoy */
  daysLeft: number;
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function buildWeekConsistency(activity: Date[], goal: number, now = new Date()): WeekConsistency {
  const monday = mondayOf(now);
  const todayIndex = (now.getDay() + 6) % 7;

  // Días distintos con actividad, agrupados por semana (0 = semana en curso)
  const daysByWeek = new Map<number, Set<string>>();
  for (const date of activity) {
    const weeksAgo = Math.round((monday.getTime() - mondayOf(date).getTime()) / WEEK_MS);
    if (weeksAgo < 0) continue;
    if (!daysByWeek.has(weeksAgo)) daysByWeek.set(weeksAgo, new Set());
    daysByWeek.get(weeksAgo)!.add(dayKey(date));
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return daysByWeek.get(0)?.has(dayKey(d)) ?? false;
  });
  const daysThisWeek = days.filter(Boolean).length;

  let streakWeeks = daysThisWeek >= goal ? 1 : 0;
  for (let w = 1; (daysByWeek.get(w)?.size ?? 0) >= goal; w++) streakWeeks++;

  return {
    days,
    todayIndex,
    trainedToday: days[todayIndex],
    daysThisWeek,
    goal,
    streakWeeks,
    daysLeft: 7 - todayIndex,
  };
}

export async function getWeekConsistency(userId: string, goal: number | null): Promise<WeekConsistency> {
  const supabase = createClient();
  const since = mondayOf(new Date());
  since.setDate(since.getDate() - STREAK_LOOKBACK_WEEKS * 7);

  const [feedback, templates] = await Promise.all([
    supabase.from('workout_feedback').select('created_at').eq('user_id', userId).gte('created_at', since.toISOString()),
    supabase.from('template_results').select('created_at').eq('user_id', userId).gte('created_at', since.toISOString()),
  ]);
  if (feedback.error) throw new Error(`Error al cargar tu semana: ${feedback.error.message}`);

  const activity = [...(feedback.data ?? []), ...(templates.data ?? [])].map((r) => new Date(r.created_at as string));
  return buildWeekConsistency(activity, goal && goal > 0 ? Math.min(goal, 7) : DEFAULT_WEEKLY_GOAL);
}
