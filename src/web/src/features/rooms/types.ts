/** Objeto `Room` del API (spec §8) y lista fija de equipamiento (RN-22, D-25). La agenda los importa desde aquí. */

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

/** Límites de RN-22 y spec §7 (`rooms`), los mismos que valida el API (`ROOM_LIMITS`). */
export const ROOM_LIMITS = {
  nameMax: 60,
  locationMax: 100,
  capacityMin: 1,
  capacityMax: 100,
} as const;

export interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: Equipment[];
  isActive: boolean;
}
