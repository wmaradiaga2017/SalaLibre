/** Objeto `User` del API (spec §8). */
export type Role = 'EMPLOYEE' | 'ADMIN';

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
