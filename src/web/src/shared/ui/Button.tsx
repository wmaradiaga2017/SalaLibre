import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from './cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  /** Petición en curso: muestra el spinner y deshabilita el botón (spec §9). */
  loading?: boolean;
  /** Icono a la izquierda del texto (decorativo). */
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary-container text-on-primary hover:bg-primary',
  secondary:
    'border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low',
  danger: 'bg-error text-on-error hover:bg-on-error-container',
  ghost: 'text-primary-container hover:bg-surface-container-low',
};

const SIZES = { md: 'h-9 px-4 text-label-md', lg: 'h-[46px] px-5 text-body-md font-semibold' };

/** Botón base: primario, secundario, peligro o fantasma; hover, foco visible, deshabilitado y cargando. */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  type = 'button',
  className,
  children,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-space-sm rounded-base whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={16} label="Enviando" /> : icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}
