/**
 * Formularios de usuario (T10a CA2, CA3 y CA5): validación del cliente igual a los DTO del API (nombre 1–100 y no solo
 * espacios, correo válido, contraseña ≥ 8 por RN-18, rol de la lista) y el mapa de errores del API a campos. La
 * validación del cliente es comodidad: el API vuelve a validar.
 */
import { z } from 'zod';
import type { ApiError } from '../../shared/apiClient';
import { ROLES, USER_LIMITS, type Role, type User } from './types';
import type { UserChangesInput } from './users-queries';

const name = z
  .string()
  .refine((v) => v.trim().length > 0, { error: 'Escribe el nombre.' })
  .refine((v) => v.length <= USER_LIMITS.nameMax, { error: `Máximo ${USER_LIMITS.nameMax} caracteres.` });

const role = z.enum(ROLES as [Role, ...Role[]], { error: 'Elige un rol.' });

/** RN-18. Se usa en el alta y en el restablecimiento. */
export const password = z
  .string()
  .min(USER_LIMITS.passwordMin, { error: `La contraseña debe tener al menos ${USER_LIMITS.passwordMin} caracteres.` });

export const createUserSchema = z.object({
  name,
  email: z.string().min(1, { error: 'Escribe el correo.' }).pipe(z.email({ error: 'Escribe un correo válido.' })),
  password,
  role,
});

export type CreateUserValues = z.infer<typeof createUserSchema>;

export const EMPTY_USER: CreateUserValues = { name: '', email: '', password: '', role: 'EMPLOYEE' };

/** Edición (CA3): solo nombre y rol. */
export const editUserSchema = z.object({ name, role });

export type EditUserValues = z.infer<typeof editUserSchema>;

/** Solo los campos que cambiaron. Vacío si no cambió nada. */
export function userChanges(user: User, values: EditUserValues): UserChangesInput {
  const changes: UserChangesInput = {};
  if (values.name !== user.name) changes.name = values.name;
  if (values.role !== user.role) changes.role = values.role;
  return changes;
}

export const resetPasswordSchema = z.object({ newPassword: password });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Errores del API que corresponden a un campo del alta; el resto va al banner con su `requestId`. */
const FIELD_ERRORS: Partial<Record<string, keyof CreateUserValues>> = {
  EMAIL_TAKEN: 'email',
};

export function userErrorField(error: ApiError): keyof CreateUserValues | undefined {
  return FIELD_ERRORS[error.code];
}
