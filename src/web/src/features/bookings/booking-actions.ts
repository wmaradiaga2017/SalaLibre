/**
 * Qué acciones ofrece la UI sobre una reserva (RN-11, RN-12; T09 CA2 y CA6). Solo decide si se muestra el botón:
 * la autorización real la hace la API con `BookingPolicy` (403 / 422), y ocultar el botón no la sustituye (OWASP A01).
 */
import { formatTime, localDate } from '../../shared/datetime';
import type { Booking } from './types';

/** "Cancelar" solo en reservas `CONFIRMED` que aún no empezaron, propias o, para `ADMIN`, de cualquiera. */
export function canCancel(booking: Booking, isAdmin: boolean, now: Date): boolean {
  return (
    booking.status === 'CONFIRMED' &&
    new Date(booking.startAt).getTime() > now.getTime() &&
    (booking.isMine || isAdmin)
  );
}

/**
 * "Ahora" para decidir las acciones: el más reciente entre el tick de `useNow` (cada minuto) y el momento en que
 * llegaron los datos. Así, tras un 422 `BOOKING_ALREADY_STARTED` y la recarga, el botón "Cancelar" desaparece al
 * instante en lugar de esperar al siguiente tick (T09 CA4).
 */
export function actionNow(now: Date, dataUpdatedAt: number): Date {
  return dataUpdatedAt > now.getTime() ? new Date(dataUpdatedAt) : now;
}

/** Día local (`AAAA-MM-DD` en `BUSINESS_TZ`) en que empieza la reserva. */
export function bookingDate(booking: Booking): string {
  return localDate(new Date(booking.startAt));
}

/** "09:00–10:00" en `BUSINESS_TZ`. */
export function bookingRange(booking: Booking): string {
  return `${formatTime(new Date(booking.startAt))}–${formatTime(new Date(booking.endAt))}`;
}
