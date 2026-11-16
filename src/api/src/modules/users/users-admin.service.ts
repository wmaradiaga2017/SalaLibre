import { Inject, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PinoLogger } from 'nestjs-pino';
import { AppError } from '../../common/errors/app-error';
import { TRANSACTION_RUNNER, type TransactionRunner } from '../../common/transaction/transaction-runner';
import { BookingsService, lockKeys } from '../bookings/bookings.service';
import {
  BCRYPT_ROUNDS,
  isSelfDeactivation,
  type PublicUser,
  type Role,
  type UserChanges,
} from './domain/user';
import { UsersService } from './users.service';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

const NOT_FOUND_MESSAGE = 'El usuario no existe.';

/**
 * F-06 · Gestión de usuarios por el ADMIN (RN-15, RN-18, RN-23, RN-26). Vive en su propio módulo de Nest porque
 * necesita `BookingsService` (cancelación en cascada) y el módulo de reservas ya importa `UsersModule`.
 */
@Injectable()
export class UsersAdminService {
  constructor(
    private readonly users: UsersService,
    private readonly bookings: BookingsService,
    private readonly logger: PinoLogger,
    @Inject(TRANSACTION_RUNNER) private readonly tx: TransactionRunner,
  ) {
    this.logger.setContext(UsersAdminService.name);
  }

  list(): Promise<PublicUser[]> {
    return this.users.findAll();
  }

  /** RN-23: correo en minúsculas y único (409 `EMAIL_TAKEN`). El hash se calcula fuera de la transacción. */
  async create(input: CreateUserInput): Promise<PublicUser> {
    const passwordHash = await hash(input.password, BCRYPT_ROUNDS);
    return this.tx.run(async (ctx) => {
      const created = await this.users.create(ctx, {
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash,
      });
      // T06a agrega aquí la auditoría USER_CREATED, dentro de la misma transacción.
      return created;
    });
  }

  /**
   * Orden de spec §8 (D-32): 404 → 422 `CANNOT_DEACTIVATE_SELF` (RN-26). Con `isActive: false`, en la misma
   * transacción y con el lock `user:<uuid>` tomado, cancela sus reservas futuras (RN-15, D-16); si algo falla, se
   * deshace todo. Reactivar no restaura las reservas canceladas (D-16).
   */
  async update(actorId: string, id: string, changes: UserChanges): Promise<PublicUser> {
    const { user, cancelled } = await this.tx.run(async (ctx) => {
      // Misma clave que la creación de reservas (spec §11): serializa ambas operaciones (R-02).
      await ctx.advisoryLock(lockKeys.user(id));
      if (!(await this.users.findById(id, ctx))) { // misma conexión que la transacción (B-74)
        throw new AppError('NOT_FOUND', NOT_FOUND_MESSAGE);
      }
      if (isSelfDeactivation(actorId, id, changes)) {
        throw new AppError('CANNOT_DEACTIVATE_SELF', 'No puedes desactivar tu propia cuenta.');
      }
      const updated = await this.users.update(ctx, id, changes);
      // T06a agrega aquí la auditoría USER_UPDATED, dentro de la misma transacción.
      const cancelledIds = changes.isActive === false ? await this.bookings.cancelFutureByUser(ctx, id, actorId) : [];
      return { user: updated, cancelled: cancelledIds.length };
    });
    if (changes.isActive === false) {
      this.logger.info({ event: 'user_deactivated', userId: id, cancelledBookings: cancelled }, 'usuario desactivado');
    }
    return user;
  }

  /** F-06 paso 4 (RN-18, D-19): el ADMIN fija una contraseña nueva. 404 si el id no existe. */
  async resetPassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await hash(newPassword, BCRYPT_ROUNDS);
    await this.tx.run(async (ctx) => {
      if (!(await this.users.findById(id, ctx))) {
        throw new AppError('NOT_FOUND', NOT_FOUND_MESSAGE);
      }
      await this.users.updatePasswordHash(ctx, id, passwordHash);
      // T06a agrega aquí la auditoría USER_PASSWORD_RESET, dentro de la misma transacción.
    });
    this.logger.info({ event: 'password_reset', result: 'ok', userId: id }, 'contraseña restablecida');
  }
}
