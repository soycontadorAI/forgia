'use client';

import { useState, useMemo, useId, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Info, Loader2, Save, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/profiles';
import { trackProfileUpdated } from '@/lib/analytics';
import {
  EXPERIENCE_LEVELS,
  OBJECTIVES,
  INCOMPATIBLE_OBJECTIVES,
  CROSSFIT_EQUIPMENT_OPTIONS,
  TRAINING_FREQUENCY_OPTIONS,
} from '@/lib/training-constants';
import type { ExperienceLevel, Objective, EquipmentLevel, WeightUnit, Gender, Profile } from '@/types/profile';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField, TextAreaField } from '@/components/ui/Field';
import { ChoiceCard, ChoiceFieldset, PillRadioGroup } from '@/components/ChoiceControls';
import LevelAssessmentCard from '@/components/LevelAssessmentCard';

interface FormData {
  age: number | '';
  weight: number | '';
  height: number | '';
  experienceLevel: ExperienceLevel | null;
  injuryHistory: string;
  weightUnit: WeightUnit;
  objectives: Objective[];
  equipmentLevel: EquipmentLevel | null;
  trainingFrequency: number | null;
  gender: Gender | null;
}

type FieldKey = 'age' | 'weight' | 'height' | 'experienceLevel' | 'objectives' | 'equipmentLevel';

// Nombre corto de cada campo para la barra de guardado ("Falta: edad, equipo")
const FIELD_NAMES: Record<FieldKey, string> = {
  age: 'edad',
  weight: 'peso',
  height: 'altura',
  experienceLevel: 'nivel de experiencia',
  objectives: 'objetivos',
  equipmentLevel: 'equipo',
};

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'prefiero_no_definir', label: 'Prefiero no definir' },
];

const UNIT_OPTIONS = [
  { value: 'lbs', label: 'Libras (lbs)' },
  { value: 'kg', label: 'Kilos (kg)' },
] as const;

const FREQUENCY_OPTIONS = TRAINING_FREQUENCY_OPTIONS.map(({ value }) => ({ value: String(value), label: String(value) }));

const KG_TO_LB = 2.20462;

const EMPTY_FORM: FormData = {
  age: '',
  weight: '',
  height: '',
  experienceLevel: null,
  injuryHistory: '',
  weightUnit: 'lbs',
  objectives: [],
  equipmentLevel: null,
  trainingFrequency: null,
  gender: null,
};

function formFromProfile(profile: Profile): FormData {
  return {
    age: profile.age ?? '',
    weight: profile.weight ?? '',
    height: profile.height ?? '',
    experienceLevel: profile.experience_level,
    injuryHistory: profile.injury_history || '',
    weightUnit: profile.weight_unit || 'lbs',
    objectives: profile.objectives || [],
    equipmentLevel: profile.equipment_level,
    trainingFrequency: profile.training_frequency ?? null,
    gender: profile.gender ?? null,
  };
}

function toNumberOrEmpty(value: string): number | '' {
  return value === '' ? '' : Number(value);
}

function validate(form: FormData): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  if (form.age === '') errors.age = 'Escribe tu edad.';
  else if (form.age < 13 || form.age > 120) errors.age = 'La edad debe estar entre 13 y 120 años.';
  if (form.weight !== '' && (form.weight < 30 || form.weight > 300)) {
    errors.weight = 'Escribe un peso entre 30 y 300 kg.';
  }
  if (form.height !== '' && (form.height < 100 || form.height > 250)) {
    errors.height = 'Escribe una altura entre 100 y 250 cm.';
  }
  if (!form.experienceLevel) errors.experienceLevel = 'Elige tu nivel de experiencia.';
  if (form.objectives.length < 1) errors.objectives = 'Elige al menos un objetivo.';
  else if (form.objectives.length > 2) errors.objectives = 'Elige como máximo dos objetivos.';
  if (!form.equipmentLevel) errors.equipmentLevel = 'Elige el equipo que tienes disponible.';
  return errors;
}

