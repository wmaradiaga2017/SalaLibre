import { AppLayout, type NavItem } from '../../shared/layout/AppLayout';
import { useAuth } from './auth-context';
import { ROLE_LABELS } from './types';

/** Navegación de todos (DESIGN.md, «Estructura global»). */
const COMMON_NAV: NavItem[] = [
  { to: '/agenda', label: 'Agenda' },
  { to: '/my-bookings', label: 'Mis reservas' },
];

/** Solo `ADMIN` (RN-21). */
const ADMIN_NAV: NavItem[] = [
  { to: '/admin/rooms', label: 'Salas' },
  { to: '/admin/users', label: 'Usuarios' },
  { to: '/admin/closures', label: 'Cierres' },
  { to: '/admin/audit', label: 'Auditoría' },
];

/** Une la sesión con la estructura global: un `EMPLOYEE` no ve los enlaces de `/admin/*` (spec §9). */
export function SessionLayout() {
  const { user, signOut } = useAuth();
  if (!user) return null; // ProtectedRoute ya garantiza la sesión.

  const navItems = user.role === 'ADMIN' ? [...COMMON_NAV, ...ADMIN_NAV] : COMMON_NAV;
  return <AppLayout navItems={navItems} userName={user.name} roleLabel={ROLE_LABELS[user.role]} onSignOut={signOut} />;
}
