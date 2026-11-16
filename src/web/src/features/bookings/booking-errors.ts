/**
 * Errores de `POST /bookings` (spec §5 y §8, T08a CA3–CA5) y de `POST /bookings/:id/cancel` (T09 CA4): un solo lugar con el mensaje en español de cada código y
 * el campo del formulario al que corresponde. Los que no tienen campo van al banner del formulario con su `requestId`.
 * Las validaciones del cliente son comodidad: la API decide (RN-01 a RN-10).
 */
import type { ApiError } from '../../shared/apiClient';
import { formatMinutes } from '../../shared/datetime';
import { CLOSE_MINUTES, MAX_DAYS_AHEAD, OPEN_MINUTES } from './agenda-config';
import { MAX_DURATION, MIN_DURATION } from './booking-form';

export type BookingField = 'roomId' | 'start' | 'end' | 'title' | 'attendees';

interface BookingErrorInfo {
  message: string;
  field?: BookingField;
}

export const BOOKING_ERRORS: Partial<Record<string, BookingErrorInfo>> = {
  // RN-01 (F-02 paso 7): el texto lo fija el spec y es el mismo que usa `apiClient`.
  BOOKING_CONFLICT: { message: 'Ese horario acaba de ocuparse.' },
  // RN-02
  INVALID_SLOT: { message: 'El inicio y el fin deben caer en bloques de 15 minutos (:00, :15, :30 o :45).' },
  // RN-03
  INVALID_DURATION: { message: `La reserva debe durar entre ${MIN_DURATION} minutos y ${MAX_DURATION / 60} horas.`, field: 'end' },
  // RN-04
  OUTSIDE_BUSINESS_HOURS: {
    message: `Solo se reserva de lunes a viernes, entre las ${formatMinutes(OPEN_MINUTES)} y las ${formatMinutes(CLOSE_MINUTES)}, dentro del mismo día.`,
  },
  // RN-05
  BOOKING_IN_PAST: { message: 'Ese horario ya empezó. Elige un inicio posterior a la hora actual.', field: 'start' },
  // RN-06
  TOO_FAR_AHEAD: { message: `Solo se puede reservar hasta ${MAX_DAYS_AHEAD} días por adelantado.`, field: 'start' },
  // RN-07
  CAPACITY_EXCEEDED: { message: 'Hay más asistentes que la capacidad de la sala.', field: 'attendees' },
  // RN-09
  ROOM_INACTIVE: { message: 'La sala está desactivada y no admite reservas. Elige otra sala.', field: 'roomId' },
  // RN-10
  DAY_CLOSED: { message: 'Ese día está cerrado y no admite reservas.' },
  // RN-12 (cancelar, T09 CA4)
  BOOKING_ALREADY_STARTED: { message: 'La reserva ya empezó y no se puede cancelar.' },
  BOOKING_ALREADY_CANCELLED: { message: 'La reserva ya estaba cancelada.' },
};

/** Errores de cancelar que solo indican que la vista estaba desactualizada: se avisa y se recarga (T09 CA4). */
export const STALE_CANCEL_ERRORS: ReadonlySet<string> = new Set(['BOOKING_ALREADY_STARTED', 'BOOKING_ALREADY_CANCELLED']);

/** Mensaje y campo de un error de la API. Si el código no está en el mapa, se usa el mensaje del `apiClient`. */
export function bookingErrorInfo(error: ApiError): BookingErrorInfo {
  return BOOKING_ERRORS[error.code] ?? { message: error.message };
}
