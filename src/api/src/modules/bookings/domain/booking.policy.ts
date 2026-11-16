// BookingPolicy: quién puede cancelar y cuándo (RN-11, RN-12). Pura: sin Nest, Prisma ni HTTP.
import { AppError } from '../../../common/errors/app-error';
import type { BookingRecord, Viewer } from './booking';

/** RN-11: solo el dueño o un ADMIN cancela. */
export function canCancel(viewer: Viewer, booking: Pick<BookingRecord, 'userId'>): boolean {
  return viewer.role === 'ADMIN' || booking.userId === viewer.id;
}

/**
 * Orden de spec §8 para `POST /bookings/:id/cancel` (el 404 lo resuelve el servicio):
 * `FORBIDDEN` (RN-11) → `BOOKING_ALREADY_CANCELLED` → `BOOKING_ALREADY_STARTED` (RN-12).
 */
export function assertCanCancel(
  viewer: Viewer,
  booking: Pick<BookingRecord, 'userId' | 'status' | 'startAt'>,
  now: Date,
): void {
  if (!canCancel(viewer, booking)) {
    throw new AppError('FORBIDDEN', 'Solo quien hizo la reserva o un administrador puede cancelarla.');
  }
  if (booking.status === 'CANCELLED') {
    throw new AppError('BOOKING_ALREADY_CANCELLED', 'La reserva ya estaba cancelada.');
  }
  if (booking.startAt.getTime() <= now.getTime()) {
    throw new AppError('BOOKING_ALREADY_STARTED', 'La reserva ya empezó y no se puede cancelar.');
  }
}
