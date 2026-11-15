import type { TransactionContext } from '../../../common/transaction/transaction-runner';
import type { UserWithCredentials } from './user';

/** Repositorio de usuarios (interfaz). La implementación Prisma vive en `infrastructure/`. */
export interface UsersRepository {
  findByEmail(email: string): Promise<UserWithCredentials | null>;
  findById(id: string): Promise<UserWithCredentials | null>;
  /** Escritura: siempre dentro de `TransactionRunner.run` (CLAUDE.md, escrituras). */
  updatePasswordHash(ctx: TransactionContext, id: string, passwordHash: string): Promise<void>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
