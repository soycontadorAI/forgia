'use client';

import type { ExperienceLevel, WeightUnit } from '@/types/profile';
import { EXPERIENCE_LEVELS } from '@/lib/training-constants';
import SegmentedButton from '@/components/ui/SegmentedButton';
import { TextAreaField, TextField } from '@/components/ui/Field';
import StepHeader from './StepHeader';
import { RadioCard } from './OptionCard';

interface Step1Data {
  name: string;
  age: number | '';
  experienceLevel: ExperienceLevel | null;
  injuryHistory: string;
  weightUnit: WeightUnit;
}

interface Step1Props {
  data: Step1Data;
  onChange: (updates: Partial<Step1Data>) => void;
}

const GROUP_LABEL = 'text-sm font-medium text-fg';

export default function Step1BasicInfo({ data, onChange }: Step1Props) {
  const ageOutOfRange = data.age !== '' && (data.age < 13 || data.age > 120);

  return (
    <div className="flex flex-col gap-6">
      <StepHeader title="Cuéntanos sobre ti" description="Esta información nos ayuda a personalizar tus entrenamientos." />

      <TextField
        id="onboarding-name"
        label="Nombre"
        value={data.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Tu nombre"
        autoComplete="given-name"
        aria-required="true"
      />

      <TextField
        id="onboarding-age"
        label="Edad"
        type="number"
        inputMode="numeric"
        min={13}
        max={120}
        value={data.age}
        onChange={(e) => onChange({ age: e.target.value === '' ? '' : Number(e.target.value) })}
        placeholder="25"
        aria-required="true"
        error={ageOutOfRange ? 'Ingresa una edad entre 13 y 120 años.' : undefined}
        className="sm:max-w-40"
      />

      <div className="flex flex-col gap-1.5">
        {/* El radiogroup ya lleva el mismo nombre accesible */}
        <p aria-hidden="true" className={GROUP_LABEL}>
          Unidad de peso
        </p>
        {/* Botones de 44px de alto dentro del control segmentado */}
        <div className="w-full sm:w-56 [&_button]:min-h-11">
          <SegmentedButton
            ariaLabel="Unidad de peso"
            options={['lbs', 'kg']}
            selected={data.weightUnit}
            onSelect={(v) => onChange({ weightUnit: v as WeightUnit })}
          />
        </div>
        <p className="text-xs text-muted">
          Los pesos en tus WODs se mostrarán en esta unidad.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${GROUP_LABEL} mb-2`}>Nivel de experiencia</legend>
        {EXPERIENCE_LEVELS.map(({ value, description }) => (
          <RadioCard
            key={value}
            name="onboarding-experience"
            value={value}
            checked={data.experienceLevel === value}
            onSelect={() => onChange({ experienceLevel: value })}
            title={value}
            description={description}
          />
        ))}
      </fieldset>

      <TextAreaField
        id="onboarding-injury"
        label="Historial de lesiones (opcional)"
        value={data.injuryHistory}
        onChange={(e) => onChange({ injuryHistory: e.target.value })}
        placeholder="Ej: Lesión en rodilla izquierda hace 6 meses, dolor crónico en hombro..."
        rows={3}
      />
    </div>
  );
}
