export type ExperienceLevel = 'Novato' | 'Principiante' | 'Intermedio' | 'Avanzado';

export type WeightUnit = 'kg' | 'lbs';

export type Objective =
  | 'Ganar fuerza'
  | 'Ganar masa muscular'
  | 'Perder peso'
  | 'Reducir tallas'
  | 'Mejorar resistencia'
  | 'Mejorar movilidad'
  | 'Preparación para competencia'
  | 'Preparación HYROX';

export type TrainingType = 'CrossFit';

export type CrossFitEquipment =
  | 'Box completo'
  | 'Box equipado básico'
  | 'Gimnasio tradicional'
  | 'Peso corporal + equipamiento mínimo';

export type EquipmentLevel = CrossFitEquipment;

export type Gender = 'hombre' | 'mujer' | 'prefiero_no_definir';

export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  age: number | null;
  experience_level: ExperienceLevel | null;
  injury_history: string | null;
  objectives: Objective[] | null;
  training_type: TrainingType | null;
  equipment_level: EquipmentLevel | null;
  weight_unit: WeightUnit;
  training_frequency: number | null;
  terms_accepted_at: string | null;
  /** Permiso para enviar datos de entrenamiento a Anthropic (Claude); null = sin permiso */
  ai_consent_at: string | null;
  gender: Gender | null;
  weight: number | null;
  height: number | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean;
}
