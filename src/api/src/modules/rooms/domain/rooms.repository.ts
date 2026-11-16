import type { TransactionContext } from '../../../common/transaction/transaction-runner';
import type { NewRoom, Room, RoomChanges } from './room';

/**
 * Repositorio de salas (interfaz). La implementación Prisma vive en `infrastructure/`.
 * `create` y `update` lanzan `AppError('ROOM_NAME_TAKEN')` si el nombre ya existe sin distinguir mayúsculas (RN-22).
 */
export interface RoomsRepository {
  /** Salas ordenadas por `name`; con `onlyActive`, solo las de `isActive = true`. */
  list(options: { onlyActive: boolean }): Promise<Room[]>;
  /** Con `ctx`, lee dentro de esa transacción (misma conexión, B-74). */
  findById(id: string, ctx?: TransactionContext): Promise<Room | null>;
  create(ctx: TransactionContext, room: NewRoom): Promise<Room>;
  update(ctx: TransactionContext, id: string, changes: RoomChanges): Promise<Room>;
}

export const ROOMS_REPOSITORY = Symbol('ROOMS_REPOSITORY');
