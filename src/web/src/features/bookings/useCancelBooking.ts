import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/apiClient';
import { agendaKeys } from './agenda-queries';
import type { Booking } from './types';

/**
 * `POST /bookings/:id/cancel` (F-03 paso 3, F-04). Al terminar, con éxito o con error, recarga todas las consultas de
 * reservas (`agendaKeys.bookings`: la agenda de cada día y Mis reservas), porque un 422 `BOOKING_ALREADY_STARTED` o
 * `BOOKING_ALREADY_CANCELLED` también indica que lo que se mostraba estaba desactualizado (T09 CA3 y CA4).
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<Booking>(`/bookings/${encodeURIComponent(id)}/cancel`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: agendaKeys.bookings }),
  });
}
