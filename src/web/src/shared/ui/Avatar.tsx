import { cn } from './cn';
import { initials } from './initials';

const SIZES = { xs: 'size-[18px] text-[9px]', sm: 'size-6 text-label-xs', md: 'size-8 text-label-sm' };

interface AvatarProps {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Círculo con iniciales (nunca fotos remotas). Decorativo: el nombre siempre se muestra al lado, así que el avatar
 * queda oculto para lectores de pantalla. `xs` (18 px) es el de las tarjetas de la agenda: sus iniciales son un
 * metadato, única excepción permitida al mínimo de 11 px (DESIGN.md, Accesibilidad).
 */
export function Avatar({ name, size = 'sm', className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-secondary-container font-semibold text-on-secondary-fixed',
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
