import { Outlet } from 'react-router';
import { useAuth } from './auth-context';
import { ForbiddenPage } from './ForbiddenPage';
import type { Role } from './types';

/**
 * Rutas de un rol (RN-21: `/admin/*` solo para `ADMIN`). Con otro rol se ve "No tienes permiso para ver esta
 * página" (spec §9). Solo es experiencia de uso: la API responde 403 igual.
 */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  if (user?.role !== role) return <ForbiddenPage />;
  return <Outlet />;
}
