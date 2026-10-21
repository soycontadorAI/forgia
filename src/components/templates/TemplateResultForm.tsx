'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { ArrowUp } from 'lucide-react';
import type { WodTemplate, TemplateResultInput } from '@/types/wod-template';
import { saveTemplateResult } from '@/lib/template-results';
import { checkLevelSuggestion, type LevelSuggestion } from '@/lib/level-suggestions';
import { updateProfile } from '@/lib/profiles';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { cx } from '@/lib/cx';

type RxOrScaled = 'Rx' | 'Scaled';

const SCORE_LABELS: Record<Exclude<WodTemplate['scoringType'], 'time'>, { label: string; placeholder: string; missing: string }> = {
  rounds: { label: 'Rondas completadas', placeholder: '15', missing: 'Escribe cuántas rondas completaste.' },
  reps: { label: 'Repeticiones totales', placeholder: '100', missing: 'Escribe tus repeticiones totales.' },
  weight: { label: 'Peso', placeholder: '100', missing: 'Escribe el peso que levantaste.' },
};

interface TemplateResultFormProps {
  open: boolean;
  template: WodTemplate;
  userId: string;
  onSaved: () => void;
  onClose: () => void;
  /** Minutos que marcó el modo en vivo; prellenan el tiempo */
  initialTime?: number | null;
}

function initialTimeParts(initialTime: number | null | undefined, isTime: boolean) {
  if (!initialTime || !isTime) return { minutes: '', seconds: '' };
  const totalSeconds = Math.round(initialTime * 60);
  return { minutes: String(Math.floor(totalSeconds / 60)), seconds: String(totalSeconds % 60) };
}

