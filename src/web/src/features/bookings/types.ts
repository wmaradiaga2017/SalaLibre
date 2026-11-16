/** Objetos del API que usa la agenda (spec §8). */

/** Salas y equipamiento: los define `features/rooms` (T10); se reexportan para la agenda. */
export { EQUIPMENT, EQUIPMENT_LABELS, type Equipment, type Room } from '../rooms/types';

export interface BookingPerson {
  id: string;
  name: string;
}

export interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  owner: BookingPerson;
  /** `null` para un `EMPLOYEE` en reservas ajenas (RN-17, D-20): la API lo omite y la UI no lo reconstruye. */
  title: string | null;
  attendees: number;
  startAt: string;
  endAt: string;
  status: 'CONFIRMED' | 'CANCELLED';
  cancelledAt: string | null;
  cancelledBy: BookingPerson | null;
  isMine: boolean;
}

/** Cierres: los define `features/closures` (T10b); se reexportan para la agenda. */
export type { Closure } from '../closures/types';
