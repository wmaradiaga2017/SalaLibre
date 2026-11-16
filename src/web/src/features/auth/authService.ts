import { ApiError, apiClient } from '../../shared/apiClient';
import type { User } from './types';

/**
 * Llamadas de sesión sobre el `apiClient` (spec §8). La sesión vive en la cookie `httpOnly` `access_token` (D-03):
 * aquí no se lee, guarda ni devuelve ningún token, y la contraseña solo viaja en el cuerpo del login.
 */
export const authService = {
  /** `POST /auth/login`. Un 401 (`INVALID_CREDENTIALS`) llega como `ApiError` a quien llama, sin salir a `/login`. */
  login(email: string, password: string): Promise<User> {
    return apiClient.post<User>('/auth/login', { email, password }, { skipUnauthorizedHandler: true });
  },

  /** `POST /auth/logout` (204). */
  async logout(): Promise<void> {
    await apiClient.post<void>('/auth/logout', undefined, { skipUnauthorizedHandler: true });
  },

  /** `GET /auth/me`: el usuario de la sesión, o `null` si no hay sesión válida (401). */
  async me(signal?: AbortSignal): Promise<User | null> {
    try {
      return await apiClient.get<User>('/auth/me', { signal, skipUnauthorizedHandler: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
};
