'use client';

import { useId, useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordFieldProps = Omit<ComponentProps<'input'>, 'type' | 'className'> & {
  label: string;
  hint?: string;
};

/**
 * Campo de contraseña con botón para mostrarla. Sigue el estilo de TextField
 * (`@/components/ui/Field`), con un botón de alternar dentro del control.
 */
export default function PasswordField({ label, hint, id, ...props }: PasswordFieldProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const hintId = `${controlId}-hint`;
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={controlId} className="text-sm font-medium text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          id={controlId}
          type={visible ? 'text' : 'password'}
          aria-describedby={hint ? hintId : undefined}
          className="h-12 w-full rounded-xl border border-line bg-ground pr-12 pl-3.5 text-[15px] text-fg transition-colors placeholder:text-muted/70 focus:border-accent disabled:opacity-60"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label="Mostrar contraseña"
          aria-pressed={visible}
          aria-controls={controlId}
          title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute inset-y-0 right-0.5 my-auto inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:text-fg"
        >
          {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
