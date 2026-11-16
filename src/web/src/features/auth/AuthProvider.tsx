import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { setUnauthorizedHandler, toApiError } from '../../shared/apiClient';
import { AuthContext, ME_QUERY_KEY, type AuthContextValue, type AuthStatus } from './auth-context';
import { authService } from './authService';
import type { User } from './types';

/**
 * Sesión de la app (F-01, D-03): pregunta a `GET /auth/me` quién es el usuario y atiende los 401 del `apiClient`.
 * No guarda nada en el navegador: la única fuente de verdad es la cookie `httpOnly`, que el frontend no ve.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const me = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: ({ signal }) => authService.me(signal),
    staleTime: 60_000,
  });

  /** Quita los datos del servidor de la sesión anterior y deja la sesión vacía (sin usuario). */
  const clearSession = useCallback(() => {
    void queryClient.cancelQueries();
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== ME_QUERY_KEY[0] });
    queryClient.setQueryData<User | null>(ME_QUERY_KEY, null);
  }, [queryClient]);

  // CA6 (RN-14, RN-19): cualquier 401 de una petición, por ejemplo con la sesión vencida, lleva a /login.
  useEffect(
    () =>
      setUnauthorizedHandler(() => {
        clearSession();
        navigate('/login', { replace: true });
      }),
    [clearSession, navigate],
  );

  const signIn = useCallback(
    (user: User) => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== ME_QUERY_KEY[0] });
      queryClient.setQueryData<User | null>(ME_QUERY_KEY, user);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Aunque el API no responda, la sesión local se cierra igual; la cookie vence sola (RN-19).
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  }, [clearSession, navigate]);

  const value = useMemo<AuthContextValue>(() => {
    let status: AuthStatus;
    if (me.data) status = 'authenticated';
    else if (me.data === null) status = 'anonymous';
    else if (me.isError) status = 'error';
    else status = 'loading';

    return {
      status,
      user: me.data ?? null,
      error: me.isError && !me.data ? toApiError(me.error) : null,
      retry: () => void me.refetch(),
      signIn,
      signOut,
    };
  }, [me, signIn, signOut]);

  return <AuthContext value={value}>{children}</AuthContext>;
}
