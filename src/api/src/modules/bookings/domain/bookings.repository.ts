import type { TransactionContext } from '../../../common/transaction/transaction-runner';
import type { BookingRecord, NewBooking } from './booking';

/**
 * Repositorio de reservas (interfaz). La implementación Prisma vive en `infrastructure/`.
 * RN-01 la garantiza la restricción `bookings_no_overlap` de la base: `create` deja salir su error (`23P01`), que el
 * filtro global traduce a 409 `BOOKING_CONFLICT`.
 */
export interface BookingsRepository {
  findById(id: string): Promise<BookingRecord | null>;
  /** Reservas `CONFIRMED` con `startAt` en `[from, to)`, de todas las salas, ordenadas por `startAt`. */
  listConfirmedStartingBetween(from: Date, to: Date): Promise<BookingRecord[]>;
  /** Reservas del usuario con `endAt >= from`, en ambos estados, ordenadas por `startAt`. */
  listByUserEndingFrom(userId: string, from: Date): Promise<BookingRecord[]>;
  /** RN-10: `true` si la fecha local `AAAA-MM-DD` está en `closures`. Se consulta dentro de la transacción. */
  isDateClosed(ctx: TransactionContext, date: string): Promise<boolean>;
  create(ctx: TransactionContext, booking: NewBooking): Promise<BookingRecord>;
  /**
   * RN-13: cancelar solo cambia `status`, `cancelledAt` y `cancelledById`. Solo afecta a una reserva `CONFIRMED`;
   * devuelve `null` si ya no lo estaba (otra petición la canceló antes).
   */
  cancel(ctx: TransactionContext, id: string, cancelledById: string, at: Date): Promise<BookingRecord | null>;
}

export const BOOKINGS_REPOSITORY = Symbol('BOOKINGS_REPOSITORY');
