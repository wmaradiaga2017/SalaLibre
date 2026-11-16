/** Objeto `Closure` del API (spec §8), sus límites y su clave de caché. La agenda los importa desde aquí. */

export interface Closure {
  id: string;
  /** Día de calendario `AAAA-MM-DD` en `BUSINESS_TZ`. */
  date: string;
  reason: string;
}

/** Límite de `reason` del API (`CLOSURE_LIMITS`, spec §7). */
export const CLOSURE_LIMITS = { reasonMax: 100 } as const;

/**
 * Clave de los cierres (`GET /closures`), compartida con la agenda (`agendaKeys.closures`). Vive aquí, en un archivo sin
 * imports, para que `features/bookings` y `features/closures` la usen sin un ciclo de imports.
 */
export const closureKeys = {
  all: ['closures'] as const,
};
