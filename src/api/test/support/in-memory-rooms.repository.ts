import { randomUUID } from 'node:crypto';
import { AppError } from '../../src/common/errors/app-error';
import type { TransactionContext } from '../../src/common/transaction/transaction-runner';
import type { NewRoom, Room, RoomChanges } from '../../src/modules/rooms/domain/room';
import type { RoomsRepository } from '../../src/modules/rooms/domain/rooms.repository';

/** Salas de prueba (mismos nombres que el seed) más una inactiva. */
export function testRooms(): Room[] {
  return [
    { id: 'a1111111-1111-4111-8111-111111111111', name: 'Sala Copán', capacity: 8, location: 'Piso 1', equipment: ['TV', 'WHITEBOARD'], isActive: true },
    { id: 'a2222222-2222-4222-8222-222222222222', name: 'Sala Roatán', capacity: 4, location: 'Piso 1', equipment: ['WHITEBOARD'], isActive: true },
    { id: 'a3333333-3333-4333-8333-333333333333', name: 'Sala Antigua', capacity: 10, location: 'Piso 3', equipment: [], isActive: false },
  ];
}

/**
 * Repositorio de salas en memoria. Emula el índice único `lower(name)` (RN-22) y el orden por nombre.
 * Exige un contexto de transacción en las escrituras.
 */
export class InMemoryRoomsRepository implements RoomsRepository {
  constructor(readonly rooms: Room[] = testRooms()) {}

  async list({ onlyActive }: { onlyActive: boolean }): Promise<Room[]> {
    return this.rooms
      .filter((r) => !onlyActive || r.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => ({ ...r, equipment: [...r.equipment] }));
  }

  async findById(id: string): Promise<Room | null> {
    const room = this.rooms.find((r) => r.id === id);
    return room ? { ...room, equipment: [...room.equipment] } : null;
  }

  async create(ctx: TransactionContext, room: NewRoom): Promise<Room> {
    assertTx(ctx);
    this.assertNameFree(room.name);
    const created: Room = { id: randomUUID(), ...room, equipment: [...room.equipment], isActive: true };
    this.rooms.push(created);
    return { ...created };
  }

  async update(ctx: TransactionContext, id: string, changes: RoomChanges): Promise<Room> {
    assertTx(ctx);
    const room = this.rooms.find((r) => r.id === id);
    if (!room) {
      throw new AppError('NOT_FOUND', 'La sala no existe.');
    }
    if (changes.name !== undefined) {
      this.assertNameFree(changes.name, id);
    }
    const defined = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
    Object.assign(room, defined);
    return { ...room, equipment: [...room.equipment] };
  }

  private assertNameFree(name: string, exceptId?: string): void {
    if (this.rooms.some((r) => r.id !== exceptId && r.name.toLowerCase() === name.toLowerCase())) {
      throw new AppError('ROOM_NAME_TAKEN', 'Ya existe una sala con ese nombre.');
    }
  }
}

function assertTx(ctx: TransactionContext | undefined): void {
  if (!ctx) {
    throw new Error('Escritura de salas fuera de una transacción');
  }
}