export default function TemplateResultForm({ open, template, userId, onSaved, onClose, initialTime }: TemplateResultFormProps) {
  const { profile, refreshProfile } = useAuth();
  const isTime = template.scoringType === 'time';
  const formId = useId();
  const timeErrorId = useId();

  const [scoreValue, setScoreValue] = useState('');
  const [minutes, setMinutes] = useState(() => initialTimeParts(initialTime, isTime).minutes);
  const [seconds, setSeconds] = useState(() => initialTimeParts(initialTime, isTime).seconds);
  const [rxOrScaled, setRxOrScaled] = useState<RxOrScaled>('Rx');
  const [notes, setNotes] = useState('');
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [levelSuggestion, setLevelSuggestion] = useState<LevelSuggestion | null>(null);
  const [isUpdatingLevel, setIsUpdatingLevel] = useState(false);

  /** Devuelve el score o el mensaje de error que hay que mostrar */
  const validate = (): { value: number } | { error: string } => {
    if (isTime) {
      const m = minutes.trim() === '' ? 0 : Number(minutes);
      const s = seconds.trim() === '' ? 0 : Number(seconds);
      if (!Number.isInteger(m) || m < 0) return { error: 'Los minutos deben ser un número entero.' };
      if (!Number.isInteger(s) || s < 0 || s > 59) return { error: 'Los segundos van de 0 a 59.' };
      const total = m * 60 + s;
      return total > 0 ? { value: total } : { error: 'Escribe tu tiempo final.' };
    }
    const config = SCORE_LABELS[template.scoringType as keyof typeof SCORE_LABELS];
    if (scoreValue.trim() === '') return { error: config.missing };
    const val = Number(scoreValue);
    if (!Number.isFinite(val) || val <= 0) return { error: 'Debe ser un número mayor que 0.' };
    return { value: val };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const check = validate();
    if ('error' in check) {
      setScoreError(check.error);
      return;
    }
    const value = check.value;

    setIsSaving(true);
    try {
      const input: TemplateResultInput = {
        template_id: template.id,
        score_value: value,
        score_type: template.scoringType,
        rx_or_scaled: rxOrScaled,
        notes: notes.trim() || null,
      };

      await saveTemplateResult(userId, input);
      toast.success('Resultado guardado correctamente.');

      // Si la marca sugiere subir de nivel, se ofrece antes de cerrar
      if (profile?.experience_level) {
        const suggestion = checkLevelSuggestion(template.id, value, rxOrScaled, profile.experience_level);
        if (suggestion) {
          setLevelSuggestion(suggestion);
          return;
        }
      }

      onSaved();
    } catch (err) {
      console.error('Error saving template result:', err);
      toast.error('No se pudo guardar el resultado.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAcceptLevelSuggestion = async () => {
    if (!levelSuggestion || !profile) return;

    setIsUpdatingLevel(true);
    try {
      await updateProfile(profile.id, {
        display_name: profile.display_name || '',
        age: profile.age || 0,
        experience_level: levelSuggestion.suggestedLevel,
        injury_history: profile.injury_history,
        objectives: profile.objectives || [],
        training_type: profile.training_type || 'CrossFit',
        equipment_level: profile.equipment_level || 'Box completo',
      });
      await refreshProfile();
    } catch (err) {
      console.error('Error updating level:', err);
      toast.error('No se pudo actualizar tu nivel.');
    } finally {
      setIsUpdatingLevel(false);
    }

    onSaved();
  };

  // Paso 2: el resultado ya se guardó; cerrar equivale a "No, gracias"
  if (levelSuggestion) {
    return (
      <Dialog
        open={open}
        onClose={onSaved}
        title="Subida de nivel detectada"
        footer={
          <>
            <Button variant="secondary" onClick={onSaved} disabled={isUpdatingLevel}>
              No, gracias
            </Button>
            <Button onClick={handleAcceptLevelSuggestion} loading={isUpdatingLevel}>
              Actualizar a {levelSuggestion.suggestedLevel}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <ArrowUp className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-[15px] leading-relaxed text-fg">{levelSuggestion.reason}</p>
        </div>
      </Dialog>
    );
  }

  const scoreConfig = isTime ? null : SCORE_LABELS[template.scoringType as keyof typeof SCORE_LABELS];

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title="Registrar resultado"
      description={template.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={isSaving}>
            {isSaving ? 'Guardando…' : 'Guardar resultado'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {isTime ? (
          <fieldset className="flex flex-col gap-1.5" aria-describedby={scoreError ? timeErrorId : undefined}>
            <legend className="mb-1.5 text-sm font-medium text-fg">Tiempo final</legend>
            <div className="flex items-start gap-2">
              <TextField
                label="Minutos"
                type="number"
                inputMode="numeric"
                min={0}
                value={minutes}
                onChange={(e) => {
                  setMinutes(e.target.value);
                  setScoreError(null);
                }}
                placeholder="00"
                className="flex-1"
                aria-invalid={scoreError ? true : undefined}
                aria-describedby={scoreError ? timeErrorId : undefined}
              />
              <span className="mt-10 font-display text-xl font-bold text-muted" aria-hidden="true">
                :
              </span>
              <TextField
                label="Segundos"
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => {
                  setSeconds(e.target.value);
                  setScoreError(null);
                }}
                placeholder="00"
                className="flex-1"
                aria-invalid={scoreError ? true : undefined}
                aria-describedby={scoreError ? timeErrorId : undefined}
              />
            </div>
            {scoreError && (
              <p id={timeErrorId} role="alert" className="text-xs font-medium text-accent">
                {scoreError}
              </p>
            )}
          </fieldset>
        ) : (
          scoreConfig && (
            <TextField
              label={scoreConfig.label}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={scoreValue}
              onChange={(e) => {
                setScoreValue(e.target.value);
                setScoreError(null);
              }}
              placeholder={scoreConfig.placeholder}
              error={scoreError ?? undefined}
            />
          )
        )}

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-fg">Modalidad</legend>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-ground p-1">
            {(['Rx', 'Scaled'] as const).map((option) => (
              <label
                key={option}
                className={cx(
                  'flex min-h-11 cursor-pointer items-center justify-center rounded-full text-sm transition-colors',
                  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent',
                  rxOrScaled === option ? 'bg-fg font-semibold text-ground' : 'text-muted hover:text-fg'
                )}
              >
                <input
                  type="radio"
                  name={`${formId}-modalidad`}
                  value={option}
                  checked={rxOrScaled === option}
                  onChange={() => setRxOrScaled(option)}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted">
            Rx: {template.rxStandard.men} (H) · {template.rxStandard.women} (M)
          </p>
        </fieldset>

        <TextAreaField
          label="Notas (opcional)"
          rows={2}
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: Partí en sets de 7…"
        />
      </form>
    </Dialog>
  );
}
