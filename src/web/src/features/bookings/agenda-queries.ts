import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/apiClient';
import type { Booking, Closure, Room } from './types';

/**
 * Datos de la agenda (F-02 paso 1): `GET /rooms`, `GET /bookings?date=` y `GET /closures`. Las claves se exportan para
 * que T08a (reservar) y T09 (cancelar) invaliden la agenda.
 */
export const agendaKeys = {
  rooms: ['rooms'] as const,
  bookingsOf: (date: string) => ['bookings', 'day', date] as const,
  bookings: ['bookings'] as const,
  closures: ['closures'] as const,
};

/** Salas de la agenda. Un `ADMIN` recibe también las inactivas: la agenda muestra solo las activas (spec §9). */
export function useRooms() {
  return useQuery({
    queryKey: agendaKeys.rooms,
    queryFn: ({ signal }) => apiClient.get<Room[]>('/rooms', { signal }),
  });
}

/** Reservas `CONFIRMED` del día (en `BUSINESS_TZ`). Cambiar la fecha cambia la clave y vuelve a pedirlas (CA10). */
export function useBookings(date: string) {
  return useQuery({
    queryKey: agendaKeys.bookingsOf(date),
    queryFn: ({ signal }) => apiClient.get<Booking[]>(`/bookings?date=${encodeURIComponent(date)}`, { signal }),
  });
}

/** Cierres con fecha ≥ hoy (RN-10, D-23). */
export function useClosures() {
  return useQuery({
    queryKey: agendaKeys.closures,
    queryFn: ({ signal }) => apiClient.get<Closure[]>('/closures', { signal }),
  });
}
