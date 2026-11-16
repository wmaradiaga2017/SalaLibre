/**
 * Formulario de sala (T10 CA2, CA3, CA5 y CA6): validación del cliente igual a RN-22 y al DTO del API, y el mapa de
 * errores del API a campos. La validación del cliente es comodidad: el API vuelve a validar.
 */
import { z } from 'zod';
import type { ApiError } from '../../shared/apiClient';
import { EQUIPMENT, ROOM_LIMITS, type Equipment, type Room } from './types';
import type { NewRoomInput, RoomChangesInput } from './rooms-queries';

/** Texto obligatorio como en el API: 1 a `max` caracteres y no solo espacios (`@Length` + `@NotBlank`). No se recorta. */
function requiredText(label: string, max: number) {
  return z
    .string()
    .refine((v) => v.trim().length > 0, { error: `Escribe ${label}.` })
    .refine((v) => v.length <= max, { error: `Máximo ${max} caracteres.` });
}

export const roomSchema = z.object({
  name: requiredText('el nombre de la sala', ROOM_LIMITS.nameMax),
  capacity: z
    .number({ error: 'Escribe la capacidad.' })
    .int({ error: 'La capacidad debe ser un número entero.' })
    .min(ROOM_LIMITS.capacityMin, { error: `La capacidad debe estar entre ${ROOM_LIMITS.capacityMin} y ${ROOM_LIMITS.capacityMax}.` })
    .max(ROOM_LIMITS.capacityMax, { error: `La capacidad debe estar entre ${ROOM_LIMITS.capacityMin} y ${ROOM_LIMITS.capacityMax}.` }),
  location: requiredText('la ubicación', ROOM_LIMITS.locationMax),
  equipment: z
    .array(z.enum(EQUIPMENT as [Equipment, ...Equipment[]]))
    .refine((list) => new Set(list).size === list.length, { error: 'Hay equipos repetidos.' }),
});

export type RoomFormValues = z.infer<typeof roomSchema>;

export const EMPTY_ROOM: RoomFormValues = { name: '', capacity: Number.NaN, location: '', equipment: [] };

export function roomToValues(room: Room): RoomFormValues {
  return { name: room.name, capacity: room.capacity, location: room.location, equipment: [...room.equipment] };
}

/** Valores del formulario en el orden fijo de la lista de equipos. */
export function toRoomInput(values: RoomFormValues): NewRoomInput {
  return {
    name: values.name,
    capacity: values.capacity,
    location: values.location,
    equipment: EQUIPMENT.filter((e) => values.equipment.includes(e)),
  };
}

/** Solo los campos que cambiaron respecto de la sala (CA3: `PATCH` con los cambios). Vacío si no cambió nada. */
export function roomChanges(room: Room, values: RoomFormValues): RoomChangesInput {
  const next = toRoomInput(values);
  const changes: RoomChangesInput = {};
  if (next.name !== room.name) changes.name = next.name;
  if (next.capacity !== room.capacity) changes.capacity = next.capacity;
  if (next.location !== room.location) changes.location = next.location;
  const sameEquipment =
    next.equipment.length === room.equipment.length && next.equipment.every((e) => room.equipment.includes(e));
  if (!sameEquipment) changes.equipment = next.equipment;
  return changes;
}

type RoomField = keyof RoomFormValues;

/** Errores del API que corresponden a un campo del formulario; el resto va al banner con su `requestId`. */
const FIELD_ERRORS: Partial<Record<string, RoomField>> = {
  ROOM_NAME_TAKEN: 'name',
};

export function roomErrorField(error: ApiError): RoomField | undefined {
  return FIELD_ERRORS[error.code];
}
