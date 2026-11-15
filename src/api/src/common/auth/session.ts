/** Rol de la sesión (coincide con el enum `Role` del spec §7). */
export type SessionRole = 'EMPLOYEE' | 'ADMIN';

/** Usuario autenticado que los guards dejan en `req.user`. Se relee de la base en cada petición (RN-14). */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: SessionRole;
  isActive: boolean;
}

/**
 * Resuelve el usuario de una sesión a partir del token de la cookie.
 * Devuelve `null` si el token es inválido o vencido, o si el usuario no existe o está inactivo.
 * La implementa el módulo de auth; el guard de `common/` solo depende de esta interfaz.
 */
export interface SessionResolver {
  resolve(token: string): Promise<SessionUser | null>;
}

export const SESSION_RESOLVER = Symbol('SESSION_RESOLVER');

/** Cookie de sesión (CLAUDE.md, D-03). */
export const SESSION_COOKIE = 'access_token';
