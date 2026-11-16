import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error';
import { TRANSACTION_RUNNER, type TransactionRunner } from '../../common/transaction/transaction-runner';
import { canSeeInactiveRooms, toRoom, type NewRoom, type Room, type RoomChanges, type RoomViewerRole } from './domain/room';
import { ROOMS_REPOSITORY, type RoomsRepository } from './domain/rooms.repository';

/** API pública del módulo de salas (F-05). Otros módulos usan solo este service. */
@Injectable()
export class RoomsService {
  constructor(
    @Inject(ROOMS_REPOSITORY) private readonly rooms: RoomsRepository,
    @Inject(TRANSACTION_RUNNER) private readonly tx: TransactionRunner,
  ) {}

  /** A01: el filtro por rol vive aquí, no en la UI. */
  async list(role: RoomViewerRole): Promise<Room[]> {
    const rooms = await this.rooms.list({ onlyActive: !canSeeInactiveRooms(role) });
    return rooms.map(toRoom);
  }

  async findById(id: string): Promise<Room | null> {
    const room = await this.rooms.findById(id);
    return room ? toRoom(room) : null;
  }

  async create(room: NewRoom): Promise<Room> {
    return this.tx.run(async (ctx) => {
      const created = await this.rooms.create(ctx, room);
      // T06a agrega aquí la auditoría ROOM_CREATED, dentro de la misma transacción.
      return toRoom(created);
    });
  }

  /** D-14: desactivar (`isActive: false`) no borra la sala ni cancela sus reservas futuras. */
  async update(id: string, changes: RoomChanges): Promise<Room> {
    return this.tx.run(async (ctx) => {
      if (!(await this.rooms.findById(id, ctx))) { // misma conexión que la transacción (B-74)
        throw new AppError('NOT_FOUND', 'La sala no existe.');
      }
      const updated = await this.rooms.update(ctx, id, changes);
      // T06a agrega aquí la auditoría ROOM_UPDATED, dentro de la misma transacción.
      return toRoom(updated);
    });
  }
}
