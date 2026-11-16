/** Objeto `User` del API (spec §8) y roles. Auth (sesión) los importa desde aquí. */
export type Role = 'EMPLOYEE' | 'ADMIN';

/** Roles en el orden en que se ofrecen en los formularios. */
export const ROLES: readonly Role[] = ['EMPLOYEE', 'ADMIN'];

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
}

/** Nombre visible de cada rol (DESIGN.md, «Ajustes al llevar los prototipos a SalaLibre»). */
export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: 'Empleado',
  ADMIN: 'Administrador RRHH',
};

/** Límites del API (`USER_LIMITS`, spec §7 y RN-18). */
export const USER_LIMITS = { nameMax: 100, passwordMin: 8 } as const;
