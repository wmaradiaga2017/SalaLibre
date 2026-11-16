import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/apiClient';
import { agendaKeys } from '../bookings/agenda-queries';
import { closureKeys, type Closure } from './types';

/** `GET /closures`: cierres con fecha ≥ hoy, ordenados por fecha (RN-10, D-23). Los usan la agenda y `/admin/closures`. */
export function useClosures() {
  return useQuery({
    queryKey: closureKeys.all,
    queryFn: ({ signal }) => apiClient.get<Closure[]>('/closures', { signal }),
  });
}

export interface NewClosureInput {
  date: string;
  reason: string;
}

/** Respuesta de `POST /closures` (spec §8): el cierre y cuántas reservas canceló (RN-16). */
export interface CreatedClosure extends Closure {
  cancelledBookings: number;
}

/**
 * `POST /closures` (F-07 paso 3). Cancela las reservas de ese día (RN-16), así que recarga también la agenda y Mis
 * reservas (`agendaKeys.bookings`), además de los cierres. Recarga también ante error (p. ej. `CLOSURE_EXISTS`).
 */
export function useCreateClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewClosureInput) => apiClient.post<CreatedClosure>('/closures', input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: closureKeys.all });
      void queryClient.invalidateQueries({ queryKey: agendaKeys.bookings });
    },
  });
}

/** `DELETE /closures/:id` (204). No restaura reservas (S-05), así que solo recarga los cierres. */
export function useDeleteClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/closures/${encodeURIComponent(id)}`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: closureKeys.all }),
  });
}
