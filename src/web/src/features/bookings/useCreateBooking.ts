import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../shared/apiClient';
import { agendaKeys } from './agenda-queries';
import type { Booking } from './types';

export interface CreateBookingInput {
  roomId: string;
  /** ISO 8601 con zona (UTC, `Z`). */
  startAt: string;
  endAt: string;
  title: string;
  attendees: number;
}

/**
 * `POST /bookings` (F-02 pasos 4–7). Al crearla, y también ante un choque (409), se recargan las reservas para que la
 * agenda muestre lo que hay de verdad (F-02 pasos 6 y 7). Un día cerrado o una sala inactiva recargan además los cierres
 * o las salas, porque la agenda estaba desactualizada.
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => apiClient.post<Booking>('/bookings', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: agendaKeys.bookings }),
    onError: (error) => {
      if (!(error instanceof ApiError)) return;
      if (error.code === 'BOOKING_CONFLICT') void queryClient.invalidateQueries({ queryKey: agendaKeys.bookings });
      if (error.code === 'DAY_CLOSED') {
        void queryClient.invalidateQueries({ queryKey: agendaKeys.closures });
        void queryClient.invalidateQueries({ queryKey: agendaKeys.bookings });
      }
      if (error.code === 'ROOM_INACTIVE') void queryClient.invalidateQueries({ queryKey: agendaKeys.rooms });
    },
  });
}
