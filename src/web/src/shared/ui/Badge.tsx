import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Tonos de DESIGN.md (Componentes 2). En el MVP: `available` (Disponible, Confirmada, Activo), `busy` (Ocupada),
 * `maintenance` (Cancelada, Inactivo, día cerrado, sala inactiva) y `primary` (píldora neutra, p. ej. tipo de acción).
 * Qué tono lleva cada estado lo decide la pantalla.
 */
export type BadgeTone = 'available' | 'busy' | 'maintenance' | 'primary';

const TONES: Record<BadgeTone, { pill: string; dot: string }> = {
  available: {
    pill: 'border-available-outline bg-available-container text-on-available-container',
    dot: 'bg-available',
  },
  busy: { pill: 'border-busy-outline bg-busy-container text-on-busy-container', dot: 'bg-busy' },
  maintenance: {
    pill: 'border-maintenance-outline bg-maintenance-container text-on-maintenance-container',
    dot: 'bg-maintenance',
  },
  primary: { pill: 'border-primary-fixed-dim bg-primary-fixed text-on-primary-fixed-variant', dot: 'bg-primary-container' },
};

interface BadgeProps {
  tone: BadgeTone;
  /** El texto es obligatorio: el estado nunca se comunica solo con el color (DESIGN.md, Accesibilidad). */
  children: ReactNode;
  /** Punto de color delante del texto. */
  dot?: boolean;
  className?: string;
}

/** Insignia o píldora de estado (4 px en insignias de tabla; `rounded-full` con `pill`). */
export function Badge({ tone, children, dot = false, className }: BadgeProps) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-space-xs rounded-full border px-space-sm py-px text-label-sm whitespace-nowrap',
        t.pill,
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn('size-1.5 rounded-full', t.dot)} />}
      {children}
    </span>
  );
}
