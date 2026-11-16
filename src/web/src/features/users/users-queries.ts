import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/apiClient';
import { ME_QUERY_KEY } from '../auth/auth-context';
import { agendaKeys } from '../bookings/agenda-queries';
import type { Role, User } from './types';

/** Usuarios (spec §8, solo `ADMIN`). */
export const userKeys = {
  all: ['users'] as const,
};

/** `GET /users`: todos los usuarios ordenados por nombre (CA1). Sin filtros ni paginación (CA7). */
export function useUsers() {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: ({ signal }) => apiClient.get<User[]>('/users', { signal }),
  });
}

export interface NewUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

/** Body parcial de `PATCH /users/:id`: nombre, rol o estado. El correo y la contraseña no se editan aquí. */
export type UserChangesInput = Partial<{ name: string; role: Role; isActive: boolean }>;

/**
 * `POST /users` (F-06 paso 2). Lleva la contraseña inicial: `gcTime: 0` y quien la usa llama a `reset()` al terminar,
 * para que no quede en la caché de mutaciones (T07b, CA7).
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewUserInput) => apiClient.post<User>('/users', input),
    gcTime: 0,
    onSettled: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

/**
 * `PATCH /users/:id` (F-06 paso 3): editar nombre y rol, desactivar o activar. Desactivar cancela las reservas futuras
 * del usuario (RN-15), así que también se recargan la agenda y Mis reservas (`agendaKeys.bookings`). Si el `ADMIN` se
 * edita a sí mismo, se recarga su sesión (`/auth/me`) para que el rol mostrado sea el de la base.
 */
export function useUpdateUser(currentUserId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UserChangesInput }) =>
      apiClient.patch<User>(`/users/${encodeURIComponent(id)}`, changes),
    onSettled: (_data, _error, { id, changes }) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      if (changes.isActive === false) void queryClient.invalidateQueries({ queryKey: agendaKeys.bookings });
      if (id === currentUserId) void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

/** `POST /users/:id/reset-password` (F-06 paso 4), 204. Lleva una contraseña: `gcTime: 0` y `reset()` al terminar. */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiClient.post<void>(`/users/${encodeURIComponent(id)}/reset-password`, { newPassword }),
    gcTime: 0,
  });
}
