import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/apiClient';
import type { Equipment, Room } from './types';

/**
 * Salas (spec §8): una sola clave para la agenda y para `/admin/rooms`. Crear, editar, desactivar o activar una sala
 * invalida `roomKeys.all`, así la agenda deja de mostrar una sala desactivada sin recargar la página (T10 CA4).
 */
export const roomKeys = {
  all: ['rooms'] as const,
};

/** `GET /rooms`: un `EMPLOYEE` recibe solo las activas; un `ADMIN`, todas, ordenadas por nombre. */
export function useRooms() {
  return useQuery({
    queryKey: roomKeys.all,
    queryFn: ({ signal }) => apiClient.get<Room[]>('/rooms', { signal }),
  });
}

export interface NewRoomInput {
  name: string;
  capacity: number;
  location: string;
  equipment: Equipment[];
}

/** Body parcial de `PATCH /rooms/:id`: solo los campos que cambian. */
export type RoomChangesInput = Partial<NewRoomInput & { isActive: boolean }>;

/** `POST /rooms` (F-05). */
export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewRoomInput) => apiClient.post<Room>('/rooms', input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: roomKeys.all }),
  });
}

/** `PATCH /rooms/:id` (F-05): edición y activar/desactivar. También recarga ante error (p. ej. sala inexistente). */
export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: RoomChangesInput }) =>
      apiClient.patch<Room>(`/rooms/${encodeURIComponent(id)}`, changes),
    onSettled: () => queryClient.invalidateQueries({ queryKey: roomKeys.all }),
  });
}
