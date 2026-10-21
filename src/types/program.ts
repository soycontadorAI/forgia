export type SessionIntensity = 'baja' | 'moderada' | 'alta' | 'muy alta';

export interface ProgramSession {
  order: number;
  type: string;
  emphasis: string;
  intensity: SessionIntensity;
}

export interface ProgramWeek {
  number: number;
  focus: string;
  skillFocus: string;
  sessions: ProgramSession[];
}

export interface MonthlyProgram {
  id: string;
  user_id: string;
  month: number;
  year: number;
  weeks: ProgramWeek[];
  created_at: string;
  /** Inicio del avance: se reinicia al regenerar el programa */
  started_at?: string;
  /** Sesiones completadas que no cuentan (al repetir una semana) */
  session_offset?: number;
  /** Última respuesta a "¿cómo retomamos?" tras una pausa */
  resume_ack_at?: string | null;
}
