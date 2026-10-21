import type { SupabaseClient } from '@supabase/supabase-js';
import type { MonthlyProgram, ProgramWeek } from '@/types/program';

// El programa avanza con las sesiones completadas (resultados registrados en
// workout_feedback), no con el calendario: si entrenas una vez a la semana con
// un plan de tres días, sigues en la semana 1 hasta completar sus sesiones.

/** Días sin entrenar a partir de los cuales se pregunta cómo retomar. */
export const RESUME_GAP_DAYS = 7;

export interface ActiveProgram extends MonthlyProgram {
  started_at: string;
  session_offset: number;
  resume_ack_at: string | null;
}

export interface ProgramPosition {
  weekNumber: number;
  /** Índice (0-based) de la siguiente sesión dentro de la semana */
  sessionIndex: number;
  totalCompleted: number;
  totalSessions: number;
  finished: boolean;
}

export interface ProgramProgress extends ProgramPosition {
  lastSessionAt: string | null;
  daysSinceLastSession: number;
  needsResume: boolean;
}

export function computeProgramPosition(weeks: ProgramWeek[], completed: number): ProgramPosition {
  const ordered = [...weeks].sort((a, b) => a.number - b.number);
  const totalSessions = ordered.reduce((sum, w) => sum + w.sessions.length, 0);
  let remaining = Math.max(0, completed);

  for (const week of ordered) {
    if (remaining < week.sessions.length) {
      return { weekNumber: week.number, sessionIndex: remaining, totalCompleted: completed, totalSessions, finished: false };
    }
    remaining -= week.sessions.length;
  }

  const last = ordered[ordered.length - 1];
  return {
    weekNumber: last?.number ?? 1,
    sessionIndex: Math.max(0, (last?.sessions.length ?? 1) - 1),
    totalCompleted: completed,
    totalSessions,
    finished: true,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Pregunta cómo retomar tras una pausa de RESUME_GAP_DAYS o más, una sola vez
 * por pausa: si el usuario ya respondió después de su última sesión, no se repite.
 */
export function needsResumePrompt(args: {
  lastSessionAt: string | null;
  startedAt: string;
  resumeAckAt: string | null;
  finished: boolean;
  now?: Date;
}): { needsResume: boolean; daysSince: number } {
  const now = args.now ?? new Date();
  // La pausa se mide desde lo más reciente: la última sesión o el inicio del
  // programa (una pausa anterior a regenerarlo no cuenta)
  const started = new Date(args.startedAt);
  const last = args.lastSessionAt ? new Date(args.lastSessionAt) : null;
  const reference = last && last > started ? last : started;
  const daysSince = Math.floor((now.getTime() - reference.getTime()) / DAY_MS);
  if (args.finished || daysSince < RESUME_GAP_DAYS) return { needsResume: false, daysSince };
  const answered = args.resumeAckAt ? new Date(args.resumeAckAt) > reference : false;
  return { needsResume: !answered, daysSince };
}

/**
 * El programa activo es el último que se empezó, aunque sea del mes anterior.
 * Se ordena por started_at porque regenerar en el mismo mes actualiza la fila
 * (conserva created_at) y reinicia started_at.
 */
export async function fetchActiveProgram(supabase: SupabaseClient, userId: string): Promise<ActiveProgram | null> {
  const { data, error } = await supabase
    .from('training_programs')
    .select('id, user_id, month, year, structure, created_at, started_at, session_offset, resume_ack_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    user_id: data.user_id,
    month: data.month,
    year: data.year,
    weeks: data.structure as ProgramWeek[],
    created_at: data.created_at,
    started_at: data.started_at ?? data.created_at,
    session_offset: data.session_offset ?? 0,
    resume_ack_at: data.resume_ack_at ?? null,
  };
}

export async function fetchProgramProgress(
  supabase: SupabaseClient,
  userId: string,
  program: ActiveProgram
): Promise<ProgramProgress> {
  const [countResult, lastResult] = await Promise.all([
    supabase
      .from('workout_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', program.started_at),
    supabase
      .from('workout_feedback')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const completed = Math.max(0, (countResult.count ?? 0) - program.session_offset);
  const position = computeProgramPosition(program.weeks, completed);
  const lastSessionAt = (lastResult.data?.created_at as string | undefined) ?? null;
  const { needsResume, daysSince } = needsResumePrompt({
    lastSessionAt,
    startedAt: program.started_at,
    resumeAckAt: program.resume_ack_at,
    finished: position.finished,
  });

  return { ...position, lastSessionAt, daysSinceLastSession: daysSince, needsResume };
}

export async function fetchProgramWithProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<{ program: ActiveProgram; progress: ProgramProgress } | null> {
  const program = await fetchActiveProgram(supabase, userId);
  if (!program) return null;
  const progress = await fetchProgramProgress(supabase, userId, program);
  return { program, progress };
}
