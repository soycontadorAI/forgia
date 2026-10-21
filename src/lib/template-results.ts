import { createClient } from '@/lib/supabase/client';
import type { TemplateResult, TemplateResultInput } from '@/types/wod-template';

export async function saveTemplateResult(
  userId: string,
  input: TemplateResultInput
): Promise<TemplateResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('template_results')
    .insert({
      user_id: userId,
      template_id: input.template_id,
      score_value: input.score_value,
      score_type: input.score_type,
      rx_or_scaled: input.rx_or_scaled,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Error al guardar resultado: ${error.message}`);
  return data as TemplateResult;
}

export async function getResultsForTemplate(
  userId: string,
  templateId: string
): Promise<TemplateResult[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('template_results')
    .select('*')
    .eq('user_id', userId)
    .eq('template_id', templateId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Error al cargar resultados: ${error.message}`);
  return (data ?? []) as TemplateResult[];
}

export async function getAllTemplateResults(
  userId: string
): Promise<TemplateResult[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('template_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(`Error al cargar resultados: ${error.message}`);
  return (data ?? []) as TemplateResult[];
}

/** Returns the best (most recent) result per template. */
export async function getBestResults(
  userId: string
): Promise<Map<string, TemplateResult>> {
  const all = await getAllTemplateResults(userId);
  const best = new Map<string, TemplateResult>();
  for (const result of all) {
    if (!best.has(result.template_id)) {
      best.set(result.template_id, result);
    }
  }
  return best;
}

export async function deleteTemplateResult(resultId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('template_results')
    .delete()
    .eq('id', resultId);

  if (error) throw new Error(`Error al eliminar resultado: ${error.message}`);
}
