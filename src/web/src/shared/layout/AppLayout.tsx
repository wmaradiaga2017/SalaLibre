import { NavLink, Outlet } from 'react-router';
import { cn } from '../ui';
import { UserMenu } from './UserMenu';

export interface NavItem {
  to: string;
  label: string;
}

interface AppLayoutProps {
  /** Enlaces visibles según el rol (los decide quien conoce la sesión). */
  navItems: NavItem[];
  userName: string;
  roleLabel: string;
  onSignOut: () => Promise<void>;
}

/**
 * Estructura global de las pantallas con sesión (DESIGN.md, «Estructura global»): barra superior con logo,
 * navegación por rol y menú del usuario; debajo, el contenido de la ruta. El login no la usa.
 */
export function AppLayout({ navItems, userName, roleLabel, onSignOut }: AppLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-on-surface">
      <a
        href="#contenido"
        className="sr-only z-30 rounded-base bg-surface-container-lowest px-space-md py-space-sm text-label-md text-primary-container focus:not-sr-only focus:absolute focus:top-space-sm focus:left-space-sm"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-10 border-b border-divider bg-surface-container-lowest">
        <div className="flex h-16 items-center gap-space-md px-gutter md:gap-space-xl md:px-margin">
          <NavLink to="/agenda" className="shrink-0 rounded-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container">
            <img src="/logo-icon.svg" alt="SalaLibre" className="size-8 md:hidden" />
            <img src="/logo.svg" alt="SalaLibre" className="hidden h-8 w-auto md:block" />
          </NavLink>
          <nav aria-label="Principal" className="min-w-0 flex-1 overflow-x-auto">
            <ul className="flex items-center gap-space-xs">
              {navItems.map((item) => (
                <li key={item.to} className="shrink-0">
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-base px-space-md py-space-sm text-label-md whitespace-nowrap transition-colors',
                        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-container',
                        isActive
                          ? 'bg-surface-container-low text-primary-container'
                          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <UserMenu name={userName} roleLabel={roleLabel} onSignOut={onSignOut} />
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className="flex-1 px-gutter py-margin md:px-margin">
        <Outlet />
      </main>
    </div>
  );
}
