import { randomUUID } from 'node:crypto';
import type { TransactionContext } from '../../src/common/transaction/transaction-runner';
import type { BookingRecord, NewBooking } from '../../src/modules/bookings/domain/booking';
import type { BookingsRepository } from '../../src/modules/bookings/domain/bookings.repository';

/** Error con la forma real que devuelve Prisma 7 + adapter-pg ante un `23P01` (confirmada contra la base en T05). */
export function exclusionViolation(): Error {
  return Object.assign(new Error('Database error. Code: `23P01`.'), {
    name: 'PrismaClientKnownRequestError',
    code: 'P2039',
    meta: {
      modelName: 'Booking',
      driverAdapterError: {
        name: 'DriverAdapterError',
        cause: { originalCode: '23P01', code: '23P01', kind: 'postgres' },
      },
    },
  });
}

/**
 * Reservas en memoria. Emula la restricción `bookings_no_overlap` (misma sala, `[start, end)` solapados, solo entre
 * `CONFIRMED`) lanzando el error real de Prisma. Registra los locks y exige contexto en las escrituras.
 */
export class InMemoryBookingsRepository implements BookingsRepository {
  readonly bookings: BookingRecord[] = [];
  readonly closedDates = new Set<string>();

  constructor(
    private readonly roomName: (id: string) => string,
    private readonly userName: (id: string) => string,
  ) {}

  async findById(id: string): Promise<BookingRecord | null> {
    const b = this.bookings.find((x) => x.id === id);
    return b ? { ...b } : null;
  }

  async listConfirmedStartingBetween(from: Date, to: Date): Promise<BookingRecord[]> {
    return this.sorted(this.bookings.filter((b) => b.status === 'CONFIRMED' && b.startAt >= from && b.startAt < to));
  }

  async listByUserEndingFrom(userId: string, from: Date): Promise<BookingRecord[]> {
    return this.sorted(this.bookings.filter((b) => b.userId === userId && b.endAt >= from));
  }

  async isDateClosed(ctx: TransactionContext, date: string): Promise<boolean> {
    assertTx(ctx);
    return this.closedDates.has(date);
  }

  async create(ctx: TransactionContext, booking: NewBooking): Promise<BookingRecord> {
    assertTx(ctx);
    const overlaps = this.bookings.some(
      (b) => b.status === 'CONFIRMED' && b.roomId === booking.roomId && b.startAt < booking.endAt && booking.startAt < b.endAt,
    );
    if (overlaps) {
      throw exclusionViolation();
    }
    const record: BookingRecord = {
      id: randomUUID(),
      ...booking,
      roomName: this.roomName(booking.roomId),
      ownerName: this.userName(booking.userId),
      status: 'CONFIRMED',
      cancelledAt: null,
      cancelledById: null,
      cancelledByName: null,
    };
    this.bookings.push(record);
    return { ...record };
  }

  async cancel(ctx: TransactionContext, id: string, cancelledById: string, at: Date): Promise<BookingRecord | null> {
    assertTx(ctx);
    const b = this.bookings.find((x) => x.id === id && x.status === 'CONFIRMED');
    if (!b) {
      return null;
    }
    Object.assign(b, { status: 'CANCELLED', cancelledAt: at, cancelledById, cancelledByName: this.userName(cancelledById) });
    return { ...b };
  }

  async cancelFutureByUser(ctx: TransactionContext, userId: string, cancelledById: string, at: Date): Promise<string[]> {
    assertTx(ctx);
    const future = this.bookings.filter((b) => b.userId === userId && b.status === 'CONFIRMED' && b.startAt > at);
    for (const b of future) {
      Object.assign(b, { status: 'CANCELLED', cancelledAt: at, cancelledById, cancelledByName: this.userName(cancelledById) });
    }
    return future.map((b) => b.id);
  }

  private sorted(list: BookingRecord[]): BookingRecord[] {
    return list
      .map((b) => ({ ...b }))
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime() || a.roomName.localeCompare(b.roomName));
  }
}

function assertTx(ctx: TransactionContext | undefined): void {
  if (!ctx) {
    throw new Error('Operación de reservas fuera de una transacción');
  }
}
