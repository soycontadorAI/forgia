'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cx } from '@/lib/cx';

const CARD =
  'flex w-full min-h-16 items-center gap-4 rounded-3xl border-2 bg-surface p-4 text-left transition-colors';
const ON = 'border-accent bg-accent-soft';
const OFF = 'border-transparent hover:border-line';

interface OptionContentProps {
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  selected: boolean;
}

function OptionContent({ leading, title, description, selected }: OptionContentProps) {
  return (
    <>
      {leading && (
        <span
          aria-hidden="true"
          className={cx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors',
            selected ? 'bg-accent-solid text-on-accent' : 'bg-raised text-muted'
          )}
        >
          {leading}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-fg">{title}</span>
        {description && <span className="text-sm leading-snug text-muted">{description}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          selected ? 'border-accent-solid bg-accent-solid text-on-accent' : 'border-line'
        )}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </>
  );
}

interface RadioCardProps extends Omit<OptionContentProps, 'selected'> {
  /** Nombre del grupo de radios */
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
}

/**
 * Opción de selección única: un radio nativo (flechas del teclado, anuncio
 * "1 de 4") presentado como tarjeta. Va dentro de un <fieldset> con <legend>.
 */
export function RadioCard({ name, value, checked, onSelect, ...content }: RadioCardProps) {
  return (
    <label
      className={cx(
        CARD,
        'cursor-pointer has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-flare',
        checked ? ON : OFF
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onSelect} className="sr-only" />
      <OptionContent selected={checked} {...content} />
    </label>
  );
}

interface ToggleCardProps extends Omit<OptionContentProps, 'selected'> {
  pressed: boolean;
  /** No seleccionable por ahora; sigue siendo enfocable y se explica con `describedBy` */
  unavailable?: boolean;
  describedBy?: string;
  onToggle: () => void;
}

/** Opción de selección múltiple: botón con aria-pressed. */
export function ToggleCard({ pressed, unavailable = false, describedBy, onToggle, ...content }: ToggleCardProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-disabled={unavailable || undefined}
      aria-describedby={unavailable ? describedBy : undefined}
      onClick={() => {
        if (!unavailable) onToggle();
      }}
      className={cx(CARD, pressed ? ON : OFF, unavailable && 'cursor-not-allowed opacity-45 hover:border-transparent')}
    >
      <OptionContent selected={pressed} {...content} />
    </button>
  );
}
