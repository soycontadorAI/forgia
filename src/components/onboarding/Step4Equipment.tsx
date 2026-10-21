'use client';

import type { EquipmentLevel } from '@/types/profile';
import { CROSSFIT_EQUIPMENT_OPTIONS } from '@/lib/training-constants';
import StepHeader from './StepHeader';
import { RadioCard } from './OptionCard';

interface Step4Props {
  selectedEquipment: EquipmentLevel | null;
  onChange: (equipment: EquipmentLevel) => void;
}

export default function Step4Equipment({ selectedEquipment, onChange }: Step4Props) {
  return (
    <fieldset>
      <StepHeader as="legend" title="¿Con qué equipamiento cuentas?" description="Esto nos ayuda a diseñar WODs que puedas realizar" />

      <div className="mt-5 flex flex-col gap-2">
        {CROSSFIT_EQUIPMENT_OPTIONS.map(({ value, title, description, icon: Icon }) => (
          <RadioCard
            key={value}
            name="onboarding-equipment"
            value={value}
            checked={selectedEquipment === value}
            onSelect={() => onChange(value)}
            leading={<Icon className="h-5 w-5" />}
            title={title}
            description={description}
          />
        ))}
      </div>
    </fieldset>
  );
}
