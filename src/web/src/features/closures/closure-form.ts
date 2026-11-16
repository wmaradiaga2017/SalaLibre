/**
 * Formulario de cierre (T10b CA2 y CA4): validación del cliente igual a RN-24 y al DTO (fecha `AAAA-MM-DD` válida y
 * posterior a hoy en `BUSINESS_TZ`; motivo de 1 a 100 caracteres, no solo espacios y sin recortar) y el mapa de errores
 * del API. La validación del cliente es comodidad: el API vuelve a decidir con su propio "hoy".
 */
import { z } from 'zod';
import type { ApiError } from '../../shared/apiClient';
import { addDays } from '../../shared/datetime';
import { CLOSURE_LIMITS } from './types';

/** `AAAA-MM-DD` de un día que existe (`addDays(d, 0)` normaliza, así "2026-02-30" no vuelve igual). */
function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;
}

/** El esquema depende de "hoy" (`localDate(now)` en `BUSINESS_TZ`). Las fechas se comparan como texto. */
export function closureSchema(today: string) {
  return z.object({
    date: z
      .string()
      .refine((v) => v.length > 0, { error: 'Elige la fecha.' })
      .refine((v) => v.length === 0 || isCalendarDate(v), { error: 'Escribe una fecha válida.' })
      .refine((v) => !isCalendarDate(v) || v > today, {
        error: 'Solo se puede cerrar un día posterior a hoy.',
      }),
    reason: z
      .string()
      .refine((v) => v.trim().length > 0, { error: 'Escribe el motivo.' })
      .refine((v) => v.length <= CLOSURE_LIMITS.reasonMax, { error: `Máximo ${CLOSURE_LIMITS.reasonMax} caracteres.` }),
  });
}

export type ClosureFormValues = z.infer<ReturnType<typeof closureSchema>>;

/** Errores del API que corresponden a la fecha (409 `CLOSURE_EXISTS`, 422 `CLOSURE_IN_PAST`); el resto va al banner. */
const FIELD_ERRORS: Partial<Record<string, keyof ClosureFormValues>> = {
  CLOSURE_EXISTS: 'date',
  CLOSURE_IN_PAST: 'date',
};

export function closureErrorField(error: ApiError): keyof ClosureFormValues | undefined {
  return FIELD_ERRORS[error.code];
}

/** "1 reserva" / "3 reservas". */
export function bookingsLabel(count: number): string {
  return `${count} ${count === 1 ? 'reserva' : 'reservas'}`;
}

/** Aviso tras crear (CA3): "Se cancelaron N reservas" con `cancelledBookings`. */
export function cancelledMessage(count: number): string {
  if (count === 0) return 'No había reservas confirmadas ese día.';
  return count === 1 ? 'Se canceló 1 reserva.' : `Se cancelaron ${count} reservas.`;
}
