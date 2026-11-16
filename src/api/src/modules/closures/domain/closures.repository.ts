import type { TransactionContext } from '../../../common/transaction/transaction-runner';
import type { Closure, NewClosure } from './closure';

/**
 * Repositorio de cierres (interfaz). La implementación Prisma vive en `infrastructure/`.
 * `create` lanza `AppError('CLOSURE_EXISTS')` si la fecha ya está cerrada (RN-24): lo garantiza el índice único
 * `closures_date_key`, no una consulta previa.
 */
export interface ClosuresRepository {
  /** Cierres con `date >= from` (`AAAA-MM-DD`), ordenados por fecha. */
  listFrom(from: string): Promise<Closure[]>;
  /** Con `ctx`, lee dentro de esa transacción (misma conexión, B-74). */
  findById(id: string, ctx?: TransactionContext): Promise<Closure | null>;
  create(ctx: TransactionContext, closure: NewClosure): Promise<Closure>;
  /** Borrado físico (S-05, única excepción de spec §7). Devuelve `false` si el cierre ya no existía. */
  delete(ctx: TransactionContext, id: string): Promise<boolean>;
}

export const CLOSURES_REPOSITORY = Symbol('CLOSURES_REPOSITORY');
