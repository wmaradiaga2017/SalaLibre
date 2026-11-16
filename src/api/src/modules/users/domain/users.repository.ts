import type { TransactionContext } from '../../../common/transaction/transaction-runner';
import type { NewUser, PublicUser, UserChanges, UserWithCredentials } from './user';

/**
 * Repositorio de usuarios (interfaz). La implementación Prisma vive en `infrastructure/`.
 * `create` lanza `AppError('EMAIL_TAKEN')` si el correo ya existe (RN-23, lo garantiza el índice único de la base);
 * `update` lanza `AppError('NOT_FOUND')` si el id no existe.
 */
export interface UsersRepository {
  findByEmail(email: string): Promise<UserWithCredentials | null>;
  /**
   * Con `ctx`, la lectura corre dentro de esa transacción (misma conexión). Toda lectura dentro de una transacción
   * debe pasar el `ctx`: si usa otra conexión del pool, muchas transacciones esperando un lock lo agotan (B-74).
   */
  findById(id: string, ctx?: TransactionContext): Promise<UserWithCredentials | null>;
  /** Todos los usuarios, activos e inactivos, ordenados por `name`. */
  findAll(): Promise<PublicUser[]>;
  /** Escrituras: siempre dentro de `TransactionRunner.run` (CLAUDE.md, escrituras). */
  create(ctx: TransactionContext, user: NewUser): Promise<PublicUser>;
  update(ctx: TransactionContext, id: string, changes: UserChanges): Promise<PublicUser>;
  updatePasswordHash(ctx: TransactionContext, id: string, passwordHash: string): Promise<void>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
