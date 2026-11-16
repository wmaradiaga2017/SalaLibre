import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/apiClient';
import { agendaKeys } from './agenda-queries';
import type { Booking } from './types';

/**
 * `GET /bookings/mine` (spec §8): reservas propias con `endAt` ≥ inicio de hoy, confirmadas y canceladas, ya
 * ordenadas por `startAt` por la API (T09 CA1).
 */
export function useMyBookings() {
  return useQuery({
    queryKey: agendaKeys.mine,
    queryFn: ({ signal }) => apiClient.get<Booking[]>('/bookings/mine', { signal }),
  });
}
