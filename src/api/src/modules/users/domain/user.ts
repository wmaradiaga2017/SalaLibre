// Dominio de usuarios: tipos puros, sin dependencias de Nest, Prisma ni HTTP.

export type Role = 'EMPLOYEE' | 'ADMIN';

export const ROLES: readonly Role[] = ['EMPLOYEE', 'ADMIN'];

/** spec §7 (`users.name`) y RN-18 (contraseña de al menos 8 caracteres). */
export const USER_LIMITS = { nameMax: 100, passwordMin: 8 } as const;

/** Costo de bcryptjs para todo hash nuevo (cambio, alta y reset); el mismo que usa el seed (T03a). */
export const BCRYPT_ROUNDS = 10;

/** Usuario tal como lo expone la API (spec §8, objeto `User`). Nunca incluye el hash. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
}

/** Usuario con credenciales; solo circula entre el repositorio y la autenticación. */
export interface UserWithCredentials extends PublicUser {
  passwordHash: string;
}

/** Alta de un usuario (F-06). El correo ya llega normalizado y la contraseña ya convertida en hash. */
export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}

/** Cambios permitidos por `PATCH /users/:id` (el correo no se edita: RN-23 solo aplica al alta). */
export interface UserChanges {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

export function toPublicUser(user: PublicUser): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive };
}

/** RN-23: el correo se guarda y se busca en minúsculas. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** RN-26 (S-03): un ADMIN no puede desactivarse a sí mismo. */
export function isSelfDeactivation(actorId: string, targetId: string, changes: UserChanges): boolean {
  return changes.isActive === false && actorId === targetId;
}
