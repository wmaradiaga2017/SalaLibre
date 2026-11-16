import { Injectable } from '@nestjs/common';
import { prismaTx } from '../../../common/transaction/prisma-transaction-runner';
import type { TransactionContext } from '../../../common/transaction/transaction-runner';
import { PrismaService } from '../../../prisma/prisma.service';
import type { BookingRecord, NewBooking } from '../domain/booking';
import type { BookingsRepository } from '../domain/bookings.repository';

const SELECT = {
  id: true,
  roomId: true,
  userId: true,
  title: true,
  attendees: true,
  startAt: true,
  endAt: true,
  status: true,
  cancelledAt: true,
  cancelledById: true,
  room: { select: { name: true } },
  user: { select: { name: true } },
  cancelledBy: { select: { name: true } },
} as const;

interface Row {
  id: string;
  roomId: string;
  userId: string;
  title: string;
  attendees: number;
  startAt: Date;
  endAt: Date;
  status: 'CONFIRMED' | 'CANCELLED';
  cancelledAt: Date | null;
  cancelledById: string | null;
  room: { name: string };
  user: { name: string };
  cancelledBy: { name: string } | null;
}

function toRecord(row: Row): BookingRecord {
  return {
    id: row.id,
    roomId: row.roomId,
    roomName: row.room.name,
    userId: row.userId,
    ownerName: row.user.name,
    title: row.title,
    attendees: row.attendees,
    startAt: row.startAt,
    endAt: row.endAt,
    status: row.status,
    cancelledAt: row.cancelledAt,
    cancelledById: row.cancelledById,
    cancelledByName: row.cancelledBy?.name ?? null,
  };
}

@Injectable()
export class PrismaBookingsRepository implements BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<BookingRecord | null> {
    const row = await this.prisma.booking.findUnique({ where: { id }, select: SELECT });
    return row ? toRecord(row) : null;
  }

  async listConfirmedStartingBetween(from: Date, to: Date): Promise<BookingRecord[]> {
    const rows = await this.prisma.booking.findMany({
      where: { status: 'CONFIRMED', startAt: { gte: from, lt: to } },
      orderBy: [{ startAt: 'asc' }, { room: { name: 'asc' } }],
      select: SELECT,
    });
    return rows.map(toRecord);
  }

  async listByUserEndingFrom(userId: string, from: Date): Promise<BookingRecord[]> {
    const rows = await this.prisma.booking.findMany({
      where: { userId, endAt: { gte: from } },
      orderBy: [{ startAt: 'asc' }, { room: { name: 'asc' } }],
      select: SELECT,
    });
    return rows.map(toRecord);
  }

  /**
   * RN-10. Lee la tabla `closures` directamente y no a través de `ClosuresService`: el módulo de cierres importa este
   * (cancelación en cascada, RN-16) y usar su service crearía un ciclo (T05b). La consulta corre en la misma
   * transacción que el INSERT y después del lock por fecha, que también toma la creación de cierres (spec §11).
   */
  async isDateClosed(ctx: TransactionContext, date: string): Promise<boolean> {
    const closure = await prismaTx(ctx).closure.findUnique({
      where: { date: new Date(`${date}T00:00:00.000Z`) },
      select: { id: true },
    });
    return closure !== null;
  }

  async create(ctx: TransactionContext, booking: NewBooking): Promise<BookingRecord> {
    const row = await prismaTx(ctx).booking.create({ data: booking, select: SELECT });
    return toRecord(row);
  }

  async cancel(ctx: TransactionContext, id: string, cancelledById: string, at: Date): Promise<BookingRecord | null> {
    const tx = prismaTx(ctx);
    const { count } = await tx.booking.updateMany({
      where: { id, status: 'CONFIRMED' },
      data: { status: 'CANCELLED', cancelledAt: at, cancelledById },
    });
    if (count === 0) {
      return null;
    }
    const row = await tx.booking.findUniqueOrThrow({ where: { id }, select: SELECT });
    return toRecord(row);
  }

  async cancelFutureByUser(ctx: TransactionContext, userId: string, cancelledById: string, at: Date): Promise<string[]> {
    const rows = await prismaTx(ctx).booking.updateManyAndReturn({
      where: { userId, status: 'CONFIRMED', startAt: { gt: at } },
      data: { status: 'CANCELLED', cancelledAt: at, cancelledById },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async cancelConfirmedBetween(
    ctx: TransactionContext,
    from: Date,
    to: Date,
    cancelledById: string,
    at: Date,
  ): Promise<string[]> {
    const rows = await prismaTx(ctx).booking.updateManyAndReturn({
      where: { status: 'CONFIRMED', startAt: { gte: from, lt: to } },
      data: { status: 'CANCELLED', cancelledAt: at, cancelledById },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
