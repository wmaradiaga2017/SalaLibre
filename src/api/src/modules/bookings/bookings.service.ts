import { Inject, Injectable } from '@nestjs/common';
import { BUSINESS_CONFIG, type BusinessConfig } from '../../common/config/business-config';
import { AppError } from '../../common/errors/app-error';
import { CLOCK, type Clock } from '../../common/time/clock';
import { addDays, localDate, startOfLocalDay } from '../../common/time/zoned-time';
import { TRANSACTION_RUNNER, type TransactionRunner } from '../../common/transaction/transaction-runner';
import { RoomsService } from '../rooms/rooms.service';
import { UsersService } from '../users/users.service';
import { toBookingView, type BookingView, type Viewer } from './domain/booking';
import { assertRoomRules, assertTimeRules, bookingDate } from './domain/booking-rules';
import { assertCanCancel } from './domain/booking.policy';
import { BOOKINGS_REPOSITORY, type BookingsRepository } from './domain/bookings.repository';

export interface CreateBookingInput {
  roomId: string;
  startAt: Date;
  endAt: Date;
  title: string;
  attendees: number;
}

/** Claves de `pg_advisory_xact_lock` (spec §11, CLAUDE.md): `date:<AAAA-MM-DD>` y `user:<uuid>`. */
export const lockKeys = {
  date: (date: string) => `date:${date}`,
  user: (userId: string) => `user:${userId}`,
};

/** API pública del módulo de reservas (F-02, F-03, F-04). Otros módulos usan solo este service. */
@Injectable()
export class BookingsService {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(TRANSACTION_RUNNER) private readonly tx: TransactionRunner,
    @Inject(BUSINESS_CONFIG) private readonly config: BusinessConfig,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly rooms: RoomsService,
    private readonly users: UsersService,
  ) {}

  /** `GET /bookings?date=`: reservas `CONFIRMED` del día local `date`, de todas las salas, con RN-17. */
  async listByDate(viewer: Viewer, date: string): Promise<BookingView[]> {
    const from = startOfLocalDay(date, this.config.timeZone);
    const to = startOfLocalDay(addDays(date, 1), this.config.timeZone);
    const list = await this.bookings.listConfirmedStartingBetween(from, to);
    return list.map((b) => toBookingView(b, viewer));
  }

  /** `GET /bookings/mine`: propias con `endAt` ≥ inicio del día local actual, en ambos estados. */
  async listMine(viewer: Viewer): Promise<BookingView[]> {
    const today = localDate(this.clock.now(), this.config.timeZone);
    const list = await this.bookings.listByUserEndingFrom(viewer.id, startOfLocalDay(today, this.config.timeZone));
    return list.map((b) => toBookingView(b, viewer));
  }

  /**
   * F-02. Orden de spec §8 (D-32): sala inexistente (404) → reglas de tiempo → `ROOM_INACTIVE` → `CAPACITY_EXCEEDED`
   * → (en la transacción, con los locks) `DAY_CLOSED` → INSERT, que puede dar 409 `BOOKING_CONFLICT` (RN-01).
   */
  async create(viewer: Viewer, input: CreateBookingInput): Promise<BookingView> {
    const room = await this.rooms.findById(input.roomId);
    if (!room) {
      throw new AppError('NOT_FOUND', 'La sala no existe.');
    }
    assertTimeRules(input, this.clock.now(), this.config);
    assertRoomRules(room, input.attendees);

    const date = bookingDate(input.startAt, this.config);
    const created = await this.tx.run(async (ctx) => {
      // spec §11: lock por fecha (serializa con la creación de cierres) y por usuario (con su desactivación).
      // Siempre en este orden para no generar bloqueos cruzados.
      await ctx.advisoryLock(lockKeys.date(date));
      await ctx.advisoryLock(lockKeys.user(viewer.id));

      // Con el lock tomado: si el usuario se desactivó mientras tanto (RN-14, RN-15), no se crea la reserva.
      const owner = await this.users.findById(viewer.id, ctx); // misma conexión que la transacción (B-74)
      if (!owner || !owner.isActive) {
        throw new AppError('UNAUTHENTICATED', 'Necesitas iniciar sesión.');
      }
      if (await this.bookings.isDateClosed(ctx, date)) {
        throw new AppError('DAY_CLOSED', 'Ese día está cerrado y no admite reservas.');
      }
      const booking = await this.bookings.create(ctx, {
        roomId: input.roomId,
        userId: viewer.id,
        title: input.title,
        attendees: input.attendees,
        startAt: input.startAt,
        endAt: input.endAt,
      });
      // T06a agrega aquí la auditoría BOOKING_CREATED, dentro de la misma transacción.
      return booking;
    });
    return toBookingView(created, viewer);
  }

  /** F-03 y F-04. Orden de spec §8: 404 → 403 (RN-11) → `BOOKING_ALREADY_CANCELLED` → `BOOKING_ALREADY_STARTED`. */
  async cancel(viewer: Viewer, id: string): Promise<BookingView> {
    const booking = await this.bookings.findById(id);
    if (!booking) {
      throw new AppError('NOT_FOUND', 'La reserva no existe.');
    }
    const now = this.clock.now();
    assertCanCancel(viewer, booking, now);

    const cancelled = await this.tx.run(async (ctx) => {
      const result = await this.bookings.cancel(ctx, id, viewer.id, now);
      if (!result) {
        // Otra petición la canceló entre la lectura y el UPDATE.
        throw new AppError('BOOKING_ALREADY_CANCELLED', 'La reserva ya estaba cancelada.');
      }
      // T06a agrega aquí la auditoría BOOKING_CANCELLED, dentro de la misma transacción.
      return result;
    });
    return toBookingView(cancelled, viewer);
  }
}
