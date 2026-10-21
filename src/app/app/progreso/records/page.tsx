'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { WeightUnit } from '@/types/profile';
import type { PersonalRecord, PersonalRecordInput, RecordType, RecordUnit } from '@/types/personal-records';
import { savePersonalRecord, getPersonalRecords, deletePersonalRecord, getBestRecord } from '@/lib/personal-records';
import { dateToKey, parseDateKey } from '@/lib/dateUtils';
import { MOVEMENT_CATEGORIES, ALL_MOVEMENTS } from '@/lib/movement-constants';
import RMCalculator from '@/components/RMCalculator';
import SegmentedButton from '@/components/ui/SegmentedButton';
import { toast } from 'sonner';
import { Plus, Trash2, Trophy, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

// Group records by movement
function groupByMovement(records: PersonalRecord[]): Map<string, PersonalRecord[]> {
  const grouped = new Map<string, PersonalRecord[]>();
  for (const r of records) {
    const existing = grouped.get(r.movement_name) || [];
    existing.push(r);
    grouped.set(r.movement_name, existing);
  }
  return grouped;
}

export default function RecordsPage() {
  const { user, profile } = useAuth();
  const weightUnit: WeightUnit = profile?.weight_unit || 'lbs';

  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMovement, setExpandedMovement] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const initialFormState = {
    movement: '',
    customMovement: '',
    recordType: '1RM' as RecordType,
    value: '',
    date: dateToKey(new Date()),
    notes: '',
  };
  const [form, setForm] = useState(initialFormState);
  const updateForm = <K extends keyof typeof initialFormState>(field: K, value: typeof initialFormState[K]) =>
    setForm(prev => ({ ...prev, [field]: value }));
  const [isSaving, setIsSaving] = useState(false);

  const loadRecords = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getPersonalRecords(user.id);
      setRecords(data);
    } catch (err) {
      console.error('Error loading records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const getUnitForRecordType = (type: RecordType): RecordUnit => {
    switch (type) {
      case '1RM':
      case '3RM':
      case '5RM':
        return weightUnit;
      case 'max_reps':
        return 'reps';
      case 'time':
        return 'seconds';
    }
  };

  const formatRecordValue = (record: PersonalRecord): string => {
    switch (record.unit) {
      case 'kg':
      case 'lbs':
        return `${record.value} ${record.unit}`;
      case 'reps':
        return `${record.value} reps`;
      case 'seconds': {
        const mins = Math.floor(record.value / 60);
        const secs = Math.round(record.value % 60);
        return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
      }
    }
  };

  const handleSave = async () => {
    if (!user || isSaving) return;

    const movementName = form.movement === '__custom__' ? form.customMovement.trim() : form.movement;
    if (!movementName || !form.value) return;

    setIsSaving(true);
    try {
      const input: PersonalRecordInput = {
        movement_name: movementName,
        record_type: form.recordType,
        value: parseFloat(form.value),
        unit: getUnitForRecordType(form.recordType),
        date_achieved: form.date,
        notes: form.notes.trim() || null,
      };

      await savePersonalRecord(user.id, input);
      await loadRecords();
      toast.success('PR guardado correctamente.');

      // Reset form
      setForm(initialFormState);
      setShowForm(false);
    } catch (err) {
      console.error('Error saving record:', err);
      toast.error('No se pudo guardar el record.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    try {
      await deletePersonalRecord(recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      toast.success('Record eliminado.');
    } catch (err) {
      console.error('Error deleting record:', err);
      toast.error('No se pudo eliminar el record.');
    }
  };

  const handleSaveFromCalculator = (estimated1RM: number) => {
    setForm(prev => ({
      ...prev,
      recordType: '1RM',
      value: String(estimated1RM),
      date: dateToKey(new Date()),
    }));
    setShowForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const grouped = groupByMovement(records);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
            Records Personales
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Lleva el registro de tus PRs y calcula tu RM.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Agregar PR</span>
        </button>
      </div>

      {/* Add PR form */}
      {showForm && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Nuevo Record Personal
          </h3>

          {/* Movement selector */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Movimiento
            </label>
            <select
              value={form.movement}
              onChange={(e) => updateForm('movement', e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Seleccionar movimiento...</option>
              {MOVEMENT_CATEGORIES.map((cat) => (
                <optgroup key={cat.name} label={cat.name}>
                  {cat.movements.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </optgroup>
              ))}
              <option value="__custom__">Otro (personalizado)</option>
            </select>
            {form.movement === '__custom__' && (
              <input
                type="text"
                value={form.customMovement}
                onChange={(e) => updateForm('customMovement', e.target.value)}
                placeholder="Nombre del movimiento"
                className="mt-2 w-full px-3 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            )}
          </div>

          {/* Record type */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Tipo de record
            </label>
            <SegmentedButton
              options={['1RM', '3RM', '5RM']}
              selected={form.recordType}
              onSelect={(v) => updateForm('recordType', v as RecordType)}
            />
          </div>

          {/* Value + Date row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                {form.recordType === 'max_reps' ? 'Repeticiones' : form.recordType === 'time' ? 'Segundos' : `Peso (${weightUnit})`}
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={form.value}
                onChange={(e) => updateForm('value', e.target.value)}
                placeholder={form.recordType === 'max_reps' ? '20' : form.recordType === 'time' ? '180' : '225'}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateForm('date', e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Notas <span className="font-normal text-neutral-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
              placeholder="Ej: Sentí que podía subir más"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !(form.movement === '__custom__' ? form.customMovement.trim() : form.movement) || !form.value}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando...' : 'Guardar PR'}
            </button>
          </div>
        </div>
      )}

      {/* Records table grouped by movement */}
      {grouped.size > 0 ? (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([movement, movementRecords]) => {
            const isExpanded = expandedMovement === movement;
            // Max of the primary record type (1RM first), not the latest entry
            const best = getBestRecord(movementRecords) ?? movementRecords[0];

            return (
              <div
                key={movement}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden"
              >
                {/* Movement header */}
                <button
                  type="button"
                  onClick={() => setExpandedMovement(isExpanded ? null : movement)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {movement}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Mejor: {formatRecordValue(best)} ({best.record_type}) — {parseDateKey(best.date_achieved).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-red-500">
                      {formatRecordValue(best)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </button>

                {/* Expanded history */}
                {isExpanded && (
                  <div className="border-t border-neutral-100 dark:border-neutral-800">
                    {movementRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between px-5 py-3 border-b border-neutral-50 dark:border-neutral-800/50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 w-10">
                            {record.record_type}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {formatRecordValue(record)}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {parseDateKey(record.date_achieved).toLocaleDateString('es-ES')}
                              {record.notes && ` — ${record.notes}`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                          aria-label="Eliminar record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Trophy className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <h3 className="text-lg font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Sin records todavía
          </h3>
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            Agrega tu primer PR o usa la calculadora de RM para estimar tu máximo.
          </p>
        </div>
      )}

      {/* RM Calculator */}
      <RMCalculator
        weightUnit={weightUnit}
        onSaveAsPR={handleSaveFromCalculator}
      />
    </div>
  );
}
