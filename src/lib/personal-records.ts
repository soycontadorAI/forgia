import { createClient } from '@/lib/supabase/client';
import type { PersonalRecord, PersonalRecordInput, RecordType } from '@/types/personal-records';

export async function savePersonalRecord(
  userId: string,
  input: PersonalRecordInput
): Promise<PersonalRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('personal_records')
    .insert({
      user_id: userId,
      movement_name: input.movement_name,
      record_type: input.record_type,
      value: input.value,
      unit: input.unit,
      date_achieved: input.date_achieved,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Error al guardar record: ${error.message}`);
  return data as PersonalRecord;
}

export async function getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .order('date_achieved', { ascending: false });

  if (error) throw new Error(`Error al cargar records: ${error.message}`);
  return (data ?? []) as PersonalRecord[];
}

export async function getRecordsForMovement(
  userId: string,
  movementName: string
): Promise<PersonalRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .eq('movement_name', movementName)
    .order('date_achieved', { ascending: false });

  if (error) throw new Error(`Error al cargar records del movimiento: ${error.message}`);
  return (data ?? []) as PersonalRecord[];
}

/** Returns the most recent 1RM for each movement (best for WOD generation context). */
export async function getBestRecords(userId: string): Promise<PersonalRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .eq('record_type', '1RM')
    .order('date_achieved', { ascending: false });

  if (error) throw new Error(`Error al cargar mejores records: ${error.message}`);

  // Deduplicate: keep only the most recent 1RM per movement
  const seen = new Set<string>();
  const best: PersonalRecord[] = [];
  for (const record of (data ?? []) as PersonalRecord[]) {
    if (!seen.has(record.movement_name)) {
      seen.add(record.movement_name);
      best.push(record);
    }
  }

  return best;
}

// Priority of the record type shown as "Mejor" when a movement has several
const PRIMARY_RECORD_TYPE_ORDER: RecordType[] = ['1RM', '3RM', '5RM', 'max_reps', 'time'];
const LBS_TO_KG = 0.45359237;

/** Comparable value: weights normalized to kg; time is negated so lower wins. */
function comparableValue(record: PersonalRecord): number {
  if (record.unit === 'lbs') return record.value * LBS_TO_KG;
  if (record.record_type === 'time') return -record.value;
  return record.value;
}

/**
 * Best record of a single movement: picks the primary record type it has
 * (1RM first) and returns the max within that type only, so 1RM/3RM/5RM
 * are never compared against each other. Weights in kg and lbs are compared
 * normalized; for `time` the lowest wins. Ties keep the first record
 * (the most recent when the input is sorted by date desc).
 */
export function getBestRecord(records: PersonalRecord[]): PersonalRecord | null {
  const primaryType = PRIMARY_RECORD_TYPE_ORDER.find((type) =>
    records.some((r) => r.record_type === type)
  );
  if (!primaryType) return records[0] ?? null;

  let best: PersonalRecord | null = null;
  for (const record of records) {
    if (record.record_type !== primaryType) continue;
    if (!best || comparableValue(record) > comparableValue(best)) best = record;
  }
  return best;
}

export async function deletePersonalRecord(recordId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('personal_records')
    .delete()
    .eq('id', recordId);

  if (error) throw new Error(`Error al eliminar record: ${error.message}`);
}
