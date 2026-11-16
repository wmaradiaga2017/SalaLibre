import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** 480 px: reserva y confirmaciones; 640 px: formularios de administración (DESIGN.md, Diseño y espaciado). */
  size?: 'sm' | 'md';
  children: ReactNode;
  /** Botones del pie, alineados a la derecha. */
  footer?: ReactNode;
  /** Mientras hay una petición en curso no se cierra con Escape, el velo ni la X. */
  dismissible?: boolean;
}

/**
 * Diálogo modal: se cierra con Escape, atrapa el foco con Tab y Mayús+Tab, y al cerrarse devuelve el foco al elemento
 * que lo abrió. El fondo no se desplaza mientras está abierto.
 */
export function Modal({ open, onClose, title, description, size = 'sm', children, footer, dismissible = true }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  // Último valor de onClose y dismissible sin volver a ejecutar el efecto de apertura.
  const latest = useRef({ onClose, dismissible });
  useEffect(() => {
    latest.current = { onClose, dismissible };
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = panel.current;
    const focusables = () => (node ? [...node.querySelectorAll<HTMLElement>(FOCUSABLE)] : []);
    // Foco inicial: el primer control del contenido (después de la X) o el propio panel.
    const [, ...rest] = focusables();
    (rest[0] ?? node)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (latest.current.dismissible) latest.current.onClose();
        return;
      }
      if (event.key !== 'Tab' || !node) return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === node || !node.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !node.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-margin-compact">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-scrim backdrop-blur-[4px]"
        onClick={() => dismissible && onClose()}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-lg bg-surface-container-lowest shadow-modal',
          size === 'sm' ? 'max-w-modal-sm' : 'max-w-modal-md',
        )}
      >
        <header className="flex items-start justify-between gap-space-md border-b border-divider px-margin py-gutter">
          <div>
            <h2 id={titleId} className="text-headline-sm text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-space-xs text-body-md text-on-surface-variant">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Cerrar"
            className="rounded-base p-space-xs text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className="overflow-y-auto px-margin py-gutter">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-space-sm border-t border-divider px-margin py-gutter">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
