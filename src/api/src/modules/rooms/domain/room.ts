// Dominio de salas: tipos puros, sin dependencias de Nest, Prisma ni HTTP.

/** Equipamiento de lista fija (D-25, RN-22). Agregar un valor requiere migración. */
export const EQUIPMENT = ['PROJECTOR', 'VIDEOCONF', 'WHITEBOARD', 'TV'] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/** Límites de RN-22 y spec §7 (`rooms`). */
export const ROOM_LIMITS = {
  nameMax: 60,
  locationMax: 100,
  capacityMin: 1,
  capacityMax: 100,
} as const;

/** Sala tal como la expone la API (spec §8, objeto `Room`). */
export interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: Equipment[];
  isActive: boolean;
}

export interface NewRoom {
  name: string;
  capacity: number;
  location: string;
  equipment: Equipment[];
}

/** Cambios parciales de `PATCH /rooms/:id`; solo se tocan los campos presentes. */
export type RoomChanges = Partial<NewRoom & { isActive: boolean }>;

/** Rol de quien lista las salas. */
export type RoomViewerRole = 'EMPLOYEE' | 'ADMIN';

/** A01: EMPLOYEE solo ve salas activas; ADMIN ve todas (spec §8, `GET /api/rooms`). */
export function canSeeInactiveRooms(role: RoomViewerRole): boolean {
  return role === 'ADMIN';
}

export function toRoom(room: Room): Room {
  return {
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    location: room.location,
    equipment: [...room.equipment],
    isActive: room.isActive,
  };
}
