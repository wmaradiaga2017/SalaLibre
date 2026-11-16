import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/apiClient';
import { roomKeys } from '../rooms/rooms-queries';
import type { Booking, Closure } from './types';

/** Salas de la agenda: la consulta es la de `features/rooms` (T10). Un `ADMIN` recibe también las inactivas: la agenda muestra solo las activas (spec §9). */
export { useRooms } from '../rooms/rooms-queries';

/**
 * Datos de la agenda (F-02 paso 1): `GET /rooms`, `GET /bookings?date=` y `GET /closures`. Las claves se exportan para
 * que T08a (reservar) y T09 (cancelar) invaliden la agenda.
 */
export const agendaKeys = {
  /** La misma clave que `roomKeys.all`: `/admin/rooms` la invalida al crear, editar o desactivar. */
  rooms: roomKeys.all,
  bookingsOf: (date: string) => ['bookings', 'day', date] as const,
  bookings: ['bookings'] as const,
  /** Mis reservas (T09). Cuelga de `bookings`: invalidar `agendaKeys.bookings` recarga también esta lista. */
  mine: ['bookings', 'mine'] as const,
  closures: ['closures'] as const,
};

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
