import { createClient } from '@/lib/supabase/client';
import type { ExperienceLevel, Objective, TrainingType, EquipmentLevel, WeightUnit, Gender } from '@/types/profile';

export interface ProfileUpdateInput {
  display_name: string;
  age: number;
  experience_level: ExperienceLevel;
  injury_history: string | null;
  objectives: Objective[];
  training_type: TrainingType;
  equipment_level: EquipmentLevel;
  weight_unit?: WeightUnit;
  training_frequency?: number | null;
  gender?: Gender | null;
  weight?: number | null;
  height?: number | null;
}

export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: input.display_name,
      age: input.age,
      experience_level: input.experience_level,
      injury_history: input.injury_history,
      objectives: input.objectives,
      training_type: input.training_type,
      equipment_level: input.equipment_level,
      ...(input.weight_unit !== undefined && { weight_unit: input.weight_unit }),
      ...(input.training_frequency !== undefined && { training_frequency: input.training_frequency }),
      ...(input.gender !== undefined && { gender: input.gender }),
      ...(input.weight !== undefined && { weight: input.weight }),
      ...(input.height !== undefined && { height: input.height }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(`Error al actualizar perfil: ${error.message}`);
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(`Error al actualizar nombre: ${error.message}`);
}

/** Da o retira el permiso de enviar datos de entrenamiento a Anthropic (Claude). */
export async function setAIConsent(userId: string, granted: boolean): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('profiles')
    .update({ ai_consent_at: granted ? now : null, updated_at: now })
    .eq('id', userId);

  if (error) throw new Error(`Error al guardar el permiso: ${error.message}`);
}
