import { Navigate } from 'react-router';
import { Spinner } from '../../shared/ui';
import { useAuth } from './auth-context';
import { LoginForm } from './LoginForm';

/**
 * `/login` funcional y sencillo (T07). La composición de dos columnas y los personajes animados llegan en T07c.
 * Con una sesión válida no tiene sentido mostrarlo: se va a la agenda.
 */
export function LoginPage() {
  const { status } = useAuth();

  if (status === 'authenticated') return <Navigate to="/agenda" replace />;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-gutter py-space-xl">
      <div className="w-full max-w-modal-sm rounded-lg border border-divider bg-surface-container-lowest p-margin shadow-elevated sm:p-space-xl">
        <img src="/logo.svg" alt="SalaLibre" className="mb-space-xl h-10 w-auto" />
        <p className="text-label-xs text-primary-container uppercase">Acceso a SalaLibre</p>
        <h1 className="mt-space-xs text-headline-lg text-ink">Bienvenido de nuevo</h1>
        <p className="mt-space-xs mb-space-xl text-body-md text-on-surface-variant">
          Inicia sesión para gestionar tus reservas de salas.
        </p>
        {status === 'loading' ? (
          <div className="flex justify-center py-space-xl">
            <Spinner label="Comprobando la sesión" />
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}
