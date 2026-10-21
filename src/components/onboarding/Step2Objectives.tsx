'use client';

import type { Objective } from '@/types/profile';
import { useId } from 'react';
import { OBJECTIVES, INCOMPATIBLE_OBJECTIVES } from '@/lib/training-constants';
import { Info } from 'lucide-react';
import StepHeader from './StepHeader';
import { ToggleCard } from './OptionCard';

interface Step2Props {
  selectedObjectives: Objective[];
  onChange: (objectives: Objective[]) => void;
}

export default function Step2Objectives({ selectedObjectives, onChange }: Step2Props) {
  const descriptionId = useId();
  const messageId = useId();
  const isSelected = (obj: Objective) => selectedObjectives.includes(obj);

  const isDisabled = (obj: Objective) => {
    if (isSelected(obj)) return false;
    if (selectedObjectives.length >= 2) return true;

    return selectedObjectives.some(
      (selected) => INCOMPATIBLE_OBJECTIVES[selected]?.includes(obj)
    );
  };

  const getIncompatibleMessage = (): string | null => {
    for (const selected of selectedObjectives) {
      const incompatibles = INCOMPATIBLE_OBJECTIVES[selected];
      if (incompatibles.length > 0) {
        const disabledNames = incompatibles.filter((obj) =>
          OBJECTIVES.some((o) => o.value === obj && !isSelected(obj))
        );
        if (disabledNames.length > 0) {
          return `${selected} no es compatible con ${disabledNames.join(', ')} para este programa.`;
        }
      }
    }
    return null;
  };

  const handleToggle = (obj: Objective) => {
    if (isDisabled(obj)) return;

    if (isSelected(obj)) {
      onChange(selectedObjectives.filter((o) => o !== obj));
    } else {
      onChange([...selectedObjectives, obj]);
    }
  };

  const incompatibleMessage = getIncompatibleMessage();

  return (
    <fieldset aria-describedby={descriptionId}>
      <StepHeader
        as="legend"
        title="¿Cuáles son tus objetivos?"
        description="Selecciona 1 o 2 objetivos"
        descriptionId={descriptionId}
      />

      <div className="mt-5 flex flex-col gap-2">
        {OBJECTIVES.map(({ value, icon: Icon, description }) => (
          <ToggleCard
            key={value}
            pressed={isSelected(value)}
            unavailable={isDisabled(value)}
            describedBy={incompatibleMessage ? messageId : descriptionId}
            onToggle={() => handleToggle(value)}
            leading={<Icon className="h-5 w-5" />}
            title={value}
            description={description}
          />
        ))}
      </div>

      {/* Contenedor siempre presente para que el aviso se anuncie al aparecer */}
      <div role="status" className="mt-3">
        {incompatibleMessage && (
          <p id={messageId} className="flex items-start gap-2 rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warmup" aria-hidden="true" />
            {incompatibleMessage}
          </p>
        )}
      </div>
    </fieldset>
  );
}
