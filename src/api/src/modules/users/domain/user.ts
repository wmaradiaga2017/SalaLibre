// Dominio de usuarios: tipos puros, sin dependencias de Nest, Prisma ni HTTP.

export type Role = 'EMPLOYEE' | 'ADMIN';

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

export function toPublicUser(user: PublicUser): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive };
}

/** RN-23: el correo se guarda y se busca en minúsculas. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
