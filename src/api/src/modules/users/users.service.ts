import { Inject, Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../common/transaction/transaction-runner';
import { normalizeEmail, type UserWithCredentials } from './domain/user';
import { USERS_REPOSITORY, type UsersRepository } from './domain/users.repository';

/** API pública del módulo de usuarios para otros módulos. El CRUD de ADMIN llega en T05a. */
@Injectable()
export class UsersService {
  constructor(@Inject(USERS_REPOSITORY) private readonly users: UsersRepository) {}

  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    return this.users.findByEmail(normalizeEmail(email));
  }

  findById(id: string): Promise<UserWithCredentials | null> {
    return this.users.findById(id);
  }

  /** Guarda un hash ya calculado. Se llama dentro de una transacción del módulo que escribe. */
  updatePasswordHash(ctx: TransactionContext, id: string, passwordHash: string): Promise<void> {
    return this.users.updatePasswordHash(ctx, id, passwordHash);
  }
}
