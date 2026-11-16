/**
 * Funciones puras de la agenda (sin React), listas para probarse aunque el spec no pida pruebas de frontend (S-09).
 * No deciden si se puede reservar: eso lo decide la API al reservar (notas de T08). Solo dibujan lo que llega de
 * `GET /bookings` y ocultan la acción en huecos ya pasados y en días cerrados (CA7).
 */
import { addDays, isWeekday, localMinutes } from '../../shared/datetime';
import { MAX_DAYS_AHEAD, OPEN_MINUTES, PX_PER_MINUTE, SLOT_MINUTES } from './agenda-config';
import type { Booking, Equipment, Room } from './types';

/** Días que ofrece el selector: de hoy a hoy + 30, solo lunes a viernes (spec §9, CA2). */
export function agendaDays(today: string): string[] {
  const days: string[] = [];
  for (let i = 0; i <= MAX_DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    if (isWeekday(day)) days.push(day);
  }
  return days;
}

export interface RoomFilterValue {
  /** Capacidad mínima; `null` = sin filtro. */
  minCapacity: number | null;
  /** Equipos requeridos: la sala debe tenerlos todos. */
  equipment: Equipment[];
}

export const NO_FILTERS: RoomFilterValue = { minCapacity: null, equipment: [] };

export function hasFilters(filters: RoomFilterValue): boolean {
  return filters.minCapacity !== null || filters.equipment.length > 0;
}

/** Columnas de la agenda: salas activas que pasan los filtros, en el orden del API (por nombre). CA1, CA4. */
export function visibleRooms(rooms: Room[], filters: RoomFilterValue): Room[] {
  return rooms.filter(
    (room) =>
      room.isActive &&
      (filters.minCapacity === null || room.capacity >= filters.minCapacity) &&
      filters.equipment.every((e) => room.equipment.includes(e)),
  );
}

/** Minutos locales de inicio y fin de una reserva del día mostrado. */
export function bookingMinutes(booking: Booking): { start: number; end: number } {
  return { start: localMinutes(new Date(booking.startAt)), end: localMinutes(new Date(booking.endAt)) || 24 * 60 };
}

/** Posición vertical de una reserva en la grilla (alineada a las franjas de 16 px). CA9. */
export function bookingBox(booking: Booking): { top: number; height: number; minutes: number } {
  const { start, end } = bookingMinutes(booking);
  return {
    top: (start - OPEN_MINUTES) * PX_PER_MINUTE,
    height: (end - start) * PX_PER_MINUTE,
    minutes: end - start,
  };
}

/** Franjas (minuto de inicio) cubiertas por alguna reserva de la sala: no se ofrecen como libres. */
export function occupiedSlots(bookings: Booking[]): Set<number> {
  const taken = new Set<number>();
  for (const booking of bookings) {
    const { start, end } = bookingMinutes(booking);
    const first = Math.floor(start / SLOT_MINUTES) * SLOT_MINUTES;
    for (let m = first; m < end; m += SLOT_MINUTES) taken.add(m);
  }
  return taken;
}

/** Agrupa las reservas por sala. */
export function bookingsByRoom(bookings: Booking[]): Map<string, Booking[]> {
  const map = new Map<string, Booking[]>();
  for (const booking of bookings) {
    const list = map.get(booking.roomId);
    if (list) list.push(booking);
    else map.set(booking.roomId, [booking]);
  }
  return map;
}

/** Texto principal de una tarjeta (RN-17, D-20): el título si llegó; si no, "Ocupado". La UI nunca lo reconstruye. */
export function bookingHeadline(booking: Booking): string {
  return booking.title ?? 'Ocupado';
}
