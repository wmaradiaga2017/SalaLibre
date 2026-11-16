// Dominio de reservas: tipos puros y mapeo a la vista de la API. Sin dependencias de Nest, Prisma ni HTTP.

export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type ViewerRole = 'EMPLOYEE' | 'ADMIN';

/** Quien hace la petición (de la sesión). */
export interface Viewer {
  id: string;
  role: ViewerRole;
}

/** Reserva con los datos que hacen falta para responder (sala y nombres incluidos). */
export interface BookingRecord {
  id: string;
  roomId: string;
  roomName: string;
  userId: string;
  ownerName: string;
  title: string;
  attendees: number;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  cancelledAt: Date | null;
  cancelledById: string | null;
  cancelledByName: string | null;
}

export interface NewBooking {
  roomId: string;
  userId: string;
  title: string;
  attendees: number;
  startAt: Date;
  endAt: Date;
}

export interface PersonRef {
  id: string;
  name: string;
}

/** Objeto `Booking` de spec §8. */
export interface BookingView {
  id: string;
  roomId: string;
  roomName: string;
  owner: PersonRef;
  /** RN-17: `null` para un EMPLOYEE cuando la reserva no es suya. */
  title: string | null;
  attendees: number;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  cancelledAt: string | null;
  cancelledBy: PersonRef | null;
  isMine: boolean;
}

/** RN-17 (D-20): un EMPLOYEE no ve el título de reservas ajenas; el ADMIN siempre lo ve. */
export function canSeeTitle(viewer: Viewer, booking: Pick<BookingRecord, 'userId'>): boolean {
  return viewer.role === 'ADMIN' || booking.userId === viewer.id;
}

export function toBookingView(booking: BookingRecord, viewer: Viewer): BookingView {
  return {
    id: booking.id,
    roomId: booking.roomId,
    roomName: booking.roomName,
    owner: { id: booking.userId, name: booking.ownerName },
    title: canSeeTitle(viewer, booking) ? booking.title : null,
    attendees: booking.attendees,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    status: booking.status,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
    cancelledBy:
      booking.cancelledById && booking.cancelledByName
        ? { id: booking.cancelledById, name: booking.cancelledByName }
        : null,
    isMine: booking.userId === viewer.id,
  };
}
