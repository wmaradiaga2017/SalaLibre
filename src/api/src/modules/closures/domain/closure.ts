// Dominio de cierres: tipos puros y reglas, sin dependencias de Nest, Prisma ni HTTP.

/** spec §7 (`closures.reason`): 1–100 caracteres. */
export const CLOSURE_LIMITS = { reasonMax: 100 } as const;

/**
 * Día cerrado global (D-23). `date` es una fecha de calendario `AAAA-MM-DD` en `BUSINESS_TZ`, no un instante UTC
 * (spec §7, notas de T05b).
 */
export interface Closure {
  id: string;
  date: string;
  reason: string;
}

export interface NewClosure {
  date: string;
  reason: string;
  createdById: string;
}

/** `POST /closures` (spec §8): el `Closure` más el número de reservas canceladas en cascada (RN-16). */
export interface CreatedClosure extends Closure {
  cancelledBookings: number;
}

/**
 * RN-24 (S-04, D-31): solo se crea o elimina un cierre con fecha **posterior** a hoy (`today` en `BUSINESS_TZ`).
 * Las fechas `AAAA-MM-DD` se comparan como texto.
 */
export function isAfterToday(date: string, today: string): boolean {
  return date > today;
}

export function toClosure(closure: Closure): Closure {
  return { id: closure.id, date: closure.date, reason: closure.reason };
}
