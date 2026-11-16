import { createContext, useContext } from 'react';
import type { ApiError } from '../../shared/apiClient';
import type { User } from './types';

/** Clave de la sesión en la caché de TanStack Query. */
export const ME_QUERY_KEY = ['auth', 'me'] as const;

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Error de `GET /auth/me` que no es un 401 (red o 5xx), para mostrarlo con su `requestId`. */
  error: ApiError | null;
  retry: () => void;
  /** Guarda el usuario devuelto por el login. */
  signIn: (user: User) => void;
  /** `POST /auth/logout`, vacía la caché y vuelve a `/login`. */
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return value;
}
