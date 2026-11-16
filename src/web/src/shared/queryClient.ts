import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './apiClient';

/** Los errores 4xx no se reintentan (la respuesta no va a cambiar); los de red o 5xx, una vez. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 1;
}

/** Caché de datos del servidor (TanStack Query, D-01). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}
