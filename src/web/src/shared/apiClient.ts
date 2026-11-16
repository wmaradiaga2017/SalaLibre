/**
 * Único cliente HTTP de la app (CLAUDE.md, Frontend; D-03, D-06). Todas las peticiones van a `/api` con la cookie
 * `access_token` (`credentials: 'include'`): el frontend nunca lee ni guarda tokens.
 * - Los errores del API (`{ error: { code, message, requestId } }`) se convierten en `ApiError`, con su `requestId`.
 * - Todo 401 llama al manejador de sesión (lo registra `AuthProvider`): limpia la sesión y lleva a `/login`.
 * - El 409 `BOOKING_CONFLICT` usa el mensaje del spec (F-02).
 */

const BASE_URL = '/api';

/** Mensajes propios del frontend para algunos códigos (spec §6). El resto usa el `message` del API. */
const MESSAGES: Partial<Record<string, string>> = {
  BOOKING_CONFLICT: 'Ese horario acaba de ocuparse.',
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** Registra quién atiende los 401 (solo `AuthProvider`). Devuelve la función para quitarlo. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): () => void {
  onUnauthorized = handler;
  return () => {
    if (onUnauthorized === handler) onUnauthorized = null;
  };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /**
   * El 401 de esta petición no dispara la salida a `/login`: lo resuelve quien llama. Solo para `POST /auth/login`
   * (401 = credenciales incorrectas), `GET /auth/me` (401 = sin sesión) y `POST /auth/logout`.
   */
  skipUnauthorizedHandler?: boolean;
}

function isErrorBody(value: unknown): value is { error: { code: string; message: string; requestId?: string } } {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** Petición al API. Devuelve el JSON de la respuesta (o `undefined` en un 204) y lanza `ApiError` si falla. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, skipUnauthorizedHandler = false } = options;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }

  const data = await readJson(response);
  if (response.ok) return data as T;

  const headerRequestId = response.headers.get('X-Request-Id') ?? undefined;
  const error = isErrorBody(data)
    ? new ApiError(
        response.status,
        data.error.code,
        MESSAGES[data.error.code] ?? data.error.message,
        data.error.requestId ?? headerRequestId,
      )
    : new ApiError(response.status, 'INTERNAL_ERROR', 'Ocurrió un error inesperado. Inténtalo de nuevo.', headerRequestId);

  if (response.status === 401 && !skipUnauthorizedHandler) onUnauthorized?.();
  throw error;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) => apiRequest<T>(path, options),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

/** Normaliza cualquier error para mostrarlo en pantalla (mensaje y `requestId`, spec §9 "Error"). */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(0, 'INTERNAL_ERROR', 'Ocurrió un error inesperado. Inténtalo de nuevo.');
}
