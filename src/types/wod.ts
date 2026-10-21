export interface WodSection {
  title: string;
  duration?: string;
  parts?: string[];
  details?: string[];
  type?: string;
  description?: string;
  movements?: string[];
  notes?: string;
  notesLabel?: string;
}

export interface Wod {
  title: string;
  warmUp: WodSection;
  strengthSkill: WodSection;
  metcon: WodSection;
  coolDown: WodSection;
}

/** WOD a medio generar durante el streaming: cualquier campo puede faltar. */
export type PartialWod = {
  title?: string;
  warmUp?: Partial<WodSection>;
  strengthSkill?: Partial<WodSection>;
  metcon?: Partial<WodSection>;
  coolDown?: Partial<WodSection>;
};

export interface GenerateWodRequest {
  sessionNotes?: string;
}

export interface SavedWod {
  id: string;
  user_id: string;
  wod: Wod;
  created_at: string;
}

export type RxOrScaled = 'Rx' | 'Scaled';

export type WodSectionKey = 'warmUp' | 'strengthSkill' | 'metcon' | 'coolDown';

/** Segundos reales por sección, medidos en el live mode */
export type SectionTimes = Partial<Record<WodSectionKey, number>>;

export interface WorkoutFeedback {
  id: string;
  user_id: string;
  wod_id: string | null;
  wod_snapshot: Wod;
  difficulty_rating: number;
  total_time_minutes: number | null;
  rx_or_scaled: RxOrScaled;
  notes: string | null;
  gemini_analysis: GeminiAnalysis | null;
  started_at: string | null;
  ended_at: string | null;
  section_times: SectionTimes | null;
  created_at: string;
}

export interface WorkoutFeedbackInput {
  wod_id?: string | null;
  wod_snapshot: Wod;
  difficulty_rating: number;
  total_time_minutes?: number | null;
  rx_or_scaled: RxOrScaled;
  notes?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  section_times?: SectionTimes | null;
}

export interface GeminiAnalysis {
  resumen: string;
  fortalezas: string[];
  areas_mejora: string[];
  recomendaciones: string[];
  progresion_sugerida: string;
}

