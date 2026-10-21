import type { ComponentProps } from 'react';
import { cx } from '@/lib/cx';

type CardProps = ComponentProps<'div'> & {
  padding?: 'none' | 'sm' | 'md';
};

const PADDING = { none: '', sm: 'p-3', md: 'p-4 sm:p-5' };

/** Superficie base del sistema: un bloque de contenido sobre el fondo. */
export function Card({ padding = 'md', className, ...props }: CardProps) {
  return <div className={cx('rounded-3xl bg-surface', PADDING[padding], className)} {...props} />;
}

/** Etiqueta corta sobre un título de sección (ej. "Por qué este WOD"). */
export function Eyebrow({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cx('text-xs font-medium text-accent', className)} {...props} />;
}
