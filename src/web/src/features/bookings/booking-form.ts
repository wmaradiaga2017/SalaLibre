/**
 * Esquema y opciones del formulario de reserva (spec §9, T08a). Las reglas son las del API (RN-03, RN-04, RN-07,
 * RN-08) para avisar antes de enviar; la API vuelve a validarlas y decide (RN-01 a RN-10).
 */
import { z } from 'zod';
import { formatDuration, formatMinutes } from '../../shared/datetime';
import { CLOSE_MINUTES, SLOT_MINUTES, SLOT_STARTS } from './agenda-config';

/** `BOOKING_MIN_MINUTES` y `BOOKING_MAX_MINUTES` (RN-03, spec §5). */
export const MIN_DURATION = 15;
export const MAX_DURATION = 240;
/** Duración que se propone al abrir el formulario (sin pasar del cierre). */
export const DEFAULT_DURATION = 60;
/** RN-08: 1 a 100 caracteres tras quitar los espacios de los extremos. */
export const TITLE_MAX = 100;

/** Valores del formulario: inicio y fin en minutos desde la medianoche local, como texto del `<select>`. */
export function bookingSchema(capacity: number | undefined) {
  return z
    .object({
      roomId: z.string().min(1, { error: 'Elige una sala.' }),
      start: z.string().min(1, { error: 'Elige la hora de inicio.' }),
      end: z.string().min(1, { error: 'Elige la hora de fin.' }),
      title: z
        .string()
        .refine((v) => v.trim().length >= 1, { error: 'Escribe un título.' })
        .refine((v) => v.trim().length <= TITLE_MAX, { error: `El título admite como máximo ${TITLE_MAX} caracteres.` }),
      attendees: z
        .number({ error: 'Indica cuántas personas asistirán.' })
        .int({ error: 'Los asistentes deben ser un número entero.' })
        .min(1, { error: 'Debe asistir al menos 1 persona.' }),
    })
    .superRefine((v, ctx) => {
      if (capacity !== undefined && Number.isInteger(v.attendees) && v.attendees > capacity) {
        ctx.addIssue({
          code: 'custom',
          path: ['attendees'],
          message: `La sala admite como máximo ${capacity} personas.`,
        });
      }
      const duration = Number(v.end) - Number(v.start);
      if (v.start && v.end && (duration < MIN_DURATION || duration > MAX_DURATION)) {
        ctx.addIssue({ code: 'custom', path: ['end'], message: `La reserva debe durar entre ${MIN_DURATION} minutos y ${MAX_DURATION / 60} horas.` });
      }
    });
}

export type BookingFormValues = z.infer<ReturnType<typeof bookingSchema>>;

/** Inicios posibles: 07:00 … 19:45 (RN-02, RN-04). */
export const START_OPTIONS = SLOT_STARTS.map((m) => ({ value: String(m), label: formatMinutes(m) }));

/** Fines posibles para un inicio: de inicio + 15 min a inicio + 4 h, sin pasar de las 20:00 (RN-03, RN-04). */
export function endOptions(start: number) {
  const options = [];
  for (let m = start + MIN_DURATION; m <= Math.min(start + MAX_DURATION, CLOSE_MINUTES); m += SLOT_MINUTES) {
    options.push({ value: String(m), label: `${formatMinutes(m)} (${formatDuration(m - start)})` });
  }
  return options;
}

/** Fin propuesto para un inicio: una hora después, o el cierre si no cabe. */
export function defaultEnd(start: number): number {
  return Math.min(start + DEFAULT_DURATION, CLOSE_MINUTES);
}
