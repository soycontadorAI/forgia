'use client';

import { cx } from '@/lib/cx';

interface SegmentedButtonProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  /** Nombre del grupo para lectores de pantalla, ej. "Unidad de peso" */
  ariaLabel?: string;
}

export default function SegmentedButton({ options, selected, onSelect, disabled = false, ariaLabel }: SegmentedButtonProps) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex min-w-0 gap-1 rounded-full bg-surface p-1">
      {options.map((option) => {
        const active = selected === option;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={active}
            key={option}
            onClick={() => onSelect(option)}
            disabled={disabled}
            className={cx(
              'min-h-9 w-full min-w-0 truncate rounded-full px-2 text-sm transition-colors disabled:opacity-50 sm:px-3',
              active ? 'bg-fg font-semibold text-ground shadow-sm' : 'text-muted hover:text-fg'
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
