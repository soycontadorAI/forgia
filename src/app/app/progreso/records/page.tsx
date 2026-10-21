'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { WeightUnit } from '@/types/profile';
import type { PersonalRecord, PersonalRecordInput, RecordType, RecordUnit } from '@/types/personal-records';
import { savePersonalRecord, getPersonalRecords, deletePersonalRecord, getBestRecord } from '@/lib/personal-records';
import { dateToKey, parseDateKey } from '@/lib/dateUtils';
import { MOVEMENT_CATEGORIES } from '@/lib/movement-constants';
import RMCalculator from '@/components/RMCalculator';
import SegmentedButton from '@/components/ui/SegmentedButton';
import { Card } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/Dialog';
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
  const [loadError, setLoadError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRecords = useCallback(async () => {
    if (!user) return;
    setLoadError(false);
    try {
      const data = await getPersonalRecords(user.id);
      setRecords(data);
    } catch (err) {
      console.error('Error loading records:', err);
      setLoadError(true);
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

    const name = form.movement === '__custom__' ? form.customMovement.trim() : form.movement;
    if (!name || !form.value) return;

    setIsSaving(true);
    try {
      const input: PersonalRecordInput = {
        movement_name: name,
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

  // Borrar no se puede deshacer: primero se confirma
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deletePersonalRecord(pendingDelete);
      setRecords((prev) => prev.filter((r) => r.id !== pendingDelete));
      toast.success('Record borrado.');
      setPendingDelete(null);
    } catch (err) {
      console.error('Error deleting record:', err);
      toast.error('No se pudo borrar el record. Intenta de nuevo.');
    } finally {
      setDeleting(false);
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
  const movementName = form.movement === '__custom__' ? form.customMovement.trim() : form.movement;
  const canSave = Boolean(movementName && form.value);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20" role="status" aria-label="Cargando records">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted" role="alert">No pudimos cargar tus records. Revisa tu conexión.</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setIsLoading(true);
            loadRecords();
          }}
        >
          Reintentar
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Tus PRs y la calculadora de porcentajes.</p>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm}
          icon={<Plus className="h-4 w-4" aria-hidden="true" />}
        >
          Nuevo PR
        </Button>
      </div>

      {showForm && (
        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold">Nuevo record personal</h2>

          <SelectField
            label="Movimiento"
            value={form.movement}
            onChange={(e) => updateForm('movement', e.target.value)}
          >
            <option value="">Elige un movimiento</option>
            {MOVEMENT_CATEGORIES.map((cat) => (
              <optgroup key={cat.name} label={cat.name}>
                {cat.movements.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </optgroup>
            ))}
            <option value="__custom__">Otro (escribir nombre)</option>
          </SelectField>

          {form.movement === '__custom__' && (
            <TextField
              label="Nombre del movimiento"
              value={form.customMovement}
              onChange={(e) => updateForm('customMovement', e.target.value)}
              placeholder="Ej: Bulgarian Split Squat"
            />
          )}

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Tipo de record</legend>
            <SegmentedButton
              ariaLabel="Tipo de record"
              options={['1RM', '3RM', '5RM']}
              selected={form.recordType}
              onSelect={(v) => updateForm('recordType', v as RecordType)}
            />
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={form.recordType === 'max_reps' ? 'Repeticiones' : form.recordType === 'time' ? 'Segundos' : `Peso (${weightUnit})`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={form.value}
              onChange={(e) => updateForm('value', e.target.value)}
              placeholder={form.recordType === 'max_reps' ? '20' : form.recordType === 'time' ? '180' : weightUnit === 'kg' ? '100' : '225'}
            />
            <TextField
              label="Fecha"
              type="date"
              value={form.date}
              onChange={(e) => updateForm('date', e.target.value)}
            />
          </div>

          <TextField
            label="Notas (opcional)"
            value={form.notes}
            onChange={(e) => updateForm('notes', e.target.value)}
            placeholder="Ej: sentí que podía subir más"
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={isSaving} disabled={!canSave}>
              Guardar PR
            </Button>
          </div>
          {!canSave && <p className="text-xs text-muted">Elige un movimiento y escribe el valor para guardar.</p>}
        </Card>
      )}

      {grouped.size > 0 ? (
        <ul className="overflow-hidden rounded-3xl bg-surface">
          {Array.from(grouped.entries()).map(([movement, movementRecords]) => {
            const isExpanded = expandedMovement === movement;
            // Max of the primary record type (1RM first), not the latest entry
            const best = getBestRecord(movementRecords) ?? movementRecords[0];

            return (
              <li key={movement} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => setExpandedMovement(isExpanded ? null : movement)}
                  aria-expanded={isExpanded}
                  className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-raised/50"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-medium">{movement}</span>
                    <span className="text-xs text-muted">
                      Mejor {best.record_type} · {parseDateKey(best.date_achieved).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-display text-xl font-bold tabular-nums">{formatRecordValue(best)}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
                    )}
                  </span>
                </button>

                {isExpanded && (
                  <ul className="border-t border-line bg-raised/30">
                    {movementRecords.map((record) => (
                      <li key={record.id} className="flex items-center justify-between gap-3 px-4 py-2">
                        <div className="flex items-center gap-3">
                          <span className="w-10 text-xs font-medium text-muted">{record.record_type}</span>
                          <div>
                            <p className="text-sm font-medium tabular-nums">{formatRecordValue(record)}</p>
                            <p className="text-xs text-muted">
                              {parseDateKey(record.date_achieved).toLocaleDateString('es-MX')}
                              {record.notes && ` · ${record.notes}`}
                            </p>
                          </div>
                        </div>
                        <IconButton
                          label={`Borrar record de ${movement} del ${parseDateKey(record.date_achieved).toLocaleDateString('es-MX')}`}
                          onClick={() => setPendingDelete(record.id)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </IconButton>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Trophy className="h-10 w-10 text-muted" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold">Sin records todavía</h2>
          <p className="max-w-xs text-sm text-muted">
            Agrega tu primer PR o usa la calculadora para estimar tu máximo. Con tus 1RM, el WOD te da cargas exactas.
          </p>
        </Card>
      )}

      <RMCalculator weightUnit={weightUnit} onSaveAsPR={handleSaveFromCalculator} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Borrar este record?"
        description="Se borra de tu historial de PRs y no se puede deshacer."
        confirmLabel="Borrar record"
      />
    </div>
  );
}
