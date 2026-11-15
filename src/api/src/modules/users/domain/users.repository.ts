import type { UserWithCredentials } from './user';

/** Repositorio de usuarios (interfaz). La implementación Prisma vive en `infrastructure/`. */
export interface UsersRepository {
  findByEmail(email: string): Promise<UserWithCredentials | null>;
  findById(id: string): Promise<UserWithCredentials | null>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
