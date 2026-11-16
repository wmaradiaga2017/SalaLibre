/** Objetos del API que usa la agenda (spec §8). */

export type Equipment = 'PROJECTOR' | 'VIDEOCONF' | 'WHITEBOARD' | 'TV';

/** Lista fija de equipos (RN-22, D-25), en el orden en que se muestran. */
export const EQUIPMENT: readonly Equipment[] = ['PROJECTOR', 'VIDEOCONF', 'WHITEBOARD', 'TV'];

/** Etiquetas en español (notas de T08 en el backlog). */
export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  PROJECTOR: 'Proyector',
  VIDEOCONF: 'Videoconferencia',
  WHITEBOARD: 'Pizarra',
  TV: 'TV',
};

export interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: Equipment[];
  isActive: boolean;
}

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

export interface Closure {
  id: string;
  /** Día de calendario `AAAA-MM-DD` en `BUSINESS_TZ`. */
  date: string;
  reason: string;
}
