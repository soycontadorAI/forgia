import { createClient } from '@/lib/supabase/client';

export interface WeekLoad {
  /** Lunes de la semana, YYYY-MM-DD */
  weekStart: string;
  sessions: number;
  avgDifficulty: number | null;
  /** Sesiones × dificultad promedio: aproximación simple de la carga percibida */
  load: number;
}

export interface RecordPoint {
  date: string;
  value: number;
}

export interface RecordTrend {
  movement: string;
  unit: string;
  points: RecordPoint[];
}

export interface ProgressSummary {
  weeks: WeekLoad[];
  thisWeek: { sessions: number; avgDifficulty: number | null; rx: number; scaled: number };
  trend: RecordTrend | null;
}

interface FeedbackRow {
  difficulty_rating: number;
  rx_or_scaled: string;
  created_at: string;
}

interface RecordRow {
  movement_name: string;
  value: number;
  unit: string;
  date_achieved: string;
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Agrupa el feedback por semana (lunes a domingo), de la más antigua a la actual. */
export function buildWeeklyLoad(feedback: FeedbackRow[], weekCount: number, now = new Date()): WeekLoad[] {
  const currentMonday = mondayOf(now);
  const weeks: WeekLoad[] = [];

  for (let i = weekCount - 1; i >= 0; i--) {
    const start = new Date(currentMonday);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const inWeek = feedback.filter((f) => {
      const t = new Date(f.created_at);
      return t >= start && t < end;
    });
    const avg = inWeek.length ? inWeek.reduce((sum, f) => sum + f.difficulty_rating, 0) / inWeek.length : null;
    weeks.push({
      weekStart: dateKey(start),
      sessions: inWeek.length,
      avgDifficulty: avg === null ? null : Math.round(avg * 10) / 10,
      load: Math.round(inWeek.length * (avg ?? 0)),
    });
  }

  return weeks;
}

/**
 * Elige el movimiento con más registros de 1RM (mínimo dos) para mostrar su
 * tendencia; a igualdad, el más reciente.
 */
export function pickRecordTrend(records: RecordRow[]): RecordTrend | null {
  const byMovement = new Map<string, RecordRow[]>();
  for (const r of records) {
    const list = byMovement.get(r.movement_name) ?? [];
    list.push(r);
    byMovement.set(r.movement_name, list);
  }

  let best: RecordRow[] | null = null;
  for (const list of byMovement.values()) {
    if (list.length < 2) continue;
    const latest = (rows: RecordRow[]) => rows.reduce((max, r) => (r.date_achieved > max ? r.date_achieved : max), '');
    if (!best || list.length > best.length || (list.length === best.length && latest(list) > latest(best))) {
      best = list;
    }
  }
  if (!best) return null;

  const sorted = [...best].sort((a, b) => a.date_achieved.localeCompare(b.date_achieved));
  return {
    movement: sorted[0].movement_name,
    unit: sorted[sorted.length - 1].unit,
    points: sorted.map((r) => ({ date: r.date_achieved, value: Number(r.value) })),
  };
}

export async function getProgressSummary(userId: string, weekCount = 6): Promise<ProgressSummary> {
  const supabase = createClient();
  const since = mondayOf(new Date());
  since.setDate(since.getDate() - (weekCount - 1) * 7);

  const [feedbackResult, recordsResult] = await Promise.all([
    supabase
      .from('workout_feedback')
      .select('difficulty_rating, rx_or_scaled, created_at')
      .eq('user_id', userId)
      .gte('created_at', since.toISOString()),
    supabase
      .from('personal_records')
      .select('movement_name, value, unit, date_achieved')
      .eq('user_id', userId)
      .eq('record_type', '1RM')
      .order('date_achieved', { ascending: true })
      .limit(200),
  ]);

  if (feedbackResult.error) throw new Error(`Error al cargar progreso: ${feedbackResult.error.message}`);
  if (recordsResult.error) throw new Error(`Error al cargar records: ${recordsResult.error.message}`);

  const feedback = (feedbackResult.data ?? []) as FeedbackRow[];
  const weeks = buildWeeklyLoad(feedback, weekCount);
  const currentStart = new Date(`${weeks[weeks.length - 1].weekStart}T00:00:00`);
  const current = feedback.filter((f) => new Date(f.created_at) >= currentStart);

  return {
    weeks,
    thisWeek: {
      sessions: current.length,
      avgDifficulty: weeks[weeks.length - 1].avgDifficulty,
      rx: current.filter((f) => f.rx_or_scaled === 'Rx').length,
      scaled: current.filter((f) => f.rx_or_scaled === 'Scaled').length,
    },
    trend: pickRecordTrend((recordsResult.data ?? []) as RecordRow[]),
  };
}
