import { CircleX } from 'lucide-react';
import { formatLongDate } from '../../shared/datetime';
import { Avatar, Badge, Button, Modal } from '../../shared/ui';
import { bookingHeadline } from './agenda-logic';
import { bookingDate, bookingRange } from './booking-actions';
import type { Booking } from './types';

interface BookingDetailDialogProps {
  booking: Booking;
  /** Mostrar "Cancelar reserva" (propia o, para `ADMIN`, ajena; `CONFIRMED` y futura). Lo decide `canCancel`. */
  cancellable: boolean;
  onCancel: () => void;
  onClose: () => void;
}

/**
 * Detalle de una reserva de la agenda (T09, F-04 paso 2): título según lo que envía la API (RN-17: un `EMPLOYEE` ve
 * "Ocupado" en las ajenas, nunca se reconstruye), dueño, sala y horario. "Cancelar reserva" abre la confirmación.
 */
export function BookingDetailDialog({ booking, cancellable, onCancel, onClose }: BookingDetailDialogProps) {
  const headline = bookingHeadline(booking);

  return (
    <Modal
      open
      onClose={onClose}
      title={headline}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {cancellable && (
            <Button variant="danger" icon={<CircleX size={16} />} onClick={onCancel}>
              Cancelar reserva
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-space-md">
        <div className="flex items-center gap-space-sm">
          <Avatar name={booking.owner.name} size="sm" />
          <span className="text-body-md text-on-surface">{booking.owner.name}</span>
          {booking.isMine && <Badge tone="primary">Tu reserva</Badge>}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-space-md gap-y-space-xs">
          <dt className="text-label-md text-on-surface-variant">Sala</dt>
          <dd className="text-body-md text-on-surface">{booking.roomName}</dd>
          <dt className="text-label-md text-on-surface-variant">Fecha</dt>
          <dd className="text-body-md text-on-surface">{formatLongDate(bookingDate(booking))}</dd>
          <dt className="text-label-md text-on-surface-variant">Horario</dt>
          <dd className="text-body-md text-on-surface tnum">{bookingRange(booking)}</dd>
        </dl>
      </div>
    </Modal>
  );
}
