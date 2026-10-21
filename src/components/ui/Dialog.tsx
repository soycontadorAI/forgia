'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { cx } from '@/lib/cx';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Modal accesible sobre el <dialog> nativo: atrapa el foco, cierra con Escape,
 * deja inerte el resto de la página y devuelve el foco al cerrar.
 * En móvil se abre como hoja inferior; en escritorio, centrado.
 */
export function Dialog({ open, onClose, title, description, children, footer, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // El <dialog> no bloquea el scroll de la página de fondo por sí solo
  useEffect(() => {
    if (!open) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clic en el fondo (fuera del contenido) cierra
        if (event.target === ref.current) onClose();
      }}
      className={cx(
        'm-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-surface p-0 text-fg',
        'sm:m-auto sm:max-w-lg sm:rounded-3xl',
        'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        'motion-safe:open:animate-slide-up sm:motion-safe:open:animate-fade-in-up',
        className
      )}
    >
      <div className="flex flex-col gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 pt-2">
            <h2 id={titleId} className="font-display text-xl font-semibold tracking-tight">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Cerrar" onClick={onClose} className="-mr-2">
            <X className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </div>
        {children}
        {footer && <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  loading?: boolean;
}

/** Confirmación para acciones destructivas (borrar un WOD, un PR, etc.). */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, loading = false }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
