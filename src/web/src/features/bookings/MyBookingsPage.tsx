import { CalendarDays, CircleX, DoorOpen, Users } from 'lucide-react';
import { useState } from 'react';
import { toApiError } from '../../shared/apiClient';
import { formatShortDate, localDate, useNow } from '../../shared/datetime';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '../../shared/ui';
import { actionNow, bookingDate, bookingRange, canCancel } from './booking-actions';
import { CancelBookingDialog } from './CancelBookingDialog';
import type { Booking } from './types';
import { useMyBookings } from './useMyBookings';

/**
 * `/my-bookings` (spec §9, F-03; DESIGN.md prototipo `mis_reservas…`, solo las tarjetas y la acción Cancelar):
 * reservas propias desde hoy, confirmadas y canceladas, en el orden de la API (`startAt`). "Cancelar" solo en las
 * `CONFIRMED` que aún no empezaron (RN-12, CA2); la API vuelve a decidirlo.
 */
export function MyBookingsPage() {
  const now = useNow();
  const today = localDate(now);
  const bookings = useMyBookings();
  const [cancelling, setCancelling] = useState<Booking | null>(null);

  const upcoming = (bookings.data ?? []).filter((b) => b.status === 'CONFIRMED').length;

  let content;
  if (bookings.isError) {
    const error = toApiError(bookings.error);
    content = (
      <ErrorState
        message={error.message}
        requestId={error.requestId}
        onRetry={() => void bookings.refetch()}
        retrying={bookings.isFetching}
        className="rounded-lg border border-divider bg-surface-container-lowest"
      />
    );
  } else if (bookings.isPending) {
    content = <MyBookingsSkeleton />;
  } else if (bookings.data.length === 0) {
    content = (
      <EmptyState
        title="No tienes reservas próximas"
        description="Elige un hueco libre en la Agenda para reservar una sala."
        icon={<CalendarDays size={32} />}
        className="rounded-lg border border-divider bg-surface-container-lowest"
      />
    );
  } else {
    content = (
      <ul className="flex flex-col gap-space-md">
        {bookings.data.map((b) => (
          <li key={b.id}>
            <MyBookingCard
              booking={b}
              today={today}
              cancellable={canCancel(b, false, actionNow(now, bookings.dataUpdatedAt))}
              onCancel={() => setCancelling(b)}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby="titulo-mis-reservas" className="flex max-w-4xl flex-col gap-space-md">
      <div className="flex flex-wrap items-center gap-space-md">
        <h1 id="titulo-mis-reservas" className="text-headline-lg text-ink">
          Mis reservas
        </h1>
        {bookings.isSuccess && upcoming > 0 && (
          <Badge tone="primary">
            <span className="tnum">{upcoming}</span> {upcoming === 1 ? 'confirmada' : 'confirmadas'}
          </Badge>
        )}
      </div>
      <p className="text-body-md text-on-surface-variant">
        Tus reservas de hoy en adelante. Las horas están en hora de Tegucigalpa.
      </p>

      <div aria-busy={bookings.isFetching} aria-live="polite" className="sr-only">
        {bookings.isPending ? 'Cargando tus reservas' : ''}
      </div>

      {content}

      {cancelling && <CancelBookingDialog booking={cancelling} onClose={() => setCancelling(null)} />}
    </section>
  );
}

interface MyBookingCardProps {
  booking: Booking;
  today: string;
  cancellable: boolean;
  onCancel: () => void;
}

/** Tarjeta de reserva (prototipo de Stitch): fecha y horario, sala, título, asistentes y estado con texto. */
function MyBookingCard({ booking, today, cancellable, onCancel }: MyBookingCardProps) {
  const date = bookingDate(booking);
  const cancelled = booking.status === 'CANCELLED';
  const dayLabel = date === today ? `Hoy, ${formatShortDate(date)}` : formatShortDate(date);

  return (
    <article
      aria-label={`${booking.title ?? 'Reserva'}, ${booking.roomName}, ${dayLabel}, ${bookingRange(booking)}, ${cancelled ? 'cancelada' : 'confirmada'}`}
      className="flex flex-col gap-space-md rounded-lg border border-divider bg-surface-container-lowest p-gutter shadow-elevated"
    >
      <header className="flex flex-wrap items-center justify-between gap-space-sm border-b border-divider pb-space-md">
        <div className="flex flex-wrap items-center gap-space-md">
          <span className="rounded-base bg-primary-fixed px-space-sm py-space-xs text-label-sm text-on-primary-fixed-variant">
            {dayLabel}
          </span>
          <span className={`text-headline-sm tnum ${cancelled ? 'text-on-surface-variant line-through' : 'text-ink'}`}>
            {bookingRange(booking)}
          </span>
        </div>
        <Badge tone={cancelled ? 'maintenance' : 'available'} dot>
          {cancelled ? 'Cancelada' : 'Confirmada'}
        </Badge>
      </header>

      <div className="flex flex-col gap-space-xs">
        <p className="text-body-lg font-semibold text-on-surface">{booking.title ?? 'Reserva'}</p>
        <p className="flex flex-wrap items-center gap-x-space-md gap-y-space-xs text-body-sm text-on-surface-variant">
          <span className="inline-flex items-center gap-space-xs">
            <DoorOpen aria-hidden="true" size={16} />
            {booking.roomName}
          </span>
          <span className="inline-flex items-center gap-space-xs">
            <Users aria-hidden="true" size={16} />
            <span className="tnum">{booking.attendees}</span> {booking.attendees === 1 ? 'asistente' : 'asistentes'}
          </span>
          {cancelled && booking.cancelledBy && !isSelfCancel(booking) && (
            <span>Cancelada por {booking.cancelledBy.name}</span>
          )}
        </p>
      </div>

      {cancellable && (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            icon={<CircleX size={16} />}
            onClick={onCancel}
            aria-label={`Cancelar la reserva de ${booking.roomName}, ${dayLabel}, ${bookingRange(booking)}`}
          >
            Cancelar
          </Button>
        </div>
      )}
    </article>
  );
}

/** La cancelación la hizo el propio dueño (si la hizo un ADMIN o fue en cascada, se muestra quién). */
function isSelfCancel(booking: Booking): boolean {
  return booking.cancelledBy?.id === booking.owner.id;
}

function MyBookingsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-space-md">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-space-md rounded-lg border border-divider bg-surface-container-lowest p-gutter">
          <div className="flex gap-space-md">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3 opacity-60" />
        </div>
      ))}
    </div>
  );
}
