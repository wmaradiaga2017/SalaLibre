import { CalendarOff, CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * `success` y `error`: resultado del servidor en un formulario (p. ej. el 409, con su `requestId`); `maintenance`:
 * día cerrado sobre la agenda (DESIGN.md, Componentes 7); `info`: avisos neutros.
 */
export type BannerTone = 'info' | 'success' | 'error' | 'maintenance';

const TONES: Record<BannerTone, { box: string; icon: ReactNode }> = {
  info: { box: 'border-primary-fixed-dim bg-primary-fixed text-on-primary-fixed-variant', icon: <Info size={18} /> },
  success: {
    box: 'border-available-outline bg-available-container text-on-available-container',
    icon: <CircleCheck size={18} />,
  },
  error: { box: 'border-busy-outline bg-busy-container text-on-busy-container', icon: <CircleAlert size={18} /> },
  maintenance: {
    box: 'border-maintenance-outline bg-maintenance-container text-on-maintenance-container',
    icon: <CalendarOff size={18} />,
  },
};

interface BannerProps {
  tone: BannerTone;
  title?: string;
  children?: ReactNode;
  /** Request ID de un error del API (D-06). */
  requestId?: string;
  className?: string;
}

/** Aviso en línea con icono y texto (el estado no depende solo del color). Los errores se anuncian con `role="alert"`. */
export function Banner({ tone, title, children, requestId, className }: BannerProps) {
  const t = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-space-sm rounded-lg border px-gutter py-space-md text-body-md', t.box, className)}
    >
      <span aria-hidden="true" className="mt-px shrink-0">
        {t.icon}
      </span>
      <div className="flex flex-col gap-space-xs">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div>{children}</div>}
        {requestId && (
          <p className="text-body-sm">
            Código de seguimiento: <code className="text-code-sm">{requestId}</code>
          </p>
        )}
      </div>
    </div>
  );
}
