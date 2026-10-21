import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cx } from '@/lib/cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors select-none disabled:opacity-50 disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:pointer-events-none';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent-solid text-on-accent hover:bg-red-700 shadow-lg shadow-red-600/20',
  secondary: 'bg-surface text-fg border border-line hover:bg-raised',
  ghost: 'text-fg hover:bg-surface',
  danger: 'border border-accent/40 text-accent hover:bg-accent-soft',
};

// Todos los tamaños cumplen el área táctil mínima de 40-44px
const SIZES: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-[15px]',
  lg: 'h-14 px-6 text-base font-display',
};

export function buttonClasses({ variant = 'primary', size = 'md', fullWidth = false, className }: StyleProps = {}) {
  return cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className);
}

type ButtonProps = StyleProps &
  ComponentProps<'button'> & {
    loading?: boolean;
    icon?: ReactNode;
  };

export function Button({ variant, size, fullWidth, className, loading = false, icon, disabled, children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = StyleProps & ComponentProps<typeof Link> & { icon?: ReactNode };

export function ButtonLink({ variant, size, fullWidth, className, icon, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...props}>
      {icon}
      {children}
    </Link>
  );
}

type IconButtonProps = Omit<ComponentProps<'button'>, 'aria-label'> & {
  /** Obligatorio: es el único nombre accesible del botón */
  label: string;
  variant?: 'secondary' | 'ghost';
};

export function IconButton({ label, variant = 'ghost', className, type = 'button', children, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50',
        variant === 'secondary' ? 'border border-line bg-surface text-fg hover:bg-raised' : 'text-muted hover:bg-surface hover:text-fg',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
