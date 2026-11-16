import { LoaderCircle } from 'lucide-react';
import { cn } from './cn';

interface SpinnerProps {
  /** Texto para lectores de pantalla. */
  label?: string;
  size?: number;
  className?: string;
}

/** Indicador de carga (spec §9, estado "Cargando"). */
export function Spinner({ label = 'Cargando', size = 20, className }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      <LoaderCircle aria-hidden="true" size={size} className="motion-safe:animate-spin" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Bloque de carga con la forma del contenido. Decorativo: el estado se anuncia con `Spinner` o `aria-busy`. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('rounded-base bg-surface-container motion-safe:animate-pulse', className)} />;
}