/**
 * El peso corporal siempre se guarda en kg (el prompt del WOD lo lee así).
 * Si el atleta usa libras, se le muestra la equivalencia para que no lo
 * capture en la unidad equivocada.
 */
function weightHint(weight: number | '', unit: WeightUnit): string | undefined {
  if (unit !== 'lbs') return undefined;
  if (weight === '' || weight <= 0) return 'Escríbelo en kilos (1 kg ≈ 2.2 lbs).';
  return `≈ ${Math.round(weight * KG_TO_LB)} lbs. Se guarda en kilos.`;
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <Card className="flex flex-col gap-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id={headingId} className="font-display text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
        {children}
      </Card>
    </section>
  );
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const [formData, setFormData] = useState<FormData>(() => (profile ? formFromProfile(profile) : EMPTY_FORM));
  // Cuando llega (o se refresca) el perfil, el formulario vuelve a sus valores
  const [syncedProfile, setSyncedProfile] = useState(profile);
  if (profile !== syncedProfile) {
    setSyncedProfile(profile);
    if (profile) setFormData(formFromProfile(profile));
  }

  const [isSaving, setIsSaving] = useState(false);
  const saveStatusId = useId();

  // Dirty checking — detect if form has changed from profile values
  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      formData.age !== (profile.age ?? '') ||
      formData.weight !== (profile.weight ?? '') ||
      formData.height !== (profile.height ?? '') ||
      formData.experienceLevel !== profile.experience_level ||
      formData.injuryHistory !== (profile.injury_history || '') ||
      formData.weightUnit !== (profile.weight_unit || 'lbs') ||
      JSON.stringify(formData.objectives) !== JSON.stringify(profile.objectives || []) ||
      formData.equipmentLevel !== profile.equipment_level ||
      formData.trainingFrequency !== (profile.training_frequency ?? null) ||
      formData.gender !== (profile.gender ?? null)
    );
  }, [formData, profile]);

  const errors = useMemo(() => validate(formData), [formData]);
  const invalidFields = Object.keys(errors) as FieldKey[];
  const isFormValid = invalidFields.length === 0;
  // Los errores por campo aparecen cuando el atleta ya está editando, no al cargar
  const visibleErrors = hasChanges ? errors : {};

  const updateFormField = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // --- Objectives logic ---
  const isObjectiveSelected = (obj: Objective) => formData.objectives.includes(obj);

  const isObjectiveDisabled = (obj: Objective) => {
    if (isObjectiveSelected(obj)) return false;
    if (formData.objectives.length >= 2) return true;
    return formData.objectives.some((selected) => INCOMPATIBLE_OBJECTIVES[selected]?.includes(obj));
  };

  const getIncompatibleMessage = (): string | null => {
    for (const selected of formData.objectives) {
      const incompatibles = INCOMPATIBLE_OBJECTIVES[selected];
      if (incompatibles.length > 0) {
        const disabledNames = incompatibles.filter(
          (obj) => OBJECTIVES.some((o) => o.value === obj) && !isObjectiveSelected(obj)
        );
        if (disabledNames.length > 0) {
          return `${selected} no es compatible con ${disabledNames.join(', ')} para este programa.`;
        }
      }
    }
    return null;
  };

  const toggleObjective = (obj: Objective) => {
    if (isObjectiveDisabled(obj)) return;
    if (isObjectiveSelected(obj)) {
      updateFormField({ objectives: formData.objectives.filter((o) => o !== obj) });
    } else {
      updateFormField({ objectives: [...formData.objectives, obj] });
    }
  };

  // --- Save ---
  const handleSave = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!user || !isFormValid || !hasChanges || isSaving) return;

    setIsSaving(true);

    try {
      await updateProfile(user.id, {
        display_name: profile?.display_name || '',
        age: formData.age as number,
        experience_level: formData.experienceLevel!,
        injury_history: formData.injuryHistory.trim() || null,
        objectives: formData.objectives,
        training_type: 'CrossFit',
        equipment_level: formData.equipmentLevel!,
        weight_unit: formData.weightUnit,
        training_frequency: formData.trainingFrequency,
        gender: formData.gender,
        weight: formData.weight === '' ? null : formData.weight,
        height: formData.height === '' ? null : formData.height,
      });

      await refreshProfile();
      trackProfileUpdated();
      toast.success('Cambios guardados correctamente.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar los cambios.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (profile) setFormData(formFromProfile(profile));
  };

  const incompatibleMessage = getIncompatibleMessage();
  const objectivesFull = formData.objectives.length >= 2;

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
        <span className="sr-only">Cargando perfil…</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} noValidate className="flex flex-col gap-4">
      {/* Page header */}
      <header className="mb-2 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">Mi perfil</h1>
          <p className="text-sm text-muted">Con estos datos se arma cada entrenamiento.</p>
        </div>
        <ButtonLink
          href="/app/cuenta"
          variant="secondary"
          size="sm"
          icon={<Settings className="h-4 w-4" aria-hidden="true" />}
          className="shrink-0 rounded-full"
        >
          Cuenta
        </ButtonLink>
      </header>

      <FormSection title="Datos personales">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            label="Edad"
            type="number"
            inputMode="numeric"
            min={13}
            max={120}
            required
            value={formData.age}
            onChange={(e) => updateFormField({ age: toNumberOrEmpty(e.target.value) })}
            placeholder="25"
            error={visibleErrors.age}
          />
          <TextField
            label="Peso corporal (kg)"
            type="number"
            inputMode="decimal"
            min={30}
            max={300}
            step="any"
            value={formData.weight}
            onChange={(e) => updateFormField({ weight: toNumberOrEmpty(e.target.value) })}
            placeholder="75"
            hint={weightHint(formData.weight, formData.weightUnit)}
            error={visibleErrors.weight}
          />
          <TextField
            label="Altura (cm)"
            type="number"
            inputMode="numeric"
            min={100}
            max={250}
            value={formData.height}
            onChange={(e) => updateFormField({ height: toNumberOrEmpty(e.target.value) })}
            placeholder="170"
            error={visibleErrors.height}
          />
        </div>

        <ChoiceFieldset
          legend="Sexo"
          aside="Opcional"
          hint="Se usa para personalizar pesos, estándares y cargas en tus entrenamientos."
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {GENDER_OPTIONS.map(({ value, label }) => (
              <ChoiceCard
                key={value}
                type="radio"
                name="gender"
                checked={formData.gender === value}
                onChange={() => updateFormField({ gender: value })}
                onReselect={() => updateFormField({ gender: null })}
                title={label}
              />
            ))}
          </div>
        </ChoiceFieldset>
      </FormSection>

      <FormSection title="Entrenamiento">
        <ChoiceFieldset legend="Nivel de experiencia" error={visibleErrors.experienceLevel}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EXPERIENCE_LEVELS.map(({ value, description }) => (
              <ChoiceCard
                key={value}
                type="radio"
                name="experienceLevel"
                checked={formData.experienceLevel === value}
                onChange={() => updateFormField({ experienceLevel: value })}
                title={value}
                description={description}
              />
            ))}
          </div>
        </ChoiceFieldset>

        <PillRadioGroup
          legend="Días de entrenamiento por semana"
          options={FREQUENCY_OPTIONS}
          value={formData.trainingFrequency === null ? null : String(formData.trainingFrequency)}
          onChange={(days) => updateFormField({ trainingFrequency: Number(days) })}
          hint={
            TRAINING_FREQUENCY_OPTIONS.find((option) => option.value === formData.trainingFrequency)?.description ??
            'Elige cuántos días a la semana puedes entrenar.'
          }
        />

        <PillRadioGroup
          legend="Unidad de peso"
          options={UNIT_OPTIONS}
          value={formData.weightUnit}
          onChange={(unit) => updateFormField({ weightUnit: unit })}
          hint="Los pesos en tus WODs se mostrarán en esta unidad."
          className="sm:max-w-xs"
        />
      </FormSection>

      <FormSection title="Objetivos" description="Hacia dónde se orienta tu programa.">
        <ChoiceFieldset
          legend="¿Qué buscas?"
          aside={`Elige 1 o 2 · ${formData.objectives.length}/2`}
          hint={objectivesFull ? 'Ya elegiste dos. Quita uno para cambiarlo.' : undefined}
          error={visibleErrors.objectives}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {OBJECTIVES.map(({ value, icon, description }) => (
              <ChoiceCard
                key={value}
                type="checkbox"
                name="objectives"
                checked={isObjectiveSelected(value)}
                disabled={isObjectiveDisabled(value)}
                onChange={() => toggleObjective(value)}
                title={value}
                description={description}
                icon={icon}
              />
            ))}
          </div>
          {incompatibleMessage && (
            <p className="flex items-start gap-2 rounded-2xl bg-warmup/12 p-3 text-xs text-warmup" role="status">
              <Info className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
              {incompatibleMessage}
            </p>
          )}
        </ChoiceFieldset>
      </FormSection>

      <FormSection title="Equipo" description="Lo que tienes a la mano donde entrenas.">
        <ChoiceFieldset legend="Equipo disponible" error={visibleErrors.equipmentLevel}>
          <div className="grid grid-cols-1 gap-2">
            {CROSSFIT_EQUIPMENT_OPTIONS.map(({ value, title, description, icon }) => (
              <ChoiceCard
                key={value}
                type="radio"
                name="equipmentLevel"
                checked={formData.equipmentLevel === value}
                onChange={() => updateFormField({ equipmentLevel: value })}
                title={title}
                description={description}
                icon={icon}
              />
            ))}
          </div>
        </ChoiceFieldset>
      </FormSection>

      <FormSection title="Lesiones y limitaciones">
        <TextAreaField
          label="Historial de lesiones"
          hint="Opcional. Se toma en cuenta al generar tus WODs."
          value={formData.injuryHistory}
          onChange={(e) => updateFormField({ injuryHistory: e.target.value })}
          placeholder="Ej: Lesión en rodilla izquierda hace 6 meses, dolor crónico en hombro..."
          rows={3}
        />
      </FormSection>

      <LevelAssessmentCard />

      {/* Barra de guardado: aparece con cambios pendientes, encima de la barra de pestañas.
          En pantallas angostas deja libre la esquina derecha para el botón del Coach IA. */}
      {hasChanges && (
        <div className="sticky bottom-[calc(var(--tabbar-h)+0.75rem)] z-20 mr-[4.25rem] lg:mr-0 motion-safe:animate-slide-up">
          <div className="flex items-center gap-3 rounded-3xl border border-line bg-raised/95 p-2 pl-4 shadow-xl shadow-black/20 backdrop-blur-md">
            <p id={saveStatusId} className="min-w-0 flex-1 text-[13px] leading-snug sm:text-sm" aria-live="polite">
              {isFormValid ? (
                <span className="font-medium">Cambios sin guardar</span>
              ) : (
                <span className="text-accent">
                  <span className="font-medium">Para guardar, revisa:</span>{' '}
                  {invalidFields.map((field) => FIELD_NAMES[field]).join(', ')}
                </span>
              )}
            </p>
            {/* En móvil no cabe: se descarta saliendo de la página */}
            <span className="hidden sm:contents">
              <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={isSaving}>
                Descartar
              </Button>
            </span>
            <Button
              type="submit"
              size="sm"
              loading={isSaving}
              disabled={!isFormValid}
              aria-describedby={saveStatusId}
              icon={<Save className="h-4 w-4" aria-hidden="true" />}
              className="h-11 shrink-0"
            >
              {isSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
