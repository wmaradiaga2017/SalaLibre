import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Avatar, Spinner, cn } from '../ui';

interface UserMenuProps {
  name: string;
  roleLabel: string;
  onSignOut: () => Promise<void>;
}

const ITEM =
  'flex w-full items-center gap-space-sm rounded-base px-space-md py-space-sm text-left text-body-md text-on-surface ' +
  'hover:bg-surface-container-low focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-container ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Menú del usuario (DESIGN.md, «Estructura global»): Mi cuenta y Cerrar sesión. Es un botón que despliega un panel
 * (patrón "disclosure"): se cierra con Escape, al hacer clic fuera o al elegir una opción.
 */
export function UserMenu({ name, roleLabel, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-space-sm rounded-base px-space-sm py-space-xs text-left hover:bg-surface-container-low',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container',
        )}
      >
        <Avatar name={name} size="md" />
        <span className="sr-only sm:not-sr-only sm:flex sm:flex-col">
          <span className="text-label-md text-on-surface">{name}</span>
          <span className="text-label-sm text-on-surface-variant">{roleLabel}</span>
        </span>
        <ChevronDown aria-hidden="true" size={16} className="text-on-surface-variant" />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-20 mt-space-xs w-56 rounded-lg border border-divider bg-surface-container-lowest p-space-xs shadow-modal"
        >
          <div className="border-b border-divider px-space-md py-space-sm sm:hidden">
            <p className="text-label-md text-on-surface">{name}</p>
            <p className="text-label-sm text-on-surface-variant">{roleLabel}</p>
          </div>
          <Link to="/account" className={ITEM} onClick={() => setOpen(false)}>
            <UserRound aria-hidden="true" size={16} />
            Mi cuenta
          </Link>
          <button type="button" className={ITEM} onClick={signOut} disabled={signingOut}>
            {signingOut ? <Spinner size={16} label="Cerrando sesión" /> : <LogOut aria-hidden="true" size={16} />}
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
