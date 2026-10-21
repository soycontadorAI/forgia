'use client';

import { TRAINING_FREQUENCY_OPTIONS } from '@/lib/training-constants';
import StepHeader from './StepHeader';
import { RadioCard } from './OptionCard';

interface Step4FrequencyProps {
  selectedFrequency: number | null;
  onChange: (frequency: number) => void;
}

export default function Step4Frequency({ selectedFrequency, onChange }: Step4FrequencyProps) {
  return (
    <fieldset>
      <StepHeader
        as="legend"
        title="¿Cuántos días a la semana puedes entrenar?"
        description="Esto nos ayuda a calibrar el volumen e intensidad de tus entrenamientos"
      />

      <div className="mt-5 flex flex-col gap-2">
        {TRAINING_FREQUENCY_OPTIONS.map(({ value, label, description }) => (
          <RadioCard
            key={value}
            name="onboarding-frequency"
            value={String(value)}
            checked={selectedFrequency === value}
            onSelect={() => onChange(value)}
            leading={<span className="font-mono text-lg font-semibold tabular-nums">{value}</span>}
            title={
              <>
                <span className="sr-only">{value} </span>
                {label}
              </>
            }
            description={description}
          />
        ))}
      </div>
    </fieldset>
  );
}
