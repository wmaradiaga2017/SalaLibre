import { useRef, useState } from 'react';
import { toApiError } from '../../shared/apiClient';
import { formatLongDate } from '../../shared/datetime';
import { Banner, ConfirmDialog, useToast } from '../../shared/ui';
import { bookingDate, bookingRange } from './booking-actions';
import { bookingErrorInfo, STALE_CANCEL_ERRORS } from './booking-errors';
import { bookingHeadline } from './agenda-logic';
import type { Booking } from './types';
import { useCancelBooking } from './useCancelBooking';

interface CancelBookingDialogProps {
  booking: Booking;
  onClose: () => void;
}

/**
 * Confirmación de cancelar (F-03 paso 2, F-04; DESIGN.md Componentes 6): diálogo propio de la app, nunca
 * `window.confirm`, con la reserva y la consecuencia. Al confirmar, `POST /bookings/:id/cancel` (T09 CA3).
 * - Éxito: aviso y cierre; la lista y la agenda se recargan (`useCancelBooking`).
 * - 422 `BOOKING_ALREADY_STARTED` / `BOOKING_ALREADY_CANCELLED`: aviso de error con el mensaje en español, cierre y
 *   recarga (CA4).
 * - Otro error: banner dentro del diálogo con el `requestId`, para reintentar o volver.
 */
export function CancelBookingDialog({ booking, onClose }: CancelBookingDialogProps) {
  const toast = useToast();
  const cancel = useCancelBooking();
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  // Candado síncrono contra el doble envío (CLAUDE.md, T08a): `isPending` llega tarde a los clics seguidos.
  const sending = useRef(false);

  const date = formatLongDate(bookingDate(booking));
  const range = bookingRange(booking);
  const subject = `${booking.roomName}, ${date}, ${range}`;

  const confirm = () => {
    if (sending.current) return;
    sending.current = true;
    setError(null);
    cancel.mutate(booking.id, {
      onSuccess: () => {
        toast.show({ tone: 'success', message: `Reserva cancelada: ${subject}.` });
        onClose();
      },
      onError: (e) => {
        const apiError = toApiError(e);
        const info = bookingErrorInfo(apiError);
        if (STALE_CANCEL_ERRORS.has(apiError.code)) {
          toast.show({ tone: 'error', message: info.message, requestId: apiError.requestId });
          onClose();
        } else {
          setError({ message: info.message, requestId: apiError.requestId });
        }
      },
      onSettled: () => {
        sending.current = false;
      },
    });
  };

  return (
    <ConfirmDialog
      open
      title="Cancelar reserva"
      confirmLabel="Cancelar reserva"
      cancelLabel="Volver"
      tone="danger"
      loading={cancel.isPending}
      onConfirm={confirm}
      onCancel={onClose}
    >
      <div className="flex flex-col gap-space-md">
        {error && (
          <Banner tone="error" requestId={error.requestId}>
            {error.message}
          </Banner>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-space-md gap-y-space-xs">
          <dt className="text-label-md text-on-surface-variant">Reunión</dt>
          <dd className="text-body-md text-on-surface">{bookingHeadline(booking)}</dd>
          <dt className="text-label-md text-on-surface-variant">Sala</dt>
          <dd className="text-body-md text-on-surface">{booking.roomName}</dd>
          <dt className="text-label-md text-on-surface-variant">Fecha</dt>
          <dd className="text-body-md text-on-surface">{date}</dd>
          <dt className="text-label-md text-on-surface-variant">Horario</dt>
          <dd className="text-body-md text-on-surface tnum">{range}</dd>
          {!booking.isMine && (
            <>
              <dt className="text-label-md text-on-surface-variant">Dueño</dt>
              <dd className="text-body-md text-on-surface">{booking.owner.name}</dd>
            </>
          )}
        </dl>
        <p>La sala quedará libre en ese horario. La cancelación no se puede deshacer.</p>
      </div>
    </ConfirmDialog>
  );
}
