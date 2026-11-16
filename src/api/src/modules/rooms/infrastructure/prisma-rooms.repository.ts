import { Injectable } from '@nestjs/common';
import { AppError } from '../../../common/errors/app-error';
import { prismaTx } from '../../../common/transaction/prisma-transaction-runner';
import type { TransactionContext } from '../../../common/transaction/transaction-runner';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { NewRoom, Room, RoomChanges } from '../domain/room';
import type { RoomsRepository } from '../domain/rooms.repository';

const SELECT = { id: true, name: true, capacity: true, location: true, equipment: true, isActive: true } as const;

const NAME_TAKEN_MESSAGE = 'Ya existe una sala con ese nombre.';

@Injectable()
export class PrismaRoomsRepository implements RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list({ onlyActive }: { onlyActive: boolean }): Promise<Room[]> {
    return this.prisma.room.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      select: SELECT,
    });
  }

  async findById(id: string, ctx?: TransactionContext): Promise<Room | null> {
    const client = ctx ? prismaTx(ctx) : this.prisma;
    return client.room.findUnique({ where: { id }, select: SELECT });
  }

  async create(ctx: TransactionContext, room: NewRoom): Promise<Room> {
    try {
      return await prismaTx(ctx).room.create({ data: room, select: SELECT });
    } catch (error) {
      throw translate(error);
    }
  }

  async update(ctx: TransactionContext, id: string, changes: RoomChanges): Promise<Room> {
    try {
      return await prismaTx(ctx).room.update({ where: { id }, data: changes, select: SELECT });
    } catch (error) {
      throw translate(error);
    }
  }
}

/**
 * La unicidad del nombre la garantiza el índice `rooms_name_lower_key` sobre `lower(name)` (RN-22), así que dos
 * altas simultáneas con el mismo nombre no pueden pasar. En `rooms` es el único índice único además de la PK.
 */
function translate(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new AppError('ROOM_NAME_TAKEN', NAME_TAKEN_MESSAGE);
    }
    if (error.code === 'P2025') {
      return new AppError('NOT_FOUND', 'La sala no existe.');
    }
  }
  return error;
}
