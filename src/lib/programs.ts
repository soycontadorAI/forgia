import { createClient } from '@/lib/supabase/client';
import {
  fetchProgramWithProgress,
  type ActiveProgram,
  type ProgramProgress,
} from '@/lib/program-progress';

export type { ActiveProgram, ProgramProgress };

/** Programa activo y en qué sesión va el usuario (para la app web). */
export async function getActiveProgramWithProgress(): Promise<{ program: ActiveProgram; progress: ProgramProgress } | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return fetchProgramWithProgress(supabase, data.user.id);
}

export type ResumeChoice = 'continue' | 'repeat_week';

/**
 * Respuesta a "¿cómo retomamos?". "continue" sigue donde se quedó; "repeat_week"
 * regresa al inicio de la semana actual descontando las sesiones ya hechas en ella.
 * (Un programa nuevo se genera desde la página de Programa.)
 */
export async function resumeProgram(program: ActiveProgram, progress: ProgramProgress, choice: ResumeChoice): Promise<void> {
  const supabase = createClient();
  const update: { resume_ack_at: string; session_offset?: number } = { resume_ack_at: new Date().toISOString() };
  if (choice === 'repeat_week') {
    update.session_offset = program.session_offset + progress.sessionIndex;
  }
  const { error } = await supabase.from('training_programs').update(update).eq('id', program.id);
  if (error) throw new Error(`Error al actualizar el programa: ${error.message}`);
}
