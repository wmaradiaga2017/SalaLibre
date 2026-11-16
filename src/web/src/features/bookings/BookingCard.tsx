import { formatDuration, formatTime } from '../../shared/datetime';
import { Avatar, cn } from '../../shared/ui';
import { COMPACT_CARD_BELOW_MINUTES } from './agenda-config';
import { bookingBox, bookingHeadline } from './agenda-logic';
import type { Booking } from './types';

interface BookingCardProps {
  booking: Booking;
}

/**
 * Bloque de reunión (DESIGN.md, Componentes 1): posicionado de su inicio a su fin, con franja izquierda de 3 px
 * según de quién es (azul la propia, rojo de "Ocupada" la ajena), texto principal, rango horario y dueño.
 * Privacidad (RN-17, D-20): si la API no envió el título, se muestra "Ocupado"; nunca se reconstruye.
 * Las de menos de 30 min usan la tarjeta compacta en línea: texto principal, duración y dueño (CA9). En T08 no tiene acciones (cancelar es T09).
 */
export function BookingCard({ booking }: BookingCardProps) {
  const { top, height, minutes } = bookingBox(booking);
  const headline = bookingHeadline(booking);
  const range = `${formatTime(new Date(booking.startAt))}–${formatTime(new Date(booking.endAt))}`;
  const owner = booking.owner.name;
  const label = `${booking.isMine ? 'Tu reserva' : 'Reservada'}: ${headline}, ${owner}, ${range}`;
  const compact = minutes < COMPACT_CARD_BELOW_MINUTES;
  const tall = minutes >= 60;

  return (
    <article
      aria-label={label}
      title={label}
      style={{ top, height }}
      className={cn(
        'absolute inset-x-1 z-[1] overflow-hidden rounded-base border border-divider border-l-[3px]',
        'bg-surface-container-lowest text-on-surface shadow-elevated',
        booking.isMine ? 'border-l-primary-container' : 'border-l-busy',
        compact ? 'flex items-center gap-space-xs px-space-sm' : 'flex flex-col px-space-sm py-px',
        tall && 'gap-space-xs py-space-xs',
      )}
    >
      {compact ? (
        <>
          <span className="shrink-0 text-label-xs">{headline}</span>
          <span className="min-w-0 truncate text-label-xs font-normal text-on-surface-variant">
            <span className="tnum">{formatDuration(minutes)}</span> · {owner}
          </span>
        </>
      ) : tall ? (
        <>
          <span className="text-label-xs text-on-surface-variant tnum">{range}</span>
          <span className="truncate text-label-sm">{headline}</span>
          <span className="mt-auto flex min-w-0 items-center gap-space-xs">
            <Avatar name={owner} size="xs" />
            <span className="truncate text-label-xs font-normal text-on-surface-variant">{owner}</span>
          </span>
        </>
      ) : (
        <>
          <span className="truncate text-label-sm">{headline}</span>
          <span className="truncate text-label-xs font-normal text-on-surface-variant">
            <span className="tnum">{range}</span> · {owner}
          </span>
        </>
      )}
    </article>
  );
}
