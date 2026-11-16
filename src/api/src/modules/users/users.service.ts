import { Inject, Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../common/transaction/transaction-runner';
import {
  normalizeEmail,
  type NewUser,
  type PublicUser,
  type UserChanges,
  type UserWithCredentials,
} from './domain/user';
import { USERS_REPOSITORY, type UsersRepository } from './domain/users.repository';

/**
 * API pública del módulo de usuarios para otros módulos (auth, reservas y la administración de T05a).
 * Las escrituras reciben el `ctx` de una transacción abierta por quien llama.
 */
@Injectable()
export class UsersService {
  constructor(@Inject(USERS_REPOSITORY) private readonly users: UsersRepository) {}

  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    return this.users.findByEmail(normalizeEmail(email));
  }

  /** Con `ctx`, lee dentro de esa transacción (obligatorio si se llama desde dentro de una). */
  findById(id: string, ctx?: TransactionContext): Promise<UserWithCredentials | null> {
    return this.users.findById(id, ctx);
  }

  /** Todos los usuarios ordenados por `name`, sin `passwordHash`. */
  findAll(): Promise<PublicUser[]> {
    return this.users.findAll();
  }

  /** RN-23: guarda el correo en minúsculas. Lanza `EMAIL_TAKEN` si ya existe. */
  create(ctx: TransactionContext, user: NewUser): Promise<PublicUser> {
    return this.users.create(ctx, { ...user, email: normalizeEmail(user.email) });
  }

  update(ctx: TransactionContext, id: string, changes: UserChanges): Promise<PublicUser> {
    return this.users.update(ctx, id, changes);
  }

  /** Guarda un hash ya calculado. Se llama dentro de una transacción del módulo que escribe. */
  updatePasswordHash(ctx: TransactionContext, id: string, passwordHash: string): Promise<void> {
    return this.users.updatePasswordHash(ctx, id, passwordHash);
  }
}
