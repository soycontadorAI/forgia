'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  /** Oculta la etiqueta visualmente; sigue disponible para lectores de pantalla */
  hideLabel?: boolean;
  className?: string;
}

const CONTROL =
  'w-full rounded-xl border border-line bg-ground px-3.5 text-[15px] text-fg placeholder:text-muted/70 transition-colors focus:border-accent aria-[invalid=true]:border-accent disabled:opacity-60';

function useFieldIds(id?: string) {
  const generated = useId();
  const controlId = id ?? generated;
  return { controlId, hintId: `${controlId}-hint`, errorId: `${controlId}-error` };
}

function Shell({
  controlId,
  hintId,
  errorId,
  label,
  hint,
  error,
  hideLabel,
  className,
  children,
}: FieldShellProps & { controlId: string; hintId: string; errorId: string; children: ReactNode }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={controlId} className={cx('text-sm font-medium text-fg', hideLabel && 'sr-only')}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(hint: string | undefined, error: string | undefined, hintId: string, errorId: string) {
  if (error) return errorId;
  if (hint) return hintId;
  return undefined;
}

type TextFieldProps = FieldShellProps & Omit<ComponentProps<'input'>, 'className'>;

export function TextField({ label, hint, error, hideLabel, className, id, ...props }: TextFieldProps) {
  const { controlId, hintId, errorId } = useFieldIds(id);
  return (
    <Shell {...{ controlId, hintId, errorId, label, hint, error, hideLabel, className }}>
      <input
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint, error, hintId, errorId)}
        className={cx(CONTROL, 'h-12')}
        {...props}
      />
    </Shell>
  );
}

type TextAreaFieldProps = FieldShellProps & Omit<ComponentProps<'textarea'>, 'className'>;

export function TextAreaField({ label, hint, error, hideLabel, className, id, rows = 3, ...props }: TextAreaFieldProps) {
  const { controlId, hintId, errorId } = useFieldIds(id);
  return (
    <Shell {...{ controlId, hintId, errorId, label, hint, error, hideLabel, className }}>
      <textarea
        id={controlId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint, error, hintId, errorId)}
        className={cx(CONTROL, 'py-3 leading-relaxed')}
        {...props}
      />
    </Shell>
  );
}

type SelectFieldProps = FieldShellProps & Omit<ComponentProps<'select'>, 'className'>;

export function SelectField({ label, hint, error, hideLabel, className, id, children, ...props }: SelectFieldProps) {
  const { controlId, hintId, errorId } = useFieldIds(id);
  return (
    <Shell {...{ controlId, hintId, errorId, label, hint, error, hideLabel, className }}>
      <select
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint, error, hintId, errorId)}
        className={cx(CONTROL, 'h-12')}
        {...props}
      >
        {children}
      </select>
    </Shell>
  );
}
