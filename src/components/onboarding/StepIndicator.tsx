'use client';

import { cx } from '@/lib/cx';

const STEP_NAMES = ['Sobre ti', 'Objetivos', 'Equipamiento', 'Frecuencia'];

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export default function StepIndicator({ currentStep, totalSteps = 4 }: StepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  const currentName = STEP_NAMES[currentStep - 1];

  return (
    <div className="mb-6 flex flex-col gap-3">
      {/* Se anuncia al cambiar de paso */}
      <p aria-live="polite" className="font-mono text-xs tracking-wider text-muted uppercase">
        Paso {currentStep} de {totalSteps}
        {currentName && <span className="text-fg"> · {currentName}</span>}
      </p>
      <ol aria-label="Progreso del registro" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
        {steps.map((step) => {
          const done = step < currentStep;
          const current = step === currentStep;
          return (
            <li key={step} aria-current={current ? 'step' : undefined}>
              <span
                aria-hidden="true"
                className={cx(
                  'block h-1.5 rounded-full transition-colors',
                  current ? 'bg-accent-solid' : done ? 'bg-fg' : 'bg-raised'
                )}
              />
              <span className="sr-only">
                Paso {step} de {totalSteps}: {STEP_NAMES[step - 1] ?? ''}
                {done ? ' (completado)' : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
