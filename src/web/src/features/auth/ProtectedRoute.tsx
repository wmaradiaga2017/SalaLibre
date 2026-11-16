import { Navigate, Outlet } from 'react-router';
import { ErrorState, Spinner } from '../../shared/ui';
import { useAuth } from './auth-context';

/**
 * Rutas que exigen sesión (F-01, spec §9 "Sin sesión"). Sin sesión → `/login`. Es solo experiencia de uso: la API
 * responde 401 igual (CLAUDE.md, Seguridad).
 */
export function ProtectedRoute() {
  const { status, error, retry } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <Spinner label="Comprobando la sesión" size={28} className="text-primary-container" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-gutter">
        <ErrorState
          message={error?.message ?? 'No se pudo comprobar la sesión.'}
          requestId={error?.requestId}
          onRetry={retry}
        />
      </main>
    );
  }

  if (status === 'anonymous') return <Navigate to="/login" replace />;

  return <Outlet />;
}
