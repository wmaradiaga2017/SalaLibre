import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { BUSINESS_CONFIG, type BusinessConfig } from '../../common/config/business-config';
import { AppError } from '../../common/errors/app-error';
import { CLOCK, type Clock } from '../../common/time/clock';
import { localDate } from '../../common/time/zoned-time';
import { TRANSACTION_RUNNER, type TransactionRunner } from '../../common/transaction/transaction-runner';
import { AuditService } from '../audit/audit.service';
import { BookingsService, lockKeys } from '../bookings/bookings.service';
import { isAfterToday, toClosure, type Closure, type CreatedClosure } from './domain/closure';
import { CLOSURES_REPOSITORY, type ClosuresRepository } from './domain/closures.repository';

const IN_PAST_MESSAGE = 'Solo se puede registrar o eliminar un cierre con fecha posterior a hoy.';
const NOT_FOUND_MESSAGE = 'El cierre no existe.';

/** F-07 · Días cerrados globales (RN-10, RN-16, RN-24, D-23, D-31, S-04, S-05). */
@Injectable()
export class ClosuresService {
  constructor(
    @Inject(CLOSURES_REPOSITORY) private readonly closures: ClosuresRepository,
    @Inject(TRANSACTION_RUNNER) private readonly tx: TransactionRunner,
    @Inject(BUSINESS_CONFIG) private readonly config: BusinessConfig,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly bookings: BookingsService,
    private readonly logger: PinoLogger,
    private readonly audit: AuditService,
  ) {
    this.logger.setContext(ClosuresService.name);
  }

  /** "Hoy" en `BUSINESS_TZ`. */
  private today(): string {
    return localDate(this.clock.now(), this.config.timeZone);
  }

  /** `GET /closures`: cierres con fecha ≥ hoy, ordenados por fecha. */
  async listUpcoming(): Promise<Closure[]> {
    const list = await this.closures.listFrom(this.today());
    return list.map(toClosure);
  }

  /**
   * Orden de spec §8 (D-32): 422 `CLOSURE_IN_PAST` → 409 `CLOSURE_EXISTS`. En una transacción con el lock
   * `date:<AAAA-MM-DD>` (el mismo que toma la creación de reservas, spec §11 y R-01): INSERT y cancelación de las
   * reservas `CONFIRMED` de ese día (RN-16). Si algo falla, se deshace todo.
   */
  async create(actorId: string, date: string, reason: string): Promise<CreatedClosure> {
    if (!isAfterToday(date, this.today())) {
      throw new AppError('CLOSURE_IN_PAST', IN_PAST_MESSAGE);
    }
    const result = await this.tx.run(async (ctx) => {
      await ctx.advisoryLock(lockKeys.date(date));
      const closure = await this.closures.create(ctx, { date, reason, createdById: actorId });
      // RN-16: la cascada audita una fila BOOKING_CANCELLED por reserva (BookingsService).
      const cancelled = await this.bookings.cancelConfirmedByDate(ctx, date, actorId);
      await this.audit.record(ctx, {
        action: 'CLOSURE_CREATED',
        entity: 'closure',
        entityId: closure.id,
        data: { date, reason, cancelledBookings: cancelled.length },
      });
      return { ...toClosure(closure), cancelledBookings: cancelled.length };
    });
    this.logger.info(
      { event: 'closure_created', closureId: result.id, date, cancelledBookings: result.cancelledBookings },
      'cierre registrado',
    );
    return result;
  }

  /**
   * Orden de spec §8 (D-32): 404 → 422 `CLOSURE_IN_PAST` (RN-24, D-31). Borrado físico (S-05); las reservas ya
   * canceladas no se restauran. Toma el lock por fecha para serializarse con la creación de reservas de ese día.
   */
  async delete(id: string): Promise<void> {
    await this.tx.run(async (ctx) => {
      const closure = await this.closures.findById(id, ctx);
      if (!closure) {
        throw new AppError('NOT_FOUND', NOT_FOUND_MESSAGE);
      }
      if (!isAfterToday(closure.date, this.today())) {
        throw new AppError('CLOSURE_IN_PAST', IN_PAST_MESSAGE);
      }
      await ctx.advisoryLock(lockKeys.date(closure.date));
      if (!(await this.closures.delete(ctx, id))) {
        throw new AppError('NOT_FOUND', NOT_FOUND_MESSAGE); // otra petición lo eliminó entre la lectura y el DELETE
      }
      await this.audit.record(ctx, {
        action: 'CLOSURE_DELETED',
        entity: 'closure',
        entityId: id,
        data: { date: closure.date, reason: closure.reason },
      });
    });
  }
}
