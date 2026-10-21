'use client';

import { useId, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/lib/cx';

/*
 * Grupos de opciones sobre inputs nativos (radio / checkbox) escondidos:
 * el navegador da la semántica, las flechas del teclado y el foco; aquí solo
 * se pinta la tarjeta. El contorno de foco se dibuja en la etiqueta con
 * `has-[:focus-visible]` porque el input en sí no se ve.
 */

const FOCUS_RING =
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-flare';

interface ChoiceFieldsetProps {
  legend: string;
  /** Texto corto junto a la leyenda, ej. "Elige 1 o 2" u "Opcional" */
  aside?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** `fieldset` + `legend` para agrupar opciones con su nombre accesible. */
export function ChoiceFieldset({ legend, aside, hint, error, className, children }: ChoiceFieldsetProps) {
  const hintId = useId();
  const errorId = useId();
  return (
    <fieldset
      className={cx('flex min-w-0 flex-col gap-3', className)}
      aria-describedby={cx(hint && hintId, error && errorId) || undefined}
    >
      <legend className="mb-3 flex w-full items-baseline justify-between gap-3 text-sm font-medium text-fg">
        <span>{legend}</span>
        {aside && <span className="text-xs font-normal text-muted">{aside}</span>}
      </legend>
      {children}
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-accent">
          {error}
        </p>
      )}
    </fieldset>
  );
}

interface ChoiceCardProps {
  type: 'radio' | 'checkbox';
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  /** Solo radios: se llama al volver a pulsar la opción ya marcada (para desmarcarla) */
  onReselect?: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Contenido a la izquierda en lugar del ícono, ej. un número grande */
  lead?: ReactNode;
}

/** Opción en tarjeta: título, descripción opcional e indicador de selección. */
export function ChoiceCard({
  type,
  name,
  checked,
  disabled = false,
  onChange,
  onReselect,
  title,
  description,
  icon: Icon,
  lead,
}: ChoiceCardProps) {
  return (
    <label
      className={cx(
        'relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
        checked ? 'border-accent/60 bg-accent-soft' : 'border-line bg-ground hover:border-muted/50',
        'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45 has-[:disabled]:hover:border-line',
        FOCUS_RING
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        onClick={() => {
          if (type === 'radio' && checked && onReselect) onReselect();
        }}
        className="sr-only"
      />
      {lead ??
        (Icon && (
          <Icon className={cx('h-5 w-5 shrink-0', checked ? 'text-accent' : 'text-muted')} aria-hidden="true" />
        ))}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-medium text-fg">{title}</span>
        {description && <span className="text-xs leading-snug text-muted">{description}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          'flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors',
          type === 'radio' ? 'rounded-full' : 'rounded-md',
          checked ? 'border-accent-solid bg-accent-solid text-on-accent' : 'border-muted/60'
        )}
      >
        {checked &&
          (type === 'radio' ? (
            <span className="h-2 w-2 rounded-full bg-on-accent" />
          ) : (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          ))}
      </span>
    </label>
  );
}

interface PillRadioGroupProps<T extends string> {
  /** Nombre accesible del grupo; también se muestra como leyenda salvo que `hideLegend` */
  legend: string;
  hideLegend?: boolean;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  hint?: string;
  className?: string;
}

/** Selector segmentado en píldora (2–3 opciones cortas) con radios nativos. */
export function PillRadioGroup<T extends string>({
  legend,
  hideLegend = false,
  options,
  value,
  onChange,
  hint,
  className,
}: PillRadioGroupProps<T>) {
  const name = useId();
  const hintId = useId();
  return (
    <fieldset className={cx('flex min-w-0 flex-col gap-2', className)} aria-describedby={hint ? hintId : undefined}>
      <legend className={cx('mb-2 text-sm font-medium text-fg', hideLegend && 'sr-only')}>{legend}</legend>
      <div className="flex gap-1 rounded-full border border-line bg-ground p-1">
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={cx(
                'flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full px-3 text-sm transition-colors',
                checked ? 'bg-fg font-semibold text-ground' : 'text-muted hover:text-fg',
                FOCUS_RING
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </fieldset>
  );
}
