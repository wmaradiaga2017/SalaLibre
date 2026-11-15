/** Códigos de error de la API y su estado HTTP (spec §8, D-06). */
export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BOOKING_CONFLICT: 409,
  ROOM_NAME_TAKEN: 409,
  EMAIL_TAKEN: 409,
  CLOSURE_EXISTS: 409,
  INVALID_SLOT: 422,
  INVALID_DURATION: 422,
  OUTSIDE_BUSINESS_HOURS: 422,
  BOOKING_IN_PAST: 422,
  TOO_FAR_AHEAD: 422,
  CAPACITY_EXCEEDED: 422,
  ROOM_INACTIVE: 422,
  DAY_CLOSED: 422,
  BOOKING_ALREADY_STARTED: 422,
  BOOKING_ALREADY_CANCELLED: 422,
  INVALID_CURRENT_PASSWORD: 422,
  CLOSURE_IN_PAST: 422,
  CANNOT_DEACTIVATE_SELF: 422,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

/** Mensajes por defecto para los errores que no lanza el código de negocio. */
export const DEFAULT_MESSAGES: Partial<Record<ErrorCode, string>> = {
  VALIDATION_ERROR: 'La petición no tiene un formato válido.',
  UNAUTHENTICATED: 'Necesitas iniciar sesión.',
  FORBIDDEN: 'No tienes permiso para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no existe.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado. Intenta de nuevo.',
};
