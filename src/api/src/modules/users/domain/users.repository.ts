import type { TransactionContext } from '../../../common/transaction/transaction-runner';
import type { UserWithCredentials } from './user';

/** Repositorio de usuarios (interfaz). La implementación Prisma vive en `infrastructure/`. */
export interface UsersRepository {
  findByEmail(email: string): Promise<UserWithCredentials | null>;
  /**
   * Con `ctx`, la lectura corre dentro de esa transacción (misma conexión). Toda lectura dentro de una transacción
   * debe pasar el `ctx`: si usa otra conexión del pool, muchas transacciones esperando un lock lo agotan (B-74).
   */
  findById(id: string, ctx?: TransactionContext): Promise<UserWithCredentials | null>;
  /** Escritura: siempre dentro de `TransactionRunner.run` (CLAUDE.md, escrituras). */
  updatePasswordHash(ctx: TransactionContext, id: string, passwordHash: string): Promise<void>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
